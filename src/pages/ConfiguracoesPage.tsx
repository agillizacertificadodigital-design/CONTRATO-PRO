import React, { useState, useEffect } from 'react';
import { Settings, Save, Building, FileText, Check, Loader2, User } from 'lucide-react';
import { getConfiguracoes, saveConfiguracoes, CONFIGURACAO_PADRAO } from '../services/configuracoesService';
import { ConfiguracaoSistema } from '../types';

export const ConfiguracoesPage: React.FC = () => {
  const [config, setConfig] = useState<ConfiguracaoSistema>(CONFIGURACAO_PADRAO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const data = await getConfiguracoes();
        if (data) {
          // Guarantee nested properties exist safely
          setConfig({
            ...CONFIGURACAO_PADRAO,
            ...data,
            dadosEscritorio: {
              ...CONFIGURACAO_PADRAO.dadosEscritorio,
              ...(data.dadosEscritorio || {})
            },
            dadosResponsavel: {
              ...CONFIGURACAO_PADRAO.dadosResponsavel,
              ...(data.dadosResponsavel || {})
            },
            configDocumento: {
              ...CONFIGURACAO_PADRAO.configDocumento,
              ...(data.configDocumento || {}),
              margensMm: {
                ...CONFIGURACAO_PADRAO.configDocumento.margensMm,
                ...(data.configDocumento?.margensMm || {})
              }
            }
          });
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveConfiguracoes(config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setSaving(false);
    }
  };

  const margens = config?.configDocumento?.margensMm || { topo: 20, direita: 20, baixo: 20, esquerda: 20 };
  const configDoc = config?.configDocumento || CONFIGURACAO_PADRAO.configDocumento;
  const escritorio = config?.dadosEscritorio || CONFIGURACAO_PADRAO.dadosEscritorio;
  const responsavel = config?.dadosResponsavel || CONFIGURACAO_PADRAO.dadosResponsavel;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/80 p-5 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm backdrop-blur-xs transition-colors duration-200">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Settings className="w-5 h-5" />
          </div>
          Configurações Gerais do Sistema
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ajuste dados do escritório/empresa, estilos visuais para exportação PDF e preferências contratuais
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          Carregando configurações...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Office Identification */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm backdrop-blur-xs transition-colors duration-200">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Dados do Escritório / Empresa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome do Escritório / Empresa</label>
                <input
                  type="text"
                  value={escritorio.nomeEscritorio || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosEscritorio: { ...escritorio, nomeEscritorio: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={escritorio.cnpj || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosEscritorio: { ...escritorio, cnpj: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={escritorio.telefone || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosEscritorio: { ...escritorio, telefone: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">E-mail de Contato</label>
                <input
                  type="email"
                  value={escritorio.email || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosEscritorio: { ...escritorio, email: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Endereço Comercial</label>
                <input
                  type="text"
                  value={escritorio.endereco || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosEscritorio: { ...escritorio, endereco: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Legal Manager Info */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm backdrop-blur-xs transition-colors duration-200">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Responsável Legal / Administrador
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  value={responsavel.nome || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosResponsavel: { ...responsavel, nome: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">CPF</label>
                <input
                  type="text"
                  value={responsavel.cpf || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosResponsavel: { ...responsavel, cpf: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cargo / Profissão</label>
                <input
                  type="text"
                  value={responsavel.profissao || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosResponsavel: { ...responsavel, profissao: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Registro Profissional (OAB/CRC/Outro)</label>
                <input
                  type="text"
                  value={responsavel.registroProfissional || ''}
                  onChange={e => setConfig({
                    ...config,
                    dadosResponsavel: { ...responsavel, registroProfissional: e.target.value }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Document PDF Styling */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm backdrop-blur-xs transition-colors duration-200">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Estilo e Margens para Impressão e PDF (A4)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Margem Sup. (mm)</label>
                <input
                  type="number"
                  value={margens.topo ?? 20}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: {
                      ...configDoc,
                      margensMm: { ...margens, topo: Number(e.target.value) }
                    }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Margem Inf. (mm)</label>
                <input
                  type="number"
                  value={margens.baixo ?? 20}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: {
                      ...configDoc,
                      margensMm: { ...margens, baixo: Number(e.target.value) }
                    }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Margem Esq. (mm)</label>
                <input
                  type="number"
                  value={margens.esquerda ?? 20}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: {
                      ...configDoc,
                      margensMm: { ...margens, esquerda: Number(e.target.value) }
                    }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Margem Dir. (mm)</label>
                <input
                  type="number"
                  value={margens.direita ?? 20}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: {
                      ...configDoc,
                      margensMm: { ...margens, direita: Number(e.target.value) }
                    }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Fonte Padrão</label>
                <select
                  value={configDoc.fonte || 'Arial'}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: { ...configDoc, fonte: e.target.value as any }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Calibri">Calibri</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tamanho da Fonte (pt)</label>
                <input
                  type="number"
                  value={configDoc.tamanhoFonte || 12}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: { ...configDoc, tamanhoFonte: Number(e.target.value) }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Espaçamento Entre Linhas</label>
                <select
                  value={configDoc.espacamentoLinhas || 1.15}
                  onChange={e => setConfig({
                    ...config,
                    configDocumento: { ...configDoc, espacamentoLinhas: Number(e.target.value) }
                  })}
                  className="w-full border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:border-blue-500 transition-colors"
                >
                  <option value={1.0}>1.0 (Simples)</option>
                  <option value={1.15}>1.15 (Padrão)</option>
                  <option value={1.5}>1.5 (Expandido)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {savedSuccess && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                <Check className="w-4 h-4" /> Configurações salvas com sucesso!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 border border-blue-400/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
