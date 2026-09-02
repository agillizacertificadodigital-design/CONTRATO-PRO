import React, { useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  UserCheck,
  LayoutTemplate,
  FilePlus,
  ArrowRight,
  Plus,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { getContratos } from '../services/contratosService';
import { getContratantes } from '../services/contratantesService';
import { getContratados } from '../services/contratadosService';
import { getModelos } from '../services/modelosService';
import { getAlertas } from '../services/alertasService';
import { ContratoData, AlertaVencimento } from '../types';

interface DashboardPageProps {
  onNavigate: (page: string, id?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [contratos, setContratos] = useState<ContratoData[]>([]);
  const [contratantesCount, setContratantesCount] = useState(0);
  const [contratadosCount, setContratadosCount] = useState(0);
  const [modelosCount, setModelosCount] = useState(0);
  const [alertas, setAlertas] = useState<AlertaVencimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const [ctrs, cts, cds, mds, alts] = await Promise.all([
        getContratos(),
        getContratantes(),
        getContratados(),
        getModelos(),
        getAlertas()
      ]);
      setContratos(ctrs);
      setContratantesCount(cts.length);
      setContratadosCount(cds.length);
      setModelosCount(mds.length);
      setAlertas(alts);
      setLoading(false);
    };
    loadDashboardData();
  }, []);

  // Stats Calculations
  const totalContratos = contratos.length;
  const ativos = contratos.filter(c => c.status === 'Ativo').length;
  const encerrados = contratos.filter(c => c.status === 'Encerrado').length;
  const emElaboracao = contratos.filter(c => c.status === 'Rascunho' || c.status === 'Em revisão').length;
  const aguardandoAssinatura = contratos.filter(c => c.status === 'Aguardando assinatura').length;

  const hoje = new Date();
  const proximosVencimento = contratos.filter(c => {
    if (c.status === 'Ativo' && c.tipoPrazo === 'Determinado' && c.dataFim) {
      const dFim = new Date(c.dataFim);
      const diffDays = Math.ceil((dFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }
    return false;
  }).length;

  const vencidos = contratos.filter(c => {
    if (c.status === 'Ativo' && c.tipoPrazo === 'Determinado' && c.dataFim) {
      const dFim = new Date(c.dataFim);
      return dFim < hoje;
    }
    return false;
  }).length;

  const contratosRecentes = contratos.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Action */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/40 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-200 dark:text-blue-400 border border-blue-400/30 dark:border-blue-500/20 flex items-center gap-1 backdrop-blur-xs">
              <Sparkles className="w-3 h-3" />
              Gestão Automatizada com IA
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Painel Geral Docfy
          </h2>
          <p className="text-sm text-blue-100 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Crie minutas juridicamente seguras com Inteligência Artificial, controle prazos de vigência e gerencie contratos com agilidade.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigate('gerar-contrato')}
            className="w-full md:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-950/30 transition-all flex items-center justify-center gap-2.5 shrink-0 border border-blue-400/30 hover:scale-[1.02]"
          >
            <FilePlus className="w-4 h-4 text-white" />
            Gerar Novo Contrato
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-xs backdrop-blur-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Contratos</p>
            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalContratos}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Acervo total emitido</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 shadow-xs backdrop-blur-xs hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Ativos</p>
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{ativos}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Em plena vigência</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-amber-500/20 rounded-xl p-4 shadow-xs backdrop-blur-xs hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Em Elaboração</p>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{emElaboracao}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Rascunhos ou revisão</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-blue-500/20 rounded-xl p-4 shadow-xs backdrop-blur-xs hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Aguard. Assinatura</p>
            <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">{aguardandoAssinatura}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Pendentes de firma</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-rose-500/20 rounded-xl p-4 shadow-xs backdrop-blur-xs hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Vencendo / Vencidos</p>
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{vencidos + proximosVencimento}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Atenção requerida</p>
        </div>
      </div>

      {/* Auxiliary Registry Count Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div
          onClick={() => onNavigate('contratantes')}
          className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contratantes Cadastrados</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{contratantesCount}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        <div
          onClick={() => onNavigate('contratados')}
          className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-xl group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contratados Cadastrados</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{contratadosCount}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        <div
          onClick={() => onNavigate('modelos')}
          className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-xl group-hover:scale-105 transition-transform">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Modelos de Contrato</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{modelosCount}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Two Column Layout: Contratos Recentes & Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Contracts Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                Contratos Recentes
              </h3>
            </div>
            <button
              onClick={() => onNavigate('contratos')}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              Ver Todos ({contratos.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500 py-8 text-center">Carregando acervo de contratos...</p>
          ) : contratosRecentes.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/40">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">Nenhum contrato gerado ainda no sistema.</p>
              <button
                onClick={() => onNavigate('gerar-contrato')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-md shadow-blue-900/20"
              >
                <Plus className="w-4 h-4" />
                Criar Primeiro Contrato
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Número</th>
                    <th className="py-2.5 px-3">Título</th>
                    <th className="py-2.5 px-3">Modelo</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {contratosRecentes.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{c.numero}</td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{c.titulo}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{c.modeloNome || 'Padrão'}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'Ativo'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            : c.status === 'Aguardando assinatura'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigate('contratos', c.id)}
                          className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alertas Card (1 Col) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                Alertas & Prazos
              </h3>
            </div>
            <button
              onClick={() => onNavigate('alertas')}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Ver Todos
            </button>
          </div>

          {alertas.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-90" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Nenhum contrato com vencimento pendente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.slice(0, 5).map(a => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    a.diasAntecedencia === 0
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <p className="font-bold flex items-center justify-between">
                    <span>{a.contratoNumero}</span>
                    <span className="text-[10px] opacity-80">Vencimento</span>
                  </p>
                  <p className="mt-1 leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">{a.mensagem}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

