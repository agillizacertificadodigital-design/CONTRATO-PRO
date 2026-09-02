export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type TipoPessoa = 'PF' | 'PJ';

export interface RepresentanteLegal {
  nome: string;
  cpf: string;
  rg?: string;
  cargo: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
}

export interface PartesDados {
  id?: string;
  tipoPessoa: TipoPessoa;
  // PF
  nome: string;
  cpf?: string;
  rg?: string;
  orgaoExpedidor?: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  // PJ
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  representanteLegal?: RepresentanteLegal;
  // Contatos
  telefone?: string;
  whatsApp?: string;
  email?: string;
  // Endereço
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  // Meta
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClausulaModel {
  id: string;
  titulo: string; // Ex: "CLÁUSULA PRIMEIRA - DO OBJETO"
  conteudo: string; // Pode conter variáveis como {{contratante.nome}}
  ordem: number;
  obrigatoria?: boolean;
  condicaoId?: string; // Se vinculado a regra condicional
}

export type TipoCampo =
  | 'texto'
  | 'texto_longo'
  | 'numero'
  | 'moeda'
  | 'percentual'
  | 'data'
  | 'hora'
  | 'selecao'
  | 'multipla_escolha'
  | 'checkbox'
  | 'sim_nao'
  | 'cpf'
  | 'cnpj'
  | 'endereco';

export interface CampoDinamico {
  id: string;
  chave: string; // Ex: "servicosSeleccionados", "valorDiaria"
  label: string;
  tipo: TipoCampo;
  opcoes?: string[]; // Para seleção ou múltipla escolha
  obrigatorio: boolean;
  valorPadrao?: any;
  ajuda?: string;
}

export interface RegraCondicional {
  id: string;
  nome: string;
  campoChave: string; // Ex: "auxilioTransporte"
  operador: 'igual' | 'diferente' | 'contem' | 'verdadeiro' | 'falso';
  valorEsperado: any; // Ex: "SIM"
  textoInserirSeVerdadeiro: string;
  textoInserirSeFalso?: string;
  clausulasAfetadasIds?: string[];
}

export interface ModeloContrato {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  conteudo: string; // Texto estruturado base ou markdown
  clausulas: ClausulaModel[];
  variaveis: string[]; // Lista de chaves ex: ["contratante.nome", "contrato.valor"]
  camposDinamicos: CampoDinamico[];
  regrasCondicionais: RegraCondicional[];
  isFavorito?: boolean;
  status: 'ativo' | 'inativo' | 'arquivado';
  versao: number;
  arquivoOriginalUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type StatusContrato =
  | 'Rascunho'
  | 'Em revisão'
  | 'Aguardando assinatura'
  | 'Ativo'
  | 'Encerrado'
  | 'Cancelado';

export interface Testemunha {
  nome: string;
  cpf: string;
}

export interface ContratoAnexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho?: number;
  dataUpload: string;
  createdBy: string;
}

export interface ContratoData {
  id: string;
  numero: string; // Ex: "0001/2026"
  titulo: string;
  modeloId: string;
  modeloNome: string;
  contratanteId: string;
  contratadoId: string;
  status: StatusContrato;
  dataInicio?: string;
  dataFim?: string;
  tipoPrazo?: 'determinado' | 'indeterminado';
  valor?: number;
  dadosVariaveis: Record<string, any>;
  clausulas: ClausulaModel[];
  conteudoFinal: string;
  // Snapshot das partes no momento do fechamento
  contractDataSnapshot?: {
    contratanteSnapshot: PartesDados;
    contratadoSnapshot: PartesDados;
    dadosGeraisSnapshot: Record<string, any>;
    dataSnapshot: string;
  };
  versaoAtual: number;
  contratoAssinadoUrl?: string;
  dataEnvioAssinado?: string;
  anexos?: ContratoAnexo[];
  testemunhas?: Testemunha[];
  foroCidade?: string;
  foroEstado?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContratoVersion {
  id: string;
  contratoId: string;
  versao: number;
  conteudoFinal: string;
  dadosVariaveis: Record<string, any>;
  contractDataSnapshot?: any;
  motivoAlteracao?: string;
  createdBy: string;
  createdAt: string;
}

export type AditivoContrato = AditivoContratual;
export type ConfiguracoesSistema = ConfiguracaoSistema;

export interface AditivoContratual {
  id: string;
  numeroAditivo: string; // Ex: "ADITIVO 01 - 0001/2026"
  contratoId: string;
  contratoNumero: string;
  objetoAditivo: string;
  alteracaoValor?: string;
  alteracaoPrazo?: string;
  alteracaoClausulas?: string;
  observacoes?: string;
  conteudoAditivo: string;
  createdBy: string;
  createdAt: string;
}

export interface AlertaVencimento {
  id: string;
  contratoId: string;
  contratoNumero: string;
  contratoTitulo: string;
  mensagem: string;
  dataVencimento: string;
  diasAntecedencia: number;
  lido: boolean;
  createdBy: string;
  createdAt: string;
}

export interface DocumentoConfig {
  logomarcaUrl?: string;
  cabecalhoTexto?: string;
  rodapeTexto?: string;
  exibirCabecalho: boolean;
  exibirRodape: boolean;
  fonte: 'Arial' | 'Times New Roman' | 'Calibri';
  tamanhoFonte: number; // ex: 12
  margensMm: { topo: number; direita: number; baixo: number; esquerda: number };
  espacamentoLinhas: number; // ex: 1.15
  alinhamento: 'justificado' | 'esquerda';
  paginacao: boolean;
}

export interface EscritorioInfo {
  nomeEscritorio: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface ResponsavelInfo {
  nome: string;
  cpf?: string;
  profissao?: string;
  registroProfissional?: string;
}

export interface VariavelPersonalizada {
  chave: string;
  label: string;
  valorPadrao: string;
}

export interface ConfiguracaoSistema {
  id: string;
  nomeSistema: string;
  dadosEscritorio: EscritorioInfo;
  dadosResponsavel: ResponsavelInfo;
  configDocumento: DocumentoConfig;
  padraoNumeracaoContrato: string; // Ex: "{SEQUENCIAL}/{ANO}"
  variaveisPersonalizadas: VariavelPersonalizada[];
  categorias: string[];
  updatedAt?: string;
}

export interface AIHistoryLog {
  id?: string;
  contratoId?: string;
  acao: string;
  promptOriginal: string;
  respostaIA: string;
  statusAprovacao: 'aceito' | 'rejeitado' | 'editado';
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id?: string;
  usuarioId: string;
  usuarioEmail: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhes?: string;
  createdAt: string;
}
