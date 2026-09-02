import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, FileText, CheckCircle2 } from 'lucide-react';
import { getAditivos, createAditivo } from '../services/aditivosService';
import { getContratos } from '../services/contratosService';
import { AditivoContrato, ContratoData } from '../types';
import { useAuth } from '../context/AuthContext';

interface AditivosPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const AditivosPage: React.FC<AditivosPageProps> = () => {
  const { currentUser } = useAuth();
  const [aditivos, setAditivos] = useState<AditivoContrato[]>([]);
  const [contratos, setContratos] = useState<ContratoData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [tipo, setTipo] = useState<'Valor' | 'Prazo' | 'Cláusula' | 'Outros'>('Valor');
  const [justificativa, setJustificativa] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [adts, ctrs] = await Promise.all([getAditivos(), getContratos()]);
    setAditivos(adts);
    setContratos(ctrs);
    if (ctrs.length > 0) setSelectedContratoId(ctrs[0].id!);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContratoId || !conteudo) return;

    setSaving(true);
    try {
      const ctr = contratos.find(c => c.id === selectedContratoId);
      await createAditivo(
        {
          contratoId: selectedContratoId,
          contratoNumero: ctr?.numero || '0001/2026',
          objetoAditivo: `Aditivo de ${tipo}`,
          observacoes: justificativa,
          conteudoAditivo: conteudo,
          createdBy: currentUser?.uid || 'user'
        },
        currentUser?.uid || 'user'
      );
      setIsModalOpen(false);
      setJustificativa('');
      setConteudo('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            7. Aditivos Contratuais
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Registre termos aditivos para alteração de valor, vigência ou cláusulas sem perder o contrato original
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Aditivo
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-400 text-center py-8">Carregando aditivos...</p>
      ) : aditivos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-400">
          Nenhum aditivo registrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aditivos.map(a => (
            <div
              key={a.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  Aditivo nº {a.numeroSequencial} ({a.contratoNumero})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {a.tipo}
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{a.justificativa}</p>
              <p className="text-xs text-zinc-500 font-mono bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border">
                {a.alteracoesConteudo}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 pb-2 border-b">Novo Termo Aditivo</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Selecione o Contrato *</label>
                <select
                  value={selectedContratoId}
                  onChange={e => setSelectedContratoId(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                >
                  {contratos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.numero} - {c.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Tipo de Aditivo</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value as any)}
                  className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                >
                  <option value="Valor">Alteração de Valor / Remuneração</option>
                  <option value="Prazo">Prorrogação de Prazo</option>
                  <option value="Cláusula">Modificação de Cláusula</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Justificativa</label>
                <input
                  type="text"
                  placeholder="Ex: Reajuste anual pelo IGPM"
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Conteúdo e Cláusulas Alteradas *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Redação exata do aditivo..."
                  value={conteudo}
                  onChange={e => setConteudo(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Salvar Aditivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
