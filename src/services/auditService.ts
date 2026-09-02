import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuditLog } from '../types';

export async function registrarLogAuditoria(
  usuarioId: string,
  usuarioEmail: string,
  acao: string,
  entidade: string,
  entidadeId: string,
  detalhes?: string
): Promise<void> {
  try {
    const log: AuditLog = {
      usuarioId,
      usuarioEmail,
      acao,
      entidade,
      entidadeId,
      detalhes: detalhes || '',
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'auditLogs'), log);
  } catch (err) {
    console.error('Erro ao gravar audit log:', err);
  }
}
