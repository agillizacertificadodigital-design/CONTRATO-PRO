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
  Edit2
} from 'lucide-react';
import { getContratos, duplicarContrato, uploadContratoAssinado } from '../services/contratosService';
import { exportarPDF, exportarDOCX } from '../services/documentExportService';
import { ContratoData } from '../types';
import { A4DocumentPreview } from '../components/A4DocumentPreview';
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

  // Upload Signed PDF
  const [uploadingPdf, setUploadingPdf] = useState(false);

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

  const handleDuplicate = async (id: string) => {
    const newId = await duplicarContrato(id, currentUser?.uid || 'user');
    await loadData();
    onNavigate?.('contratos', newId);
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Ativo'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : c.status === 'Aguardando assinatura'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => setActiveContrato(c)}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-md text-zinc-700 dark:text-zinc-300 font-medium inline-flex items-center gap-1"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => exportarPDF(c)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
                        title="Exportar PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(c.id!)}
                        className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md"
                        title="Duplicar Contrato"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNavigate?.('aditivos')}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md"
                        title="Criar Aditivo"
                      >
                        <Layers className="w-3.5 h-3.5" />
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
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {activeContrato.numero}
                </span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mt-1">
                  {activeContrato.titulo}
                </h3>
              </div>
              <button onClick={() => setActiveContrato(null)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('preview')}
                className={`pb-2 px-3 border-b-2 transition-all ${
                  activeTab === 'preview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                Documento A4
              </button>
              <button
                onClick={() => setActiveTab('snapshot')}
                className={`pb-2 px-3 border-b-2 transition-all ${
                  activeTab === 'snapshot'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                Dados Estáticos (Snapshot Imutável)
              </button>
              <button
                onClick={() => setActiveTab('versionHistory')}
                className={`pb-2 px-3 border-b-2 transition-all ${
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
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => exportarPDF(activeContrato)}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => exportarDOCX(activeContrato)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
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
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  Histórico de Versões e Minutas Registradas
                </p>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold">Versão 1.0 (Atual)</p>
                    <p className="text-[11px] text-zinc-400">Criado em {new Date(activeContrato.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">Ativa</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
