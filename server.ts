import express from 'express';
import path from 'path';
import multer from 'multer';
import mammoth from 'mammoth';
import * as pdfParseModule from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Universal PDF extractor handling class-based PDFParse or functional exports
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const mod: any = pdfParseModule;
    if (mod && mod.PDFParse) {
      const parser = new mod.PDFParse({ data: buffer });
      const res = await parser.getText();
      return res?.text || '';
    }
    if (typeof mod.default === 'function') {
      const res = await mod.default(buffer);
      return res?.text || '';
    }
    if (typeof mod === 'function') {
      const res = await mod(buffer);
      return res?.text || '';
    }
  } catch (err) {
    console.error('[PDF Parse] Erro ao extrair texto do PDF:', err);
    throw err;
  }
  throw new Error('Não foi possível inicializar o leitor de PDF.');
}

const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Helper to get Gemini AI instance safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback chain for basic text/JSON AI tasks, prioritizing current high-availability models
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

async function callGeminiWithRetry(options: {
  contents: string;
  responseMimeType?: string;
  systemInstruction?: string;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: {
            responseMimeType: options.responseMimeType as any,
            systemInstruction: options.systemInstruction,
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errCode = err?.status || err?.code || err?.error?.code;
        const errMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        const isHighDemand =
          errCode === 503 ||
          errCode === 'UNAVAILABLE' ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('spikes in demand') ||
          errMsg.includes('temporarily unavailable');
        const isRateLimit =
          errCode === 429 ||
          errCode === 'RESOURCE_EXHAUSTED' ||
          errMsg.includes('rate limit');

        console.warn(`[Gemini API] Modelo '${model}' (tentativa ${attempt}): ${errMsg}`);

        // If the model is experiencing high demand (503), immediately failover to next model
        if (isHighDemand) {
          break;
        }

        if (isRateLimit && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          break;
        }
      }
    }
  }

  const userFacingError =
    lastError?.error?.message ||
    lastError?.message ||
    'O serviço de IA está temporariamente com alta demanda. Por favor, tente novamente em alguns instantes.';

  throw new Error(userFacingError);
}

