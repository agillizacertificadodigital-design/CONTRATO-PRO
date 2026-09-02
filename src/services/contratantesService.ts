import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PartesDados } from '../types';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';

const COLLECTION_NAME = 'contratantes';

export async function getContratantes(): Promise<PartesDados[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('nome', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as PartesDados[];
  } catch (err) {
    console.error('Erro ao listar contratantes:', err);
    return [];
  }
}

export async function getContratanteById(id: string): Promise<PartesDados | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as PartesDados;
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar contratante:', err);
    return null;
  }
}

export async function createContratante(data: Omit<PartesDados, 'id'>, uid: string): Promise<string> {
  const docData = sanitizeFirestoreData({
    ...data,
    createdBy: uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
}

export async function updateContratante(id: string, data: Partial<PartesDados>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const payload = sanitizeFirestoreData({
    ...data,
    updatedAt: new Date().toISOString()
  });
  await updateDoc(docRef, payload);
}

export async function deleteContratante(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
