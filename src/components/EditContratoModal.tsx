import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Sliders,
  Eye,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Edit3
} from 'lucide-react';
import { ContratoData, ClausulaModel, StatusContrato, Testemunha } from '../types';
import { updateContrato } from '../services/contratosService';
import { A4DocumentPreview } from './A4DocumentPreview';
import { AIAssistantModal } from './AIAssistantModal';
import { useAuth } from '../context/AuthContext';

interface EditContratoModalProps {
  isOpen: boolean;
  contrato: ContratoData;
  onClose: () => void;
  onSaved: (updated: ContratoData) => void;
}

export const EditContratoModal: React.FC<EditContratoModalProps> = ({
  isOpen,
  contrato,
  onClose,
  onSaved
}) => {
  const { currentUser } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'dados' | 'clausulas' | 'texto' | 'preview'>('clausulas');

  // Form State
  const [titulo, setTitulo] = useState(contrato.titulo || '');
  const [status, setStatus] = useState<StatusContrato>(contrato.status || 'Rascunho');
  const [valor, setValor] = useState<number | string>(contrato.valor || contrato.dadosVariaveis?.valor || '');
  const [formaPagamento, setFormaPagamento] = useState<string>(
    contrato.dadosVariaveis?.formaPagamento || 'PIX'
  );
  const [tipoPrazo, setTipoPrazo] = useState<'determinado' | 'indeterminado'>(
    contrato.tipoPrazo || (contrato.dadosVariaveis?.tipoPrazo?.toLowerCase() === 'determinado' ? 'determinado' : 'indeterminado')
  );
  const [dataInicio, setDataInicio] = useState<string>(
    contrato.dataInicio || contrato.dadosVariaveis?.dataInicio || ''
  );
  const [dataFim, setDataFim] = useState<string>(
    contrato.dataFim || contrato.dadosVariaveis?.dataFim || ''
  );
  const [foroCidade, setForoCidade] = useState<string>(
    contrato.foroCidade || contrato.dadosVariaveis?.foroCidade || ''
  );
  const [foroEstado, setForoEstado] = useState<string>(
    contrato.foroEstado || contrato.dadosVariaveis?.foroEstado || ''
  );

  // Witnesses
  const [testemunhas, setTestemunhas] = useState<Testemunha[]>(() => {
    if (contrato.testemunhas && contrato.testemunhas.length > 0) {
      return contrato.testemunhas;
    }
    return [
      {
        nome: contrato.dadosVariaveis?.testemunha1Nome || '',
        cpf: contrato.dadosVariaveis?.testemunha1Cpf || ''
      },
      {
        nome: contrato.dadosVariaveis?.testemunha2Nome || '',
        cpf: contrato.dadosVariaveis?.testemunha2Cpf || ''
      }
    ];
  });

  // Clauses State
  const [clausulas, setClausulas] = useState<ClausulaModel[]>(() => {
    if (contrato.clausulas && contrato.clausulas.length > 0) {
      return contrato.clausulas;
    }
    // Fallback: If no clauses structured, split from text or single clause
    return [
      {
        id: 'c-1',
        titulo: 'CONTEÚDO DO CONTRATO',
        conteudo: contrato.conteudoFinal || '',
        ordem: 1
      }
    ];
  });

  // Full Text State
  const [conteudoFinal, setConteudoFinal] = useState<string>(contrato.conteudoFinal || '');

  // Audit / Change Reason
  const [motivoAlteracao, setMotivoAlteracao] = useState<string>('Edição de termos do contrato');

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'improve' | 'suggest' | 'review'>('improve');
  const [targetClauseIdx, setTargetClauseIdx] = useState<number | null>(null);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Sync state when input contrato changes
  useEffect(() => {
    if (contrato) {
      setTitulo(contrato.titulo || '');
      setStatus(contrato.status || 'Rascunho');
      setValor(contrato.valor || contrato.dadosVariaveis?.valor || '');
      setFormaPagamento(contrato.dadosVariaveis?.formaPagamento || 'PIX');
      setTipoPrazo(
        contrato.tipoPrazo || (contrato.dadosVariaveis?.tipoPrazo?.toLowerCase() === 'determinado' ? 'determinado' : 'indeterminado')
      );
      setDataInicio(contrato.dataInicio || contrato.dadosVariaveis?.dataInicio || '');
      setDataFim(contrato.dataFim || contrato.dadosVariaveis?.dataFim || '');
      setForoCidade(contrato.foroCidade || contrato.dadosVariaveis?.foroCidade || '');
      setForoEstado(contrato.foroEstado || contrato.dadosVariaveis?.foroEstado || '');
      setConteudoFinal(contrato.conteudoFinal || '');

      if (contrato.clausulas && contrato.clausulas.length > 0) {
        setClausulas(contrato.clausulas);
      } else {
        setClausulas([
          {
            id: 'c-1',
            titulo: 'CONTEÚDO DO CONTRATO',
            conteudo: contrato.conteudoFinal || '',
            ordem: 1
          }
        ]);
      }
    }
  }, [contrato]);

  if (!isOpen) return null;

  // Clause operations
  const handleAddClause = () => {
    const nextOrder = clausulas.length + 1;
    const newClause: ClausulaModel = {
      id: `c-${Date.now()}`,
      titulo: `CLÁUSULA - NOVA CLÁUSULA`,
      conteudo: '',
      ordem: nextOrder
    };
    setClausulas([...clausulas, newClause]);
  };

  const handleRemoveClause = (idx: number) => {
    if (clausulas.length <= 1) {
      alert('O contrato deve conter pelo menos uma cláusula.');
      return;
    }
    const updated = clausulas.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordem: i + 1 }));
    setClausulas(updated);
  };

  const handleMoveClause = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === clausulas.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...clausulas];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Reassign orders
    const reordered = updated.map((c, i) => ({ ...c, ordem: i + 1 }));
    setClausulas(reordered);
  };

  const handleUpdateClause = (idx: number, field: 'titulo' | 'conteudo', val: string) => {
    const updated = [...clausulas];
    updated[idx] = { ...updated[idx], [field]: val };
    setClausulas(updated);
  };

  // Compile full text from clauses
  const handleCompileMinutaFromClauses = () => {
    const headerParts = [];
    headerParts.push(titulo.toUpperCase());
    headerParts.push('');

    // Preâmbulo / Identificação das partes se existir
    if (contrato.contractDataSnapshot) {
      const ctte = contrato.contractDataSnapshot.contratanteSnapshot;
      const ctdo = contrato.contractDataSnapshot.contratadoSnapshot;

      if (ctte && ctdo) {
        headerParts.push('IDENTIFICAÇÃO DAS PARTES');
        headerParts.push('');
        headerParts.push(
          `CONTRATANTE: ${ctte.nome}, ${ctte.tipoPessoa === 'PJ' ? `CNPJ nº ${ctte.cnpj || '---'}` : `CPF nº ${ctte.cpf || '---'}`}, residente/sediado(a) em ${ctte.endereco || ''}, ${ctte.cidade || ''} - ${ctte.estado || ''}.`
        );
        headerParts.push('');
        headerParts.push(
          `CONTRATADO(A): ${ctdo.nome}, ${ctdo.tipoPessoa === 'PJ' ? `CNPJ nº ${ctdo.cnpj || '---'}` : `CPF nº ${ctdo.cpf || '---'}`}, residente/sediado(a) em ${ctdo.endereco || ''}, ${ctdo.cidade || ''} - ${ctdo.estado || ''}.`
        );
        headerParts.push('');
        headerParts.push(
          'As partes acima identificadas têm, entre si, justo e acertado o presente Contrato, mediante as seguintes cláusulas:'
        );
        headerParts.push('');
      }
    }

    const clausesText = clausulas
      .map(c => `${c.titulo.trim()}\n${c.conteudo.trim()}`)
      .join('\n\n');

    let footerParts = '';
    if (foroCidade || foroEstado) {
      footerParts += `\n\nDO FORO\nFica eleito o foro da comarca de ${foroCidade || '---'} - ${foroEstado || '---'} para dirimir eventuais dúvidas oriundas deste contrato.`;
    }

    const compiled = `${headerParts.join('\n')}\n${clausesText}${footerParts}`.trim();
    setConteudoFinal(compiled);
    alert('Minuta textual compilada com sucesso a partir das cláusulas!');
  };

  // Handle Save
  const handleSave = async () => {
    if (!titulo.trim()) {
      setErrorMsg('O título do contrato não pode ficar vazio.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const numValor = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d.,]/g, '').replace(',', '.')) || undefined;

      const updatedPayload: Partial<ContratoData> = {
        titulo: titulo.trim(),
        status,
        valor: numValor,
        tipoPrazo,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        foroCidade: foroCidade.trim() || undefined,
        foroEstado: foroEstado.trim() || undefined,
        testemunhas,
        clausulas,
        conteudoFinal,
        dadosVariaveis: {
          ...(contrato.dadosVariaveis || {}),
          valor: numValor,
          formaPagamento,
          tipoPrazo,
          dataInicio,
          dataFim,
          foroCidade,
          foroEstado,
          testemunha1Nome: testemunhas[0]?.nome || '',
          testemunha1Cpf: testemunhas[0]?.cpf || '',
          testemunha2Nome: testemunhas[1]?.nome || '',
          testemunha2Cpf: testemunhas[1]?.cpf || ''
        }
      };

      await updateContrato(
        contrato.id,
        updatedPayload,
        motivoAlteracao.trim() || 'Edição de contrato',
        currentUser?.uid || 'user'
      );

      setSuccessMsg(true);

      const fullUpdatedContrato: ContratoData = {
        ...contrato,
        ...updatedPayload,
        versaoAtual: (contrato.versaoAtual || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      setTimeout(() => {
        setSaving(false);
        onSaved(fullUpdatedContrato);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Erro ao salvar edição do contrato:', err);
      setErrorMsg(err.message || 'Erro ao atualizar contrato.');
      setSaving(false);
    }
  };

  // Status badge style helper
  const getStatusBadge = (st: StatusContrato) => {
    switch (st) {
      case 'Ativo':
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Aguardando assinatura':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Em revisão':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'Encerrado':
      case 'Cancelado':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
      default:
        return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-200 transition-colors duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {contrato.numero}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Versão {contrato.versaoAtual || 1}.0
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadge(status)}`}>
                  {status}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-1">
                Editar Contrato: {contrato.titulo}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('clausulas')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'clausulas'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Cláusulas Contratuais ({clausulas.length})
          </button>

          <button
            onClick={() => setActiveTab('texto')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'texto'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Minuta Textual Livre
          </button>

          <button
            onClick={() => setActiveTab('dados')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dados'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Dados & Vigência
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Visualizar Impressão A4
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800/80 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: CLAUSULAS */}
          {activeTab === 'clausulas' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Estrutura de Cláusulas Contratuais
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Altere, reordene, adicione novas cláusulas ou use a IA Gemini para aperfeiçoar redação jurídica.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiMode('suggest');
                      setAiModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Sugerir com IA
                  </button>

                  <button
                    type="button"
                    onClick={handleAddClause}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Cláusula
                  </button>

                  <button
                    type="button"
                    onClick={handleCompileMinutaFromClauses}
                    title="Gera a minuta de texto completa a partir dessas cláusulas"
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium flex items-center gap-1.5 hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Atualizar Minuta
                  </button>
                </div>
              </div>

              {/* Clause Cards List */}
              <div className="space-y-3.5">
                {clausulas.map((clause, idx) => (
                  <div
                    key={clause.id || idx}
                    className="p-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={clause.titulo}
                          onChange={e => handleUpdateClause(idx, 'titulo', e.target.value)}
                          placeholder="Ex: CLÁUSULA PRIMEIRA - DO OBJETO"
                          className="w-full font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 uppercase tracking-wide"
                        />
                      </div>

                      {/* Clause Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetClauseIdx(idx);
                            setAiMode('improve');
                            setAiModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Aperfeiçoar cláusula com IA Gemini"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          IA
                        </button>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveClause(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-20 cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === clausulas.length - 1}
                          onClick={() => handleMoveClause(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-20 cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveClause(idx)}
                          className="p-1 text-red-400 hover:text-red-600 rounded cursor-pointer"
                          title="Excluir cláusula"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      value={clause.conteudo}
                      onChange={e => handleUpdateClause(idx, 'conteudo', e.target.value)}
                      placeholder="Conteúdo textual desta cláusula contratual..."
                      className="w-full text-xs p-3 bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TEXTO COMPLETO */}
          {activeTab === 'texto' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Minuta Completa do Contrato
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Edite livremente todo o teor do documento. Qualquer alteração aqui é diretamente refletida na impressão e exportação PDF.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiMode('review');
                      setAiModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Auditar Texto com IA
                  </button>
                </div>
              </div>

              <textarea
                rows={16}
                value={conteudoFinal}
                onChange={e => setConteudoFinal(e.target.value)}
                placeholder="Insira o texto completo do contrato..."
                className="w-full text-xs font-mono p-4 bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700/80 rounded-xl leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* TAB 3: DADOS & VIGÊNCIA */}
          {activeTab === 'dados' && (
            <div className="space-y-4">
              {/* Título e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Título do Contrato
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status do Contrato
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as StatusContrato)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Em revisão">Em revisão</option>
                    <option value="Aguardando assinatura">Aguardando assinatura</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Encerrado">Encerrado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Valores e Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Valor Total do Contrato (R$)
                  </label>
                  <input
                    type="text"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    placeholder="Ex: 5000,00"
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={e => setFormaPagamento(e.target.value)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência / TED">Transferência / TED</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Vigência e Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    Tipo de Prazo
                  </label>
                  <select
                    value={tipoPrazo}
                    onChange={e => setTipoPrazo(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="indeterminado">Prazo Indeterminado</option>
                    <option value="determinado">Prazo Determinado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Término {tipoPrazo === 'determinado' ? '(Obrigatório)' : '(Opcional)'}
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    disabled={tipoPrazo === 'indeterminado'}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Foro / Comarca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Foro / Cidade da Comarca
                  </label>
                  <input
                    type="text"
                    value={foroCidade}
                    onChange={e => setForoCidade(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={foroEstado}
                    onChange={e => setForoEstado(e.target.value.toUpperCase())}
                    placeholder="Ex: SP"
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* Testemunhas */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  Testemunhas Contratuais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Testemunha 1
                    </span>
                    <input
                      type="text"
                      placeholder="Nome Completo"
                      value={testemunhas[0]?.nome || ''}
                      onChange={e => {
                        const copy = [...testemunhas];
                        copy[0] = { ...copy[0], nome: e.target.value };
                        setTestemunhas(copy);
                      }}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="CPF"
                      value={testemunhas[0]?.cpf || ''}
                      onChange={e => {
                        const copy = [...testemunhas];
                        copy[0] = { ...copy[0], cpf: e.target.value };
                        setTestemunhas(copy);
                      }}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Testemunha 2
                    </span>
                    <input
                      type="text"
                      placeholder="Nome Completo"
                      value={testemunhas[1]?.nome || ''}
                      onChange={e => {
                        const copy = [...testemunhas];
                        copy[1] = { ...copy[1], nome: e.target.value };
                        setTestemunhas(copy);
                      }}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="CPF"
                      value={testemunhas[1]?.cpf || ''}
                      onChange={e => {
                        const copy = [...testemunhas];
                        copy[1] = { ...copy[1], cpf: e.target.value };
                        setTestemunhas(copy);
                      }}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PREVIEW A4 */}
          {activeTab === 'preview' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Visualização do documento com a formatação atualizada em tempo real:
              </p>
              <A4DocumentPreview
                contrato={{
                  ...contrato,
                  titulo,
                  conteudoFinal
                }}
              />
            </div>
          )}

          {/* Motivo da Alteração & Auditoria */}
          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 rounded-xl">
            <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200 mb-1">
              Motivo da Alteração (Registrado no Histórico de Versões)
            </label>
            <input
              type="text"
              value={motivoAlteracao}
              onChange={e => setMotivoAlteracao(e.target.value)}
              placeholder="Ex: Ajuste no valor contratual e inclusão de cláusula de sigilo"
              className="w-full text-xs border border-blue-200 dark:border-blue-800 rounded-xl p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {successMsg ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Alterações salvas com sucesso!
              </span>
            ) : (
              <span>Salvamento gera automaticamente uma nova versão auditável.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 border border-emerald-400/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Modal for Clause / Review */}
      {aiModalOpen && (
        <AIAssistantModal
          isOpen={aiModalOpen}
          onClose={() => {
            setAiModalOpen(false);
            setTargetClauseIdx(null);
          }}
          mode={aiMode}
          initialClauseText={
            targetClauseIdx !== null && clausulas[targetClauseIdx]
              ? clausulas[targetClauseIdx].conteudo
              : ''
          }
          contractFullText={conteudoFinal}
          onAcceptImprovement={newText => {
            if (targetClauseIdx !== null) {
              handleUpdateClause(targetClauseIdx, 'conteudo', newText);
            }
            setAiModalOpen(false);
            setTargetClauseIdx(null);
          }}
          onAcceptSuggestedClause={(suggTitle, suggContent) => {
            const newClause: ClausulaModel = {
              id: `c-${Date.now()}`,
              titulo: suggTitle || 'CLÁUSULA ADICIONAL',
              conteudo: suggContent || '',
              ordem: clausulas.length + 1
            };
            setClausulas([...clausulas, newClause]);
            setAiModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
