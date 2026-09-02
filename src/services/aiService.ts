export interface ImproveClauseParams {
  clauseText: string;
  option: 'melhorar redação' | 'deixar mais formal' | 'deixar mais simples' | 'corrigir português' | 'tornar mais objetiva' | 'detalhar cláusula' | 'resumir cláusula' | 'sugerir alternativa';
  instructions?: string;
}

export interface ImproveClauseResult {
  improvedText: string;
  explanation?: string;
}

export interface SuggestClauseParams {
  promptUser: string;
  contractContext?: string;
}

export interface SuggestClauseResult {
  titulo: string;
  conteudo: string;
}

export interface ReviewContractResult {
  review: {
    issues: Array<{
      type: 'erro' | 'alerta' | 'sugestao';
      title: string;
      message: string;
      clauseRef?: string;
    }>;
  };
}

export interface ParseDocResult {
  success: boolean;
  rawText: string;
  analysis: {
    nomeModelo: string;
    categoria: string;
    descricao: string;
    conteudoConvertido: string;
    clausulas: Array<{ titulo: string; conteudo: string }>;
    variaveisIdentificadas: Array<{ chave: string; label: string; exemplo?: string }>;
    camposDinamicosRecomendados: Array<{
      chave: string;
      label: string;
      tipo: string;
      obrigatorio: boolean;
    }>;
  };
}

export async function aperfeicoarClausulaComIA(params: ImproveClauseParams): Promise<ImproveClauseResult> {
  const res = await fetch('/api/ai/improve-clause', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao aperfeiçoar cláusula com IA.');
  }
  return res.json();
}

export async function sugerirClausulaComIA(params: SuggestClauseParams): Promise<SuggestClauseResult> {
  const res = await fetch('/api/ai/suggest-clause', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao sugerir cláusula com IA.');
  }
  return res.json();
}

export async function revisarContratoComIA(fullText: string, variablesData?: Record<string, any>): Promise<ReviewContractResult> {
  const res = await fetch('/api/ai/review-contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullText, variablesData }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao revisar contrato com IA.');
  }
  return res.json();
}

export async function importarEAnalisarDocumento(file: File): Promise<ParseDocResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/ai/parse-imported-doc', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao processar arquivo com IA.');
  }
  return res.json();
}
