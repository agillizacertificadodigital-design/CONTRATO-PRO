import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AditivoContratual } from '../types';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';

const COLLECTION_NAME = 'aditivos';

export async function getAditivosPorContrato(contratoId: string): Promise<AditivoContratual[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('contratoId', '==', contratoId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as AditivoContratual[];
  } catch (err) {
    console.error('Erro ao buscar aditivos:', err);
    return [];
  }
}

export async function getTodosAditivos(): Promise<AditivoContratual[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as AditivoContratual[];
  } catch (err) {
    console.error('Erro ao buscar todos aditivos:', err);
    return [];
  }
}

export const getAditivos = getTodosAditivos;

export async function createAditivo(
  data: Omit<AditivoContratual, 'id' | 'createdAt' | 'numeroAditivo'>,
  uid: string
): Promise<string> {
  const aditivosExistentes = await getAditivosPorContrato(data.contratoId);
  const seq = aditivosExistentes.length + 1;
  const numeroAditivo = `TERMO ADITIVO Nº 0${seq} AO CONTRATO ${data.contratoNumero}`;

  const docData = sanitizeFirestoreData({
    ...data,
    numeroAditivo,
    createdBy: uid,
    createdAt: new Date().toISOString()
  });

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
}