// Heuristic fallback parser for uploaded documents (ensures upload succeeds even during AI API outages)
function parseDocumentLocally(rawText: string, originalName: string) {
  const cleanName = (originalName || 'Contrato Importado')
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // 1. Title extraction
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let titulo = cleanName.toUpperCase();
  for (const line of lines.slice(0, 10)) {
    if (
      /^(CONTRATO|INSTRUMENTO PARTICULAR|TERMO DE|ACORDO|ADITIVO)\b/i.test(line) &&
      line.length < 140
    ) {
      titulo = line.toUpperCase();
      break;
    }
  }

  // 2. Category inference
  const lower = rawText.toLowerCase();
  let categoria = 'Prestação de Serviços';
  if (lower.includes('locação') || lower.includes('aluguel') || lower.includes('locador') || lower.includes('locatário')) {
    categoria = 'Locação de Imóveis';
  } else if (lower.includes('trabalho') || lower.includes('empregado') || lower.includes('clt') || lower.includes('salário')) {
    categoria = 'Trabalhista';
  } else if (lower.includes('compra e venda') || lower.includes('vendedor') || lower.includes('comprador')) {
    categoria = 'Compra e Venda';
  } else if (lower.includes('confidencialidade') || lower.includes('sigilo') || lower.includes('nda')) {
    categoria = 'Confidencialidade';
  } else if (lower.includes('parceria') || lower.includes('sociedade') || lower.includes('memorando')) {
    categoria = 'Parceria Comercial';
  }

  // 3. Clause extraction
  const clauseRegex = /(?:^|\n\s*)(CL[AÁ]USULA\s+[A-Z0-9ªº\.\-]+(?:\s*[\:\–\-]\s*[^\n]+)?)/gi;
  const clauseMatches: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = clauseRegex.exec(rawText)) !== null) {
    clauseMatches.push({
      index: m.index,
      title: m[1].trim()
    });
  }

  const clausulas: { titulo: string; conteudo: string }[] = [];

  if (clauseMatches.length > 0) {
    for (let i = 0; i < clauseMatches.length; i++) {
      const current = clauseMatches[i];
      const nextIndex = i < clauseMatches.length - 1 ? clauseMatches[i + 1].index : rawText.length;
      const fullSection = rawText.slice(current.index, nextIndex).trim();

      const firstLineEnd = fullSection.indexOf('\n');
      if (firstLineEnd > -1) {
        const line1 = fullSection.slice(0, firstLineEnd).trim();
        const rest = fullSection.slice(firstLineEnd).trim();
        clausulas.push({
          titulo: line1.toUpperCase(),
          conteudo: rest || fullSection
        });
      } else {
        clausulas.push({
          titulo: current.title.toUpperCase(),
          conteudo: fullSection
        });
      }
    }
  } else {
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    if (paragraphs.length > 0) {
      paragraphs.forEach((p, idx) => {
        clausulas.push({
          titulo: `CLÁUSULA ${idx + 1}ª - DISPOSIÇÕES GERAIS`,
          conteudo: p
        });
      });
    } else {
      clausulas.push({
        titulo: 'CLÁUSULA ÚNICA - DO OBJETO E DISPOSIÇÕES',
        conteudo: rawText
      });
    }
  }

  // 4. Variables Identification
  const variaveisIdentificadas: { chave: string; label: string; exemplo?: string }[] = [];
  const camposDinamicosRecomendados: { chave: string; label: string; tipo: string; obrigatorio: boolean }[] = [];
  let conteudoConvertido = rawText;

  const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
  const cpfs = [...new Set(rawText.match(cpfRegex) || [])];
  if (cpfs[0]) {
    variaveisIdentificadas.push({ chave: 'contratante.cpf', label: 'CPF do Contratante', exemplo: cpfs[0] });
    camposDinamicosRecomendados.push({ chave: 'contratante.cpf', label: 'CPF do Contratante', tipo: 'cpf', obrigatorio: true });
    conteudoConvertido = conteudoConvertido.replaceAll(cpfs[0], '{{contratante.cpf}}');
  }
  if (cpfs[1]) {
    variaveisIdentificadas.push({ chave: 'contratado.cpf', label: 'CPF do Contratado', exemplo: cpfs[1] });
    camposDinamicosRecomendados.push({ chave: 'contratado.cpf', label: 'CPF do Contratado', tipo: 'cpf', obrigatorio: true });
    conteudoConvertido = conteudoConvertido.replaceAll(cpfs[1], '{{contratado.cpf}}');
  }

  const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
  const cnpjs = [...new Set(rawText.match(cnpjRegex) || [])];
  if (cnpjs[0]) {
    variaveisIdentificadas.push({ chave: 'contratante.cnpj', label: 'CNPJ do Contratante', exemplo: cnpjs[0] });
    camposDinamicosRecomendados.push({ chave: 'contratante.cnpj', label: 'CNPJ do Contratante', tipo: 'cnpj', obrigatorio: true });
    conteudoConvertido = conteudoConvertido.replaceAll(cnpjs[0], '{{contratante.cnpj}}');
  }
  if (cnpjs[1]) {
    variaveisIdentificadas.push({ chave: 'contratado.cnpj', label: 'CNPJ do Contratado', exemplo: cnpjs[1] });
    camposDinamicosRecomendados.push({ chave: 'contratado.cnpj', label: 'CNPJ do Contratado', tipo: 'cnpj', obrigatorio: true });
    conteudoConvertido = conteudoConvertido.replaceAll(cnpjs[1], '{{contratado.cnpj}}');
  }

  const valorRegex = /R\$\s*[\d\.\,]+/g;
  const valores = [...new Set(rawText.match(valorRegex) || [])];
  if (valores[0]) {
    variaveisIdentificadas.push({ chave: 'contrato.valor', label: 'Valor do Contrato', exemplo: valores[0] });
    camposDinamicosRecomendados.push({ chave: 'contrato.valor', label: 'Valor do Contrato', tipo: 'moeda', obrigatorio: true });
    conteudoConvertido = conteudoConvertido.replaceAll(valores[0], '{{contrato.valor}}');
  }

  if (!variaveisIdentificadas.some((v) => v.chave === 'contratante.nome')) {
    variaveisIdentificadas.unshift({ chave: 'contratante.nome', label: 'Nome do Contratante' });
    camposDinamicosRecomendados.unshift({ chave: 'contratante.nome', label: 'Nome do Contratante', tipo: 'texto', obrigatorio: true });
  }
  if (!variaveisIdentificadas.some((v) => v.chave === 'contratado.nome')) {
    variaveisIdentificadas.push({ chave: 'contratado.nome', label: 'Nome do Contratado' });
    camposDinamicosRecomendados.push({ chave: 'contratado.nome', label: 'Nome do Contratado', tipo: 'texto', obrigatorio: true });
  }
  if (!variaveisIdentificadas.some((v) => v.chave === 'contrato.dataInicio')) {
    variaveisIdentificadas.push({ chave: 'contrato.dataInicio', label: 'Data de Início' });
    camposDinamicosRecomendados.push({ chave: 'contrato.dataInicio', label: 'Data de Início', tipo: 'data', obrigatorio: false });
  }

  return {
    nomeModelo: titulo,
    categoria,
    descricao: `Modelo estruturado a partir do arquivo ${cleanName}`,
    conteudoConvertido,
    clausulas,
    variaveisIdentificadas,
    camposDinamicosRecomendados
  };
}

