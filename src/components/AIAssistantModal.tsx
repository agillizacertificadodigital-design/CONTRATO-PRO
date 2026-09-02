import React, { useState } from 'react';
import { Sparkles, Check, X, Edit3, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { aperfeicoarClausulaComIA, sugerirClausulaComIA, revisarContratoComIA, ReviewContractResult } from '../services/aiService';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'improve' | 'suggest' | 'review';
  initialClauseText?: string;
  contractFullText?: string;
  variablesData?: Record<string, any>;
  onAcceptImprovement?: (newText: string) => void;
  onAcceptSuggestedClause?: (titulo: string, conteudo: string) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialClauseText = '',
  contractFullText = '',
  variablesData = {},
  onAcceptImprovement,
  onAcceptSuggestedClause
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Improve Mode State
  const [improveOption, setImproveOption] = useState<'melhorar redação' | 'deixar mais formal' | 'deixar mais simples' | 'corrigir português' | 'tornar mais objetiva' | 'detalhar cláusula' | 'resumir cláusula' | 'sugerir alternativa'>('melhorar redação');
  const [customInstructions, setCustomInstructions] = useState('');
  const [aiSuggestedText, setAiSuggestedText] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false);

  // Suggest Mode State
  const [clausePrompt, setClausePrompt] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedContent, setSuggestedContent] = useState('');

  // Review Mode State
  const [reviewResult, setReviewResult] = useState<ReviewContractResult | null>(null);

  const handleRunImprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aperfeicoarClausulaComIA({
        clauseText: initialClauseText,
        option: improveOption,
        instructions: customInstructions
      });
      setAiSuggestedText(res.improvedText);
      setAiExplanation(res.explanation || 'Aperfeiçoamento concluído com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao aperfeiçoar cláusula.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSuggest = async () => {
    if (!clausePrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sugerirClausulaComIA({
        promptUser: clausePrompt,
        contractContext: contractFullText.slice(0, 2000)
      });
      setSuggestedTitle(res.titulo || 'NOVA CLÁUSULA');
      setSuggestedContent(res.conteudo || '');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar cláusula com IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await revisarContratoComIA(contractFullText, variablesData);
      setReviewResult(res);
    } catch (err: any) {
      setError(err.message || 'Erro ao revisar contrato.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 p-5 my-8 text-xs text-slate-700 dark:text-slate-300 transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                {mode === 'improve' && 'Aperfeiçoar Cláusula com IA Gemini'}
                {mode === 'suggest' && 'Criar Nova Cláusula com IA Gemini'}
                {mode === 'review' && 'Revisar Contrato com IA Gemini'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Assistente inteligente de redação jurídica e conformidade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3.5 p-2.5 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: IMPROVE CLAUSE */}
        {mode === 'improve' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Objetivo do Aperfeiçoamento
                </label>
                <select
                  value={improveOption}
                  onChange={(e: any) => setImproveOption(e.target.value)}
                  className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  <option value="melhorar redação">Melhorar Redação</option>
                  <option value="deixar mais formal">Deixar Mais Formal</option>
                  <option value="deixar mais simples">Deixar Mais Simples</option>
                  <option value="corrigir português">Corrigir Gramática e Ortografia</option>
                  <option value="tornar mais objetiva">Tornar Mais Objetiva</option>
                  <option value="detalhar cláusula">Detalhar Cláusula</option>
                  <option value="resumir cláusula">Resumir Cláusula</option>
                  <option value="sugerir alternativa">Sugerir Alternativa Jurídica</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instruções Específicas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: enfatizar confidencialidade..."
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>

            {!aiSuggestedText && (
              <button
                onClick={handleRunImprove}
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-blue-400/30 transition-colors disabled:opacity-50 shadow-md shadow-blue-900/10"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analisar e Aperfeiçoar com IA
              </button>
            )}

            {/* Side-by-Side Comparison */}
            {aiSuggestedText && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* TEXTO ATUAL */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Texto Atual
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {initialClauseText}
                    </p>
                  </div>

                  {/* SUGESTÃO DA IA */}
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                        Sugestão da IA
                      </span>
                      <button
                        onClick={() => setIsEditingSuggestion(!isEditingSuggestion)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline font-bold"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditingSuggestion ? 'Concluir Edição' : 'Editar Sugestão'}
                      </button>
                    </div>

                    {isEditingSuggestion ? (
                      <textarea
                        rows={6}
                        value={aiSuggestedText}
                        onChange={e => setAiSuggestedText(e.target.value)}
                        className="w-full text-xs border border-blue-300 dark:border-blue-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {aiSuggestedText}
                      </p>
                    )}
                  </div>
                </div>

                {aiExplanation && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    * {aiExplanation}
                  </p>
                )}

                {/* Actions: Aceitar / Rejeitar / Refazer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setAiSuggestedText(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
                  >
                    Tentar Novamente
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => {
                      if (onAcceptImprovement && aiSuggestedText) {
                        onAcceptImprovement(aiSuggestedText);
                        onClose();
                      }
                    }}
                    className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aceitar Sugestão
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: SUGGEST CLAUSE */}
        {mode === 'suggest' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descreva o que deseja incluir no contrato
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Quero uma cláusula determinando que o contratado mantenha sigilo absoluto sobre documentos e fotos da residência..."
                value={clausePrompt}
                onChange={e => setClausePrompt(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {!suggestedContent && (
              <button
                onClick={handleRunSuggest}
                disabled={loading || !clausePrompt.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-blue-400/30 transition-colors disabled:opacity-50 shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar Cláusula com IA
              </button>
            )}

            {suggestedContent && (
              <div className="space-y-2.5 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                  Sugestão Gerada
                </span>
                <input
                  type="text"
                  value={suggestedTitle}
                  onChange={e => setSuggestedTitle(e.target.value)}
                  className="w-full text-xs font-bold border border-blue-300 dark:border-blue-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <textarea
                  rows={5}
                  value={suggestedContent}
                  onChange={e => setSuggestedContent(e.target.value)}
                  className="w-full text-xs border border-blue-300 dark:border-blue-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setSuggestedContent('')}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (onAcceptSuggestedClause && suggestedContent) {
                        onAcceptSuggestedClause(suggestedTitle, suggestedContent);
                        onClose();
                      }
                    }}
                    className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Inserir no Contrato
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: REVIEW CONTRACT */}
        {mode === 'review' && (
          <div className="space-y-3.5">
            {!reviewResult && (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  A IA irá analisar o texto completo do contrato em busca de inconsistências, ambiguidade e pendências.
                </p>
                <button
                  onClick={handleRunReview}
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 border border-blue-400/30 shadow-md"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Iniciar Auditoria com IA
                </button>
              </div>
            )}

            {reviewResult && (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-2">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ <strong>Aviso Legal:</strong> A revisão por Inteligência Artificial é um recurso auxiliar e não substitui a análise jurídica profissional realizada por um advogado.
                </div>

                {reviewResult.review?.issues?.length === 0 ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs text-center font-medium">
                    ✅ Nenhuma inconsistência grave encontrada pela IA no contrato!
                  </div>
                ) : (
                  reviewResult.review?.issues?.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        issue.type === 'erro'
                          ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300'
                          : issue.type === 'alerta'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300'
                          : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          {issue.type === 'erro' ? '❌ Erro / Inconsistência' : issue.type === 'alerta' ? '⚠️ Alerta' : '💡 Sugestão'}: {issue.title}
                        </span>
                        {issue.clauseRef && (
                          <span className="text-[9px] uppercase px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                            {issue.clauseRef}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed text-slate-700 dark:text-slate-300">{issue.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
