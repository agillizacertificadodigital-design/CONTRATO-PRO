import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  Copy,
  Layers,
  Upload,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  FileCode,
  Edit2,
  Edit3,
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { getContratos, duplicarContrato, uploadContratoAssinado, getVersoesContrato, deleteContrato, updateStatusContrato } from '../services/contratosService';
import { exportarPDF, exportarDOCX } from '../services/documentExportService';
import { ContratoData, ContratoVersion, StatusContrato } from '../types';
import { A4DocumentPreview } from '../components/A4DocumentPreview';
import { EditContratoModal } from '../components/EditContratoModal';
import { useAuth } from '../context/AuthContext';

interface ContratosPageProps {
  onNavigate?: (page: string, id?: string) => void;
  selectedContractId?: string;
  selectedContratoId?: string;
}

export const ContratosPage: React.FC<ContratosPageProps> = ({ onNavigate, selectedContractId, selectedContratoId }) => {
  const targetContractId = selectedContractId || selectedContratoId;
  const { currentUser } = useAuth();
  const [contratos, setContratos] = useState<ContratoData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Modal State
  const [activeContrato, setActiveContrato] = useState<ContratoData | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'versionHistory' | 'snapshot'>('preview');

  // Edit Contract Modal State
  const [editingContrato, setEditingContrato] = useState<ContratoData | null>(null);

  // Versions History State
  const [versoes, setVersoes] = useState<ContratoVersion[]>([]);
  const [loadingVersoes, setLoadingVersoes] = useState(false);
  const [selectedVersionPreview, setSelectedVersionPreview] = useState<ContratoVersion | null>(null);

  // Upload Signed PDF
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Deletion State
  const [contratoParaExcluir, setContratoParaExcluir] = useState<ContratoData | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Quick Status Update State
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const handleUpdateStatus = async (contratoId: string, newStatus: StatusContrato) => {
    if (!contratoId) return;
    setUpdatingStatusId(contratoId);
    try {
      await updateStatusContrato(contratoId, newStatus, currentUser?.uid || 'user');
      setContratos(prev => prev.map(c => (c.id === contratoId ? { ...c, status: newStatus } : c)));
      if (activeContrato && activeContrato.id === contratoId) {
        setActiveContrato(prev => (prev ? { ...prev, status: newStatus } : null));
      }
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Status do contrato atualizado para "${newStatus}" com sucesso!`
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Erro ao atualizar status do contrato:', err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: err.message || 'Erro ao atualizar status do contrato no banco de dados.'
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const list = await getContratos();
    setContratos(list);

    if (targetContractId) {
      const found = list.find(c => c.id === targetContractId);
      if (found) setActiveContrato(found);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [targetContractId]);

  // Load versions whenever activeContrato changes or versionHistory tab is opened
  useEffect(() => {
    if (activeContrato?.id && activeTab === 'versionHistory') {
      const fetchVersoes = async () => {
        setLoadingVersoes(true);
        const vers = await getVersoesContrato(activeContrato.id);
        setVersoes(vers);
        setLoadingVersoes(false);
      };
      fetchVersoes();
    }
  }, [activeContrato?.id, activeTab]);

  const handleDuplicate = async (id: string) => {
    const newId = await duplicarContrato(id, currentUser?.uid || 'user');
    await loadData();
    onNavigate?.('contratos', newId);
  };

  const handleSavedEdit = (updated: ContratoData) => {
    setContratos(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    if (activeContrato && activeContrato.id === updated.id) {
      setActiveContrato(updated);
    }
    loadData();
  };

  const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      await uploadContratoAssinado(id, file);
      alert('Contrato assinado anexado e status atualizado para Ativo!');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!contratoParaExcluir?.id) return;
    setExcluindo(true);
    try {
      const num = contratoParaExcluir.numero;
      const tit = contratoParaExcluir.titulo;
      await deleteContrato(contratoParaExcluir.id);

      if (activeContrato?.id === contratoParaExcluir.id) {
        setActiveContrato(null);
      }
      if (editingContrato?.id === contratoParaExcluir.id) {
        setEditingContrato(null);
      }

      setContratoParaExcluir(null);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Contrato nº ${num} ("${tit}") foi excluído permanentemente com sucesso.`
      });
      await loadData();

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 5000);
    } catch (err: any) {
      console.error('Erro ao excluir contrato:', err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: err.message || 'Erro ao excluir contrato do banco de dados.'
      });
    } finally {
      setExcluindo(false);
    }
  };

  // Search logic (Number, CPF, CNPJ, Name)
  const filteredContratos = contratos.filter(c => {
    const q = search.toLowerCase();
    const matchQ =
      c.numero.toLowerCase().includes(q) ||
      c.titulo.toLowerCase().includes(q) ||
      c.modeloNome.toLowerCase().includes(q) ||
      (c.contractDataSnapshot?.contratanteSnapshot?.nome.toLowerCase().includes(q)) ||
      (c.contractDataSnapshot?.contratanteSnapshot?.cpf?.includes(q)) ||
      (c.contractDataSnapshot?.contratanteSnapshot?.cnpj?.includes(q)) ||
      (c.contractDataSnapshot?.contratadoSnapshot?.nome.toLowerCase().includes(q)) ||
      (c.contractDataSnapshot?.contratadoSnapshot?.cpf?.includes(q)) ||
      (c.contractDataSnapshot?.contratadoSnapshot?.cnpj?.includes(q));

    const matchStatus = statusFilter === 'TODOS' || c.status === statusFilter;
    return matchQ && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm backdrop-blur-xs transition-colors duration-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            Gerenciamento de Contratos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pesquise por CPF, CNPJ, número ou partes envolvidas. Visualize minutas, versões e snapshots em PDF.
          </p>
        </div>

        <button
          onClick={() => onNavigate?.('gerar-contrato')}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-900/20 flex items-center gap-2 shrink-0 border border-blue-400/30 transition-all"
        >
          <FileText className="w-4 h-4" />
          Gerar Novo Contrato
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por número, nome da parte, CPF ou CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-zinc-700 dark:text-zinc-300 font-medium"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="Rascunho">Rascunho</option>
          <option value="Em revisão">Em revisão</option>
          <option value="Aguardando assinatura">Aguardando assinatura</option>
          <option value="Ativo">Ativo</option>
          <option value="Encerrado">Encerrado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      {/* Contract List Table */}
      {loading ? (
        <p className="text-xs text-zinc-400 text-center py-8">Carregando lista de contratos...</p>
      ) : filteredContratos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-400">
          Nenhum contrato encontrado.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4 font-bold">Número</th>
                  <th className="py-3 px-4 font-bold">Título / Modelo</th>
                  <th className="py-3 px-4 font-bold">Partes Envolvidas</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Data</th>
                  <th className="py-3 px-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                {filteredContratos.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{c.numero}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{c.titulo}</p>
                      <p className="text-[10px] text-zinc-400">{c.modeloNome}</p>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <p><span className="font-semibold text-zinc-500">Ctte:</span> {c.contractDataSnapshot?.contratanteSnapshot?.nome || 'Informatizado'}</p>
                      <p><span className="font-semibold text-zinc-500">Ctdo:</span> {c.contractDataSnapshot?.contratadoSnapshot?.nome || 'Informatizado'}</p>
                    </td>
                    <td className="py-3 px-4">
                      {updatingStatusId === c.id ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 py-1 px-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                          Atualizando...
                        </span>
                      ) : (
                        <select
                          value={c.status}
                          onChange={(e) => handleUpdateStatus(c.id!, e.target.value as StatusContrato)}
                          aria-label={`Alterar status do contrato ${c.numero}`}
                          className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            c.status === 'Ativo'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : c.status === 'Aguardando assinatura'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                              : c.status === 'Em revisão'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                              : c.status === 'Encerrado'
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                              : c.status === 'Cancelado'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                          title="Clique para alterar o status do contrato"
                        >
                          <option value="Rascunho">Rascunho</option>
                          <option value="Em revisão">Em revisão</option>
                          <option value="Aguardando assinatura">Aguardando assinatura</option>
                          <option value="Ativo">Ativo</option>
                          <option value="Encerrado">Encerrado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {c.status !== 'Ativo' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(c.id!, 'Ativo')}
                          disabled={updatingStatusId === c.id}
                          className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md transition-colors cursor-pointer"
                          title="Ativar Contrato Imediatamente"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setActiveContrato(c)}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-md text-zinc-700 dark:text-zinc-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingContrato(c)}
                        className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-md transition-colors cursor-pointer"
                        title="Editar Contrato"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => exportarPDF(c)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md cursor-pointer"
                        title="Exportar PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(c.id!)}
                        className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md cursor-pointer"
                        title="Duplicar Contrato"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNavigate?.('aditivos')}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md cursor-pointer"
                        title="Criar Aditivo"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setContratoParaExcluir(c)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-md cursor-pointer transition-colors"
                        title="Excluir Contrato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTRACT DETAILS & PREVIEW MODAL */}
      {activeContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono">
                    {activeContrato.numero}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-xs font-semibold">Status:</span>
                    <select
                      value={activeContrato.status}
                      disabled={updatingStatusId === activeContrato.id}
                      onChange={(e) => handleUpdateStatus(activeContrato.id!, e.target.value as StatusContrato)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
                        activeContrato.status === 'Ativo'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : activeContrato.status === 'Aguardando assinatura'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          : activeContrato.status === 'Em revisão'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                          : activeContrato.status === 'Encerrado'
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                          : activeContrato.status === 'Cancelado'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      <option value="Rascunho">Rascunho</option>
                      <option value="Em revisão">Em revisão</option>
                      <option value="Aguardando assinatura">Aguardando assinatura</option>
                      <option value="Ativo">Ativo</option>
                      <option value="Encerrado">Encerrado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>

                    {activeContrato.status !== 'Ativo' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeContrato.id!, 'Ativo')}
                        disabled={updatingStatusId === activeContrato.id}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Ativar contrato agora"
                      >
                        {updatingStatusId === activeContrato.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Ativar Agora
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mt-1.5">
                  {activeContrato.titulo}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingContrato(activeContrato)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar Contrato
                </button>
                <button
                  onClick={() => setContratoParaExcluir(activeContrato)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Excluir este contrato permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Contrato
                </button>
                <button onClick={() => setActiveContrato(null)} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('preview')}
                className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                Documento A4
              </button>
              <button
                onClick={() => setActiveTab('snapshot')}
                className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'snapshot'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                Dados Estáticos (Snapshot Imutável)
              </button>
              <button
                onClick={() => setActiveTab('versionHistory')}
                className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'versionHistory'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                Histórico de Versões
              </button>
            </div>

            {/* Tab 1: Preview A4 */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => setEditingContrato(activeContrato)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar Minuta
                  </button>
                  <button
                    onClick={() => exportarPDF(activeContrato)}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => exportarDOCX(activeContrato)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> DOCX
                  </button>

                  <label className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    Anexar PDF Assinado
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => handleUploadSigned(e, activeContrato.id!)}
                      className="hidden"
                    />
                  </label>
                </div>

                <A4DocumentPreview contrato={activeContrato} />
              </div>
            )}

            {/* Tab 2: Snapshot View (Items 30, 31) */}
            {activeTab === 'snapshot' && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3 text-xs">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  Garantia de Integridade Jurídica (Snapshot de Cadastro)
                </p>
                <p className="text-zinc-500">
                  Mesmo se o cadastro do contratante ou contratado for alterado no futuro, estes dados registrados no momento do contrato permanecem inalterados.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                  <div className="p-3 bg-white dark:bg-zinc-800 border rounded-lg">
                    <p className="font-bold text-indigo-600">Contratante Snapshot</p>
                    <p>{activeContrato.contractDataSnapshot?.contratanteSnapshot?.nome}</p>
                    <p>{activeContrato.contractDataSnapshot?.contratanteSnapshot?.cpf || activeContrato.contractDataSnapshot?.contratanteSnapshot?.cnpj}</p>
                    <p>{activeContrato.contractDataSnapshot?.contratanteSnapshot?.endereco}</p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-800 border rounded-lg">
                    <p className="font-bold text-indigo-600">Contratado Snapshot</p>
                    <p>{activeContrato.contractDataSnapshot?.contratadoSnapshot?.nome}</p>
                    <p>{activeContrato.contractDataSnapshot?.contratadoSnapshot?.cpf || activeContrato.contractDataSnapshot?.contratadoSnapshot?.cnpj}</p>
                    <p>{activeContrato.contractDataSnapshot?.contratadoSnapshot?.endereco}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Versions */}
            {activeTab === 'versionHistory' && (
              <div className="space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">
                      Histórico de Versões e Auditoria de Minutas
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Cada edição registra snapshot auditável com data, autor e motivo da alteração.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingContrato(activeContrato)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer self-start sm:self-auto"
                  >
                    <Edit3 className="w-3 h-3" /> Criar Nova Versão (Editar)
                  </button>
                </div>

                {loadingVersoes ? (
                  <div className="text-center py-6 text-zinc-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    Carregando versões do contrato...
                  </div>
                ) : versoes.length === 0 ? (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold">Versão {activeContrato.versaoAtual || 1}.0 (Atual)</p>
                      <p className="text-[11px] text-zinc-400">Criado em {new Date(activeContrato.createdAt).toLocaleString('pt-BR')}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Criação inicial do contrato</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded text-[10px]">
                      Ativa
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {versoes.map((v, i) => (
                      <div
                        key={v.id || i}
                        className={`p-3.5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          v.versao === (activeContrato.versaoAtual || 1)
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              Versão {v.versao}.0
                            </span>
                            {v.versao === (activeContrato.versaoAtual || 1) ? (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded text-[10px]">
                                Versão Atual
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium rounded text-[10px]">
                                Histórica
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Gravado em {new Date(v.createdAt).toLocaleString('pt-BR')} • {v.motivoAlteracao || 'Edição de contrato'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedVersionPreview(selectedVersionPreview?.id === v.id ? null : v)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            {selectedVersionPreview?.id === v.id ? 'Ocultar Minuta' : 'Ver Minuta'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Version Preview Section */}
                {selectedVersionPreview && (
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl space-y-2 mt-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                        Minuta da Versão {selectedVersionPreview.versao}.0 ({selectedVersionPreview.motivoAlteracao})
                      </span>
                      <button
                        onClick={() => setSelectedVersionPreview(null)}
                        className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={8}
                      value={selectedVersionPreview.conteudoFinal}
                      className="w-full font-mono text-[11px] bg-white dark:bg-zinc-900 border rounded-lg p-3 text-zinc-800 dark:text-zinc-200 leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT CONTRATO MODAL */}
      {editingContrato && (
        <EditContratoModal
          isOpen={Boolean(editingContrato)}
          contrato={editingContrato}
          onClose={() => setEditingContrato(null)}
          onSaved={handleSavedEdit}
          onDeleted={(deletedId) => {
            if (activeContrato?.id === deletedId) {
              setActiveContrato(null);
            }
            setEditingContrato(null);
            setFeedbackMsg({
              tipo: 'sucesso',
              texto: 'Contrato excluído permanentemente com sucesso.'
            });
            loadData();
          }}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTRATO */}
      {contratoParaExcluir && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs text-zinc-800 dark:text-zinc-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                  Excluir Contrato Finalizado?
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                  Esta ação é irreversível. O contrato, suas minutas e todo o histórico de versões auditáveis serão permanentemente excluídos do banco de dados.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Número do Contrato:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{contratoParaExcluir.numero}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Título:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]" title={contratoParaExcluir.titulo}>
                  {contratoParaExcluir.titulo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Status Atual:</span>
                <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                  {contratoParaExcluir.status}
                </span>
              </div>
              {contratoParaExcluir.contractDataSnapshot?.contratanteSnapshot?.nome && (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-zinc-400 font-medium">Contratante:</span>
                  <span className="truncate max-w-[220px] font-medium">{contratoParaExcluir.contractDataSnapshot.contratanteSnapshot.nome}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => setContratoParaExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {excluindo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Sim, Excluir Contrato
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
