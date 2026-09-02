import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AlertaVencimento, ContratoData } from '../types';

const COLLECTION_NAME = 'alertas';

export async function getAlertas(): Promise<AlertaVencimento[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as AlertaVencimento[];
  } catch (err) {
    console.error('Erro ao listar alertas:', err);
    return [];
  }
}

export async function marcarAlertaLido(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { lido: true });
}

export async function verificarEGerarAlertas(contratos: ContratoData[]): Promise<void> {
  const hoje = new Date();
  const alertasAtuais = await getAlertas();

  for (const c of contratos) {
    if (c.tipoPrazo === 'determinado' && c.dataFim && c.status === 'Ativo') {
      const dataFim = new Date(c.dataFim);
      const diffTime = dataFim.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const marcos = [90, 60, 30, 15, 7, 0];
      for (const marco of marcos) {
        if (diffDays <= marco && diffDays >= marco - 1) {
          const chaveMensagem = `${c.id}_marco_${marco}`;
          const jaExiste = alertasAtuais.some(a => a.contratoId === c.id && a.diasAntecedencia === marco);

          if (!jaExiste) {
            const mensagem = marco === 0
              ? `O contrato nº ${c.numero} (${c.titulo}) VENCE HOJE!`
              : `O contrato nº ${c.numero} (${c.titulo}) vencerá em ${marco} dias (${c.dataFim}).`;

            await addDoc(collection(db, COLLECTION_NAME), {
              contratoId: c.id,
              contratoNumero: c.numero,
              contratoTitulo: c.titulo,
              mensagem,
              dataVencimento: c.dataFim,
              diasAntecedencia: marco,
              lido: false,
              createdBy: 'system',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }
  }
}