// ------------------- API ROUTES -------------------

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Proxy CNPJ lookup server-side to prevent client CORS/network errors
app.get('/api/cnpj/:cnpj', async (req, res) => {
  const cleanCnpj = req.params.cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    return res.status(400).json({ error: 'CNPJ deve conter 14 dígitos.' });
  }

  // Provider 1: BrasilAPI
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: { 'User-Agent': 'ContratoFacil/1.0' }
    });
    if (response.ok) {
      const data: any = await response.json();
      return res.json({
        cnpj: data.cnpj || cleanCnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        logradouro: data.logradouro || (data.descricao_tipo_de_logradouro ? `${data.descricao_tipo_de_logradouro} ${data.logradouro}` : ''),
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        ddd_telefone_1: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
        email: data.email || ''
      });
    }
  } catch (err) {
    console.warn('[CNPJ Proxy] BrasilAPI falhou, tentando fallback MinhaReceita...');
  }

  // Provider 2 Fallback: Minha Receita
  try {
    const response = await fetch(`https://minhareceita.org/${cleanCnpj}`);
    if (response.ok) {
      const data: any = await response.json();
      return res.json({
        cnpj: data.cnpj || cleanCnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        ddd_telefone_1: data.ddd_telefone_1 || data.telefone || '',
        email: data.email || ''
      });
    }
  } catch (err) {
    console.warn('[CNPJ Proxy] MinhaReceita falhou, tentando CNPJ.ws...');
  }

  // Provider 3 Fallback: CNPJ.ws
  try {
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
    if (response.ok) {
      const data: any = await response.json();
      const est = data.estabelecimento || {};
      return res.json({
        cnpj: cleanCnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: est.nome_fantasia || '',
        cep: est.cep || '',
        logradouro: est.logradouro || '',
        numero: est.numero || '',
        complemento: est.complemento || '',
        bairro: est.bairro || '',
        municipio: est.cidade?.nome || '',
        uf: est.estado?.sigla || '',
        ddd_telefone_1: est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : '',
        email: est.email || ''
      });
    }
  } catch (err) {
    console.warn('[CNPJ Proxy] CNPJ.ws falhou.');
  }

  return res.status(404).json({ error: 'CNPJ não localizado nas bases de dados da Receita Federal.' });
});

