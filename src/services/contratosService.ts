import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ContratoData, ContratoVersion, PartesDados, StatusContrato } from '../types';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';

const COLLECTION_NAME = 'contratos';
const VERSIONS_COLLECTION = 'contratoVersions';

export async function getProximoNumeroContrato(): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snap = await getDocs(q);
    const count = snap.size + 1;
    const formattedSeq = String(count).padStart(4, '0');
    return `${formattedSeq}/${currentYear}`;
  } catch (err) {
    const randomSeq = String(Math.floor(Math.random() * 9000) + 1000);
    return `${randomSeq}/${currentYear}`;
  }
}

export async function getContratos(): Promise<ContratoData[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as ContratoData[];
  } catch (err) {
    console.error('Erro ao listar contratos:', err);
    return [];
  }
}

export async function getContratoById(id: string): Promise<ContratoData | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ContratoData;
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar contrato:', err);
    return null;
  }
}

export async function createContrato(
  data: Omit<ContratoData, 'id' | 'numero' | 'createdAt' | 'updatedAt' | 'versaoAtual'>,
  uid: string
): Promise<string> {
  const numero = await getProximoNumeroContrato();
  const docData = sanitizeFirestoreData({
    ...data,
    numero,
    versaoAtual: 1,
    createdBy: uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

  // Initial version record
  const initialVersion = sanitizeFirestoreData({
    contratoId: docRef.id,
    versao: 1,
    conteudoFinal: data.conteudoFinal,
    dadosVariaveis: data.dadosVariaveis,
    contractDataSnapshot: data.contractDataSnapshot,
    motivoAlteracao: 'Criação inicial do contrato',
    createdBy: uid,
    createdAt: new Date().toISOString()
  });
  await addDoc(collection(db, VERSIONS_COLLECTION), initialVersion);

  return docRef.id;
}

export async function updateContrato(
  id: string,
  data: Partial<ContratoData>,
  motivoAlteracao: string = 'Edição de contrato',
  uid: string = 'user'
): Promise<void> {
  const current = await getContratoById(id);
  if (!current) throw new Error('Contrato não encontrado');

  const docRef = doc(db, COLLECTION_NAME, id);

  const hasContentChanged = Boolean(data.conteudoFinal && data.conteudoFinal !== current.conteudoFinal);
  const hasOtherChanges = Boolean(
    (data.titulo && data.titulo !== current.titulo) ||
    (data.status && data.status !== current.status) ||
    (data.valor !== undefined && data.valor !== current.valor) ||
    (data.clausulas && JSON.stringify(data.clausulas) !== JSON.stringify(current.clausulas))
  );

  let nextVersion = current.versaoAtual || 1;
  if (hasContentChanged || hasOtherChanges) {
    nextVersion += 1;
    const versionRecord = sanitizeFirestoreData({
      contratoId: id,
      versao: nextVersion,
      conteudoFinal: data.conteudoFinal || current.conteudoFinal,
      dadosVariaveis: data.dadosVariaveis || current.dadosVariaveis || {},
      contractDataSnapshot: data.contractDataSnapshot || current.contractDataSnapshot || null,
      motivoAlteracao: motivoAlteracao || 'Alteração contratual',
      createdBy: uid,
      createdAt: new Date().toISOString()
    });
    try {
      await addDoc(collection(db, VERSIONS_COLLECTION), versionRecord);
    } catch (verErr) {
      console.warn('Não foi possível gravar registro no histórico de versões:', verErr);
    }
  }

  const updatePayload = sanitizeFirestoreData({
    ...data,
    versaoAtual: nextVersion,
    updatedBy: uid,
    updatedAt: new Date().toISOString()
  });

  await updateDoc(docRef, updatePayload);
}

export async function duplicarContrato(origemId: string, uid: string): Promise<string> {
  const original = await getContratoById(origemId);
  if (!original) throw new Error('Contrato original não encontrado');

  const novoNumero = await getProximoNumeroContrato();
  const duplicado = sanitizeFirestoreData({
    ...original,
    numero: novoNumero,
    titulo: `${original.titulo} (Cópia)`,
    status: 'Rascunho',
    versaoAtual: 1,
    contratoAssinadoUrl: null,
    dataEnvioAssinado: null,
    createdBy: uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(db, COLLECTION_NAME), duplicado);
  return docRef.id;
}

export async function getVersoesContrato(contratoId: string): Promise<ContratoVersion[]> {
  try {
    const q = query(
      collection(db, VERSIONS_COLLECTION),
      where('contratoId', '==', contratoId),
      orderBy('versao', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as ContratoVersion[];
  } catch (err) {
    console.warn('Tentando fallback de consulta de versões sem ordenação composta:', err);
    try {
      const qFallback = query(
        collection(db, VERSIONS_COLLECTION),
        where('contratoId', '==', contratoId)
      );
      const snap = await getDocs(qFallback);
      const items = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as ContratoVersion[];
      return items.sort((a, b) => (b.versao || 0) - (a.versao || 0));
    } catch (fallbackErr) {
      console.error('Erro ao buscar versões do contrato:', fallbackErr);
      return [];
    }
  }
}

export async function updateStatusContrato(id: string, status: StatusContrato, uid: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status,
    updatedBy: uid,
    updatedAt: new Date().toISOString()
  });
}

export async function uploadContratoAssinado(id: string, fileOrUrl: File | string, uid: string = 'user'): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const fileUrl = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  await updateDoc(docRef, {
    contratoAssinadoUrl: fileUrl,
    dataEnvioAssinado: new Date().toISOString(),
    status: 'Ativo',
    updatedBy: uid,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteContrato(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
