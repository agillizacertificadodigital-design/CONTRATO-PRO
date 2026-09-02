import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ConfiguracaoSistema } from '../types';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';

const CONFIG_DOC_ID = 'geral';

export const CONFIGURACAO_PADRAO: ConfiguracaoSistema = {
  id: CONFIG_DOC_ID,
  nomeSistema: 'DOCFY',
  dadosEscritorio: {
    nomeEscritorio: 'Docfy Gestão Contratual',
    cnpj: '00.000.000/0001-00',
    telefone: '(11) 99999-9999',
    email: 'contato@docfy.app',
    endereco: 'Av. Paulista, 1000 - São Paulo/SP'
  },
  dadosResponsavel: {
    nome: 'Administrador Responsável',
    cpf: '000.000.000-00',
    profissao: 'Gestor Contratual',
    registroProfissional: 'OAB/SP 000.000'
  },
  configDocumento: {
    exibirCabecalho: true,
    exibirRodape: true,
    cabecalhoTexto: 'DOCFY - GESTÃO INTELIGENTE DE CONTRATOS',
    rodapeTexto: 'Documento gerado eletronicamente pelo Sistema Docfy',
    fonte: 'Arial',
    tamanhoFonte: 12,
    margensMm: { topo: 20, direita: 20, baixo: 20, esquerda: 20 },
    espacamentoLinhas: 1.15,
    alinhamento: 'justificado',
    paginacao: true
  },
  padraoNumeracaoContrato: '{SEQUENCIAL}/{ANO}',
  variaveisPersonalizadas: [
    { chave: 'empresa.nome', label: 'Nome da Empresa', valorPadrao: 'Minha Empresa Ltda' },
    { chave: 'responsavel.nome', label: 'Nome do Responsável', valorPadrao: 'Gestor Geral' }
  ],
  categorias: [
    'Prestação de Serviços',
    'Trabalhista',
    'Empresarial',
    'Locação',
    'Compra e Venda',
    'Parcerias',
    'Confissão de Dívida',
    'Outros'
  ]
};

export async function getConfiguracao(): Promise<ConfiguracaoSistema> {
  try {
    const docRef = doc(db, 'configuracoes', CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ConfiguracaoSistema;
    }
    // Set default if not exists
    await setDoc(docRef, CONFIGURACAO_PADRAO);
    return CONFIGURACAO_PADRAO;
  } catch (err) {
    console.error('Erro ao buscar configuracao:', err);
    return CONFIGURACAO_PADRAO;
  }
}

export async function updateConfiguracao(data: Partial<ConfiguracaoSistema>): Promise<void> {
  const docRef = doc(db, 'configuracoes', CONFIG_DOC_ID);
  const payload = sanitizeFirestoreData({ ...data, updatedAt: new Date().toISOString() });
  await setDoc(docRef, payload, { merge: true });
}

export const getConfiguracoes = getConfiguracao;
export const saveConfiguracoes = updateConfiguracao;
