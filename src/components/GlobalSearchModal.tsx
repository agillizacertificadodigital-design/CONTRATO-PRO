import React, { useState, useEffect } from 'react';
import { Search, FileText, UserCheck, Users, LayoutTemplate, X, ArrowRight } from 'lucide-react';
import { getContratantes } from '../services/contratantesService';
import { getContratados } from '../services/contratadosService';
import { getContratos } from '../services/contratosService';
import { getModelos } from '../services/modelosService';
import { PartesDados, ContratoData, ModeloContrato } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, id?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');
  const [contratantes, setContratantes] = useState<PartesDados[]>([]);
  const [contratados, setContratados] = useState<PartesDados[]>([]);
  const [contratos, setContratos] = useState<ContratoData[]>([]);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [cts, cds, ctrs, mds] = await Promise.all([
        getContratantes(),
        getContratados(),
        getContratos(),
        getModelos()
      ]);
      setContratantes(cts);
      setContratados(cds);
      setContratos(ctrs);
      setModelos(mds);
      setLoading(false);
    };
    fetchData();
  }, [isOpen]);

  const qLower = query.toLowerCase().trim();

  const filteredContratantes = qLower
    ? contratantes.filter(c =>
        c.nome.toLowerCase().includes(qLower) ||
        (c.cpf && c.cpf.includes(qLower)) ||
        (c.cnpj && c.cnpj.includes(qLower))
      )
    : [];

  const filteredContratados = qLower
    ? contratados.filter(c =>
        c.nome.toLowerCase().includes(qLower) ||
        (c.cpf && c.cpf.includes(qLower)) ||
        (c.cnpj && c.cnpj.includes(qLower))
      )
    : [];

  const filteredContratos = qLower
    ? contratos.filter(c =>
        c.numero.toLowerCase().includes(qLower) ||
        c.titulo.toLowerCase().includes(qLower) ||
        (c.modeloNome && c.modeloNome.toLowerCase().includes(qLower))
      )
    : [];

  const filteredModelos = qLower
    ? modelos.filter(m =>
        m.nome.toLowerCase().includes(qLower) ||
        m.categoria.toLowerCase().includes(qLower)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-200">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            autoFocus
            placeholder="Pesquisar contratantes, contratados, CPF/CNPJ, contratos ou modelos..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="p-3.5 overflow-y-auto space-y-4 text-xs">
          {loading && <p className="text-xs text-slate-500 text-center py-4">Carregando registros...</p>}

          {!query && !loading && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
              Digite o nome, CPF, CNPJ, número de contrato ou palavra-chave acima.
            </p>
          )}

          {query && !loading && (
            <>
              {/* Contratos */}
              {filteredContratos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    Contratos ({filteredContratos.length})
                  </div>
                  <div className="space-y-1">
                    {filteredContratos.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onNavigate('contratos', c.id);
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors border border-slate-200 dark:border-slate-800/60"
                      >
                        <div>
                          <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">[{c.numero}]</span>
                          <span className="text-slate-800 dark:text-slate-200">{c.titulo}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contratantes */}
              {filteredContratantes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    Contratantes ({filteredContratantes.length})
                  </div>
                  <div className="space-y-1">
                    {filteredContratantes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onNavigate('contratantes');
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors border border-slate-200 dark:border-slate-800/60"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mr-2">{c.nome}</span>
                          <span className="text-slate-500 dark:text-slate-400">({c.cpf || c.cnpj || c.tipoPessoa})</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contratados */}
              {filteredContratados.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    Contratados ({filteredContratados.length})
                  </div>
                  <div className="space-y-1">
                    {filteredContratados.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onNavigate('contratados');
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors border border-slate-200 dark:border-slate-800/60"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mr-2">{c.nome}</span>
                          <span className="text-slate-500 dark:text-slate-400">({c.cpf || c.cnpj || c.tipoPessoa})</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modelos */}
              {filteredModelos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    Modelos de Contrato ({filteredModelos.length})
                  </div>
                  <div className="space-y-1">
                    {filteredModelos.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onNavigate('modelos');
                          onClose();
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors border border-slate-200 dark:border-slate-800/60"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mr-2">{m.nome}</span>
                          <span className="text-slate-500 dark:text-slate-400">({m.categoria})</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredContratos.length === 0 &&
                filteredContratantes.length === 0 &&
                filteredContratados.length === 0 &&
                filteredModelos.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                    Nenhum resultado encontrado para &quot;{query}&quot;.
                  </p>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
