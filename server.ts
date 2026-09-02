import express from 'express';
import path from 'path';
import multer from 'multer';
import mammoth from 'mammoth';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

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

// Fallback chain for basic text/JSON AI tasks
const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

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
        const errMsg = err?.message || JSON.stringify(err);
        const isTransient =
          errCode === 503 ||
          errCode === 429 ||
          errCode === 500 ||
          errCode === 'UNAVAILABLE' ||
          errCode === 'RESOURCE_EXHAUSTED' ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('temporarily unavailable') ||
          errMsg.includes('spikes in demand') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('fetch failed');

        console.warn(`[Gemini API] Tentativa ${attempt} no modelo '${model}' falhou: ${errMsg}. Transitório: ${isTransient}`);

        if (isTransient) {
          const delayMs = attempt * 800 + Math.floor(Math.random() * 400);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // If error is not transient (e.g. invalid request), break to next model
          break;
        }
      }
    }
  }

  throw lastError || new Error('O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente em instantes.');
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
      const pdfData = await pdfParse(req.file.buffer);
      rawText = pdfData.text;
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

    const response = await callGeminiWithRetry({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const resultText = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = {
        nomeModelo: req.file.originalname,
        categoria: 'Geral',
        descricao: 'Modelo importado de ' + req.file.originalname,
        conteudoConvertido: rawText,
        clausulas: [{ titulo: 'CONTEÚDO DO CONTRATO', conteudo: rawText }],
        variaveisIdentificadas: [],
        camposDinamicosRecomendados: []
      };
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