// Proxy CEP lookup server-side
app.get('/api/cep/:cep', async (req, res) => {
  const cleanCep = req.params.cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return res.status(400).json({ error: 'CEP deve conter 8 dígitos.' });
  }

  // Provider 1: ViaCEP
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (response.ok) {
      const data: any = await response.json();
      if (!data.erro) {
        return res.json(data);
      }
    }
  } catch (err) {
    console.warn('[CEP Proxy] ViaCEP falhou, tentando BrasilAPI...');
  }

  // Provider 2 Fallback: BrasilAPI
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    if (response.ok) {
      const data: any = await response.json();
      return res.json({
        cep: data.cep || cleanCep,
        logradouro: data.street || '',
        complemento: '',
        bairro: data.neighborhood || '',
        localidade: data.city || '',
        uf: data.state || ''
      });
    }
  } catch (err) {
    console.warn('[CEP Proxy] BrasilAPI CEP falhou.');
  }

  return res.status(404).json({ error: 'CEP não encontrado.' });
});

// 1. Improved Clause with Gemini
app.post('/api/ai/improve-clause', async (req, res) => {
  try {
    const { clauseText, option, instructions } = req.body;
    if (!clauseText) {
      return res.status(400).json({ error: 'Texto da cláusula é obrigatório.' });
    }

    const prompt = `Você é um assistente especialista em direito contratual e redação jurídica em português do Brasil.
Sua tarefa é aperfeiçoar a seguinte cláusula contratual segundo o objetivo solicitado: "${option || 'melhorar redação'}".
Instruções adicionais do usuário: ${instructions || 'Nenhuma'}.

REGRAS RÍGIDAS:
- Mantenha o sentido jurídico original, mas aprimore a clareza, coesão e formalidade.
- NÃO invente nomes, CPFs, CNPJs, valores ou datas fictícias.
- Responda estritamente em formato JSON com as chaves "improvedText" e "explanation".

Cláusula atual:
"${clauseText}"`;

    const response = await callGeminiWithRetry({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const resultText = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = { improvedText: resultText, explanation: 'Aperfeiçoamento gerado com sucesso.' };
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('Erro em improve-clause:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao processar requisição com IA.' });
  }
});

// 2. Suggest/Add new clause with Gemini
app.post('/api/ai/suggest-clause', async (req, res) => {
  try {
    const { promptUser, contractContext } = req.body;
    if (!promptUser) {
      return res.status(400).json({ error: 'Descrição da cláusula é obrigatória.' });
    }

    const prompt = `Você é um advogado especialista em elaborar cláusulas contratuais precisas em português do Brasil.
O usuário deseja criar uma nova cláusula para um contrato.
Solicitação do usuário: "${promptUser}"
Contexto do contrato (se houver): "${contractContext || ''}"

REGRAS:
- Crie uma cláusula bem estruturada e juridicamente sólida.
- Se houver partes mutáveis (como prazos, valores), use variáveis entre chaves duplas como {{contrato.prazo}}, {{contratado.nome}}, etc.
- NÃO invente dados pessoais fixos fictícios.
- Responda em JSON com as chaves "titulo" (Ex: "CLÁUSULA - DO SIGILO E CONFIDENCIALIDADE") e "conteudo" (o texto da cláusula).`;

    const response = await callGeminiWithRetry({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const resultText = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = { titulo: 'NOVA CLÁUSULA', conteudo: resultText };
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('Erro em suggest-clause:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao sugerir cláusula com IA.' });
  }
});

// 3. Review Contract with Gemini
app.post('/api/ai/review-contract', async (req, res) => {
  try {
    const { fullText, variablesData } = req.body;
    if (!fullText) {
      return res.status(400).json({ error: 'Conteúdo do contrato é obrigatório.' });
    }

    const prompt = `Você é um revisor jurídico e auditor de contratos.
Análise o contrato a seguir e aponte inconsistências, possíveis ambiguidades, erros ortográficos, cláusulas contraditórias ou variáveis não preenchidas (ex: {{campo_vazio}}).

Lembre-se: Esta análise NÃO substitui parecer jurídico formal.

Contrato para revisão:
"""
${fullText}
"""

Dados preenchidos fornecidos:
${JSON.stringify(variablesData || {})}

Retorne um JSON com o objeto "review" contendo a lista "issues", onde cada item tem:
- "type": "erro" | "alerta" | "sugestao"
- "title": "Título resumido do problema"
- "message": "Descrição detalhada do problema e sugestão de melhoria"
- "clauseRef": "Referência da cláusula (se houver)"`;

    const response = await callGeminiWithRetry({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const resultText = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = { review: { issues: [] } };
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('Erro em review-contract:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao revisar contrato.' });
  }
});

// 4. Parse Imported Word (.docx) or PDF (.pdf) and identify variables/clauses with Gemini
app.post('/api/ai/parse-imported-doc', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const filename = req.file.originalname.toLowerCase();
    let rawText = '';

    if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      rawText = result.value;
    } else if (filename.endsWith('.pdf')) {
      rawText = await extractTextFromPdf(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'Formato inválido. Suportados: .docx, .doc, .pdf' });
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Não foi possível extrair texto legível do arquivo enviado.' });
    }

    // Call Gemini to identify structure, variables and dynamic fields
    const prompt = `Você é um assistente inteligente de processamento de documentos contratuais.
Analise o texto extraído de um contrato importado e estruture-o identificando:
1. Título do modelo e categoria sugerida (ex: "Prestação de Serviços", "Trabalhista", "Locação", etc.)
2. Descrição breve do modelo
3. Cláusulas identificadas (com título e conteúdo)
4. Variáveis identificadas no texto para substituir por tags {{categoria.chave}} (ex: {{contratante.nome}}, {{contratante.cpf}}, {{contratado.nome}}, {{contratado.cpf}}, {{contrato.valor}}, {{contrato.dataInicio}}, {{contrato.foro}}, etc.)
5. Campos dinâmicos recomendados para formulário do usuário

Texto original extraído:
"""
${rawText.slice(0, 15000)}
"""

Retorne estritamente um JSON no seguinte formato:
{
  "nomeModelo": "Nome sugerido do modelo",
  "categoria": "Categoria do contrato",
  "descricao": "Resumo do objeto contratual",
  "conteudoConvertido": "Texto completo com as variáveis marcadas no formato {{categoria.chave}}",
  "clausulas": [
    {
      "titulo": "CLÁUSULA PRIMEIRA - DO OBJETO",
      "conteudo": "Texto da cláusula com {{variáveis}}"
    }
  ],
  "variaveisIdentificadas": [
    { "chave": "contratante.nome", "label": "Nome do Contratante", "exemplo": "João da Silva" }
  ],
  "camposDinamicosRecomendados": [
    {
      "chave": "valorContrato",
      "label": "Valor do Contrato",
      "tipo": "moeda",
      "obrigatorio": true
    }
  ]
}`;

    let parsed: any = null;
    try {
      const response = await callGeminiWithRetry({
        contents: prompt,
        responseMimeType: 'application/json',
      });

      const resultText = response.text || '{}';
      parsed = JSON.parse(resultText);
    } catch (aiErr: any) {
      console.warn('[Doc Parse] IA indisponível ou com pico de demanda, utilizando análise estrutural heurística:', aiErr?.message || aiErr);
      parsed = parseDocumentLocally(rawText, req.file.originalname);
    }

    if (!parsed || !parsed.clausulas || parsed.clausulas.length === 0) {
      parsed = parseDocumentLocally(rawText, req.file.originalname);
    }

    return res.json({
      success: true,
      rawText,
      analysis: parsed
    });

  } catch (err: any) {
    console.error('Erro no parse do documento:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao processar arquivo importado.' });
  }
});

// ------------------- VITE SERVER INTEGRATION -------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CONTRATO FÁCIL] Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
