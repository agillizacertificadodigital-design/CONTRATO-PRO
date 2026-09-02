import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getAlertas, marcarAlertaLido } from '../services/alertasService';
import { AlertaVencimento } from '../types';

interface AlertasPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const AlertasPage: React.FC<AlertasPageProps> = ({ onNavigate }) => {
  const [alertas, setAlertas] = useState<AlertaVencimento[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const list = await getAlertas();
    setAlertas(list);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await marcarAlertaLido(id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          8. Alertas e Notificações de Vencimento
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Monitore prazos de término de contrato, renovações pendentes e reajustes
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-400 text-center py-8">Carregando alertas...</p>
      ) : alertas.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-400">
          Nenhum alerta pendente no momento!
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(a => (
            <div
              key={a.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                a.lido
                  ? 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 opacity-60'
                  : a.diasAntecedencia === 0
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-900 dark:text-red-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-white dark:bg-zinc-800 shadow-2xs">
                    {a.tipoAlerta}
                  </span>
                  <span className="font-bold">{a.contratoNumero}</span>
                </div>
                <p className="font-semibold">{a.mensagem}</p>
                <p className="text-[10px] text-zinc-400">
                  Data Limite: {new Date(a.dataVencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {!a.lido && (
                <button
                  onClick={() => handleMarkAsRead(a.id)}
                  className="px-3 py-1.5 bg-white dark:bg-zinc-800 border hover:bg-zinc-100 rounded-lg font-bold shrink-0 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Marcar como Lido
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
