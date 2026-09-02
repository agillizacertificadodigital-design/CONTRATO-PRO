import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  Plus,
  Star,
  FileText,
  Upload,
  Edit,
  Trash2,
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  FileCode,
  Tag
} from 'lucide-react';
import {
  getModelos,
  createModelo,
  updateModelo,
  deleteModelo,
  toggleFavoritoModelo
} from '../services/modelosService';
import { importarEAnalisarDocumento } from '../services/aiService';
import { ModeloContrato, ClausulaModel, CampoDinamico } from '../types';
import { useAuth } from '../context/AuthContext';

interface ModelosPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const ModelosPage: React.FC<ModelosPageProps> = () => {
  const { currentUser } = useAuth();
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Import Assistant Modal State (Item 80 - 8 Steps)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<number>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importAnalysis, setImportAnalysis] = useState<any>(null);

  // Model Form State
  const [modelForm, setModelForm] = useState<Partial<ModeloContrato>>({
    nome: '',
    categoria: 'Prestação de Serviços',
    descricao: '',
    conteudo: '',
    clausulas: [],
    variaveis: [],
    camposDinamicos: [],
    regrasCondicionais: []
  });

  const loadData = async () => {
    setLoading(true);
    const mds = await getModelos();
    setModelos(mds);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFav = async (id: string, curr: boolean) => {
    await toggleFavoritoModelo(id, curr);
    await loadData();
  };

  const handleOpenEditor = (modelo?: ModeloContrato) => {
    if (modelo) {
      setEditingId(modelo.id);
      setModelForm(modelo);
    } else {
      setEditingId(null);
      setModelForm({
        nome: '',
        categoria: 'Prestação de Serviços',
        descricao: '',
        conteudo: 'CONTRATO DE ...\n\nCLÁUSULA PRIMEIRA - DO OBJETO\n...',
        clausulas: [],
        variaveis: ['contratante.nome', 'contratado.nome', 'contrato.valor'],
        camposDinamicos: [],
        regrasCondicionais: []
      });
    }
    setIsEditorOpen(true);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelForm.nome) return;

    setSaving(true);
    try {
      const payload: Omit<ModeloContrato, 'id'> = {
        nome: modelForm.nome || 'Novo Modelo',
        categoria: modelForm.categoria || 'Geral',
        descricao: modelForm.descricao || '',
        conteudo: modelForm.conteudo || '',
        clausulas: modelForm.clausulas || [],
        variaveis: modelForm.variaveis || [],
        camposDinamicos: modelForm.camposDinamicos || [],
        regrasCondicionais: modelForm.regrasCondicionais || [],
        isFavorito: modelForm.isFavorito || false,
        status: 'ativo',
        versao: (modelForm.versao || 0) + 1,
        createdBy: currentUser?.uid || 'user',
        createdAt: modelForm.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateModelo(editingId, payload);
      } else {
        await createModelo(payload, currentUser?.uid || 'user');
      }
      setIsEditorOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Deseja excluir este modelo de contrato?')) return;
    await deleteModelo(id);
    await loadData();
  };

  // ---------------- IMPORT WIZARD HANDLERS (Item 80) ----------------
  const handleStartImport = () => {
    setImportStep(1);
    setImportFile(null);
    setImportRawText('');
    setImportAnalysis(null);
    setIsImportModalOpen(true);
  };

  const handleProcessImport = async () => {
    if (!importFile) return;
    setImportStep(2); // Step 2: Processando
    setImportLoading(true);

    try {
      const res = await importarEAnalisarDocumento(importFile);
      setImportRawText(res.rawText);
      setImportAnalysis(res.analysis);
      setImportStep(3); // Step 3: Conteúdo Identificado
    } catch (err: any) {
      alert(err.message || 'Erro ao importar documento.');
      setImportStep(1);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImportToEditor = () => {
    if (!importAnalysis) return;

    setModelForm({
      nome: importAnalysis.nomeModelo || importFile?.name || 'Modelo Importado',
      categoria: importAnalysis.categoria || 'Importados',
      descricao: importAnalysis.descricao || 'Modelo importado e analisado por IA',
      conteudo: importAnalysis.conteudoConvertido || importRawText,
      clausulas: importAnalysis.clausulas?.map((c: any, idx: number) => ({
        id: `ic_${idx}`,
        titulo: c.titulo,
        conteudo: c.conteudo,
        ordem: idx + 1
      })) || [],
      variaveis: importAnalysis.variaveisIdentificadas?.map((v: any) => v.chave) || [],
      camposDinamicos: importAnalysis.camposDinamicosRecomendados?.map((cd: any, idx: number) => ({
        id: `cd_${idx}`,
        chave: cd.chave,
        label: cd.label,
        tipo: cd.tipo || 'texto',
        obrigatorio: cd.obrigatorio !== false
      })) || [],
      regrasCondicionais: []
    });

    setIsImportModalOpen(false);
    setIsEditorOpen(true);
  };

  // Filtering
  const filteredModelos = modelos.filter(m => {
    const matchCat = selectedCategory === 'TODAS' || m.categoria === selectedCategory;
    const matchFav = !onlyFavorites || m.isFavorito;
    return matchCat && matchFav;
  });

  const categoriesList = Array.from(new Set(['TODAS', ...modelos.map(m => m.categoria)]));

  return (
    <div className="space-y-6">
      {/* Title & Import / Create Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-indigo-600" />
            Modelos de Contrato
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Crie, importe em Word (.docx) ou PDF e gerencie cláusulas e variáveis dinâmicas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartImport}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            Importar Word / PDF
          </button>
          <button
            onClick={() => handleOpenEditor()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Criar Modelo
          </button>
        </div>
      </div>

      {/* Category Bar & Favorites Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            onlyFavorites
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
          Apenas Favoritos
        </button>
      </div>

      {/* Models Grid */}
      {loading ? (
        <p className="text-xs text-zinc-400 text-center py-8">Carregando modelos de contrato...</p>
      ) : filteredModelos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-400">
          Nenhum modelo encontrado para esta categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModelos.map(m => (
            <div
              key={m.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-3 relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {m.categoria}
                  </span>
                  <button
                    onClick={() => handleToggleFav(m.id, !!m.isFavorito)}
                    className="text-zinc-400 hover:text-amber-500 p-1"
                  >
                    <Star className={`w-4 h-4 ${m.isFavorito ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-2 line-clamp-1">
                  {m.nome}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {m.descricao || 'Sem descrição.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-1 text-[10px]">
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                    {m.clausulas?.length || 0} cláusulas
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                    {m.variaveis?.length || 0} variáveis
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                    {m.camposDinamicos?.length || 0} campos dinâmicos
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => handleOpenEditor(m)}
                  className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-semibold rounded-md flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => handleDeleteModel(m.id)}
                  className="px-2.5 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8-STEP IMPORT WIZARD ASSISTANT MODAL (Item 80 Requirement) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Assistente de Importação de Modelo (Etapa {importStep} de 8)
                </h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${(importStep / 8) * 100}%` }}
              />
            </div>

            {/* Step 1: Enviar Arquivo */}
            {importStep === 1 && (
              <div className="space-y-4 py-4 text-center">
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 bg-zinc-50 dark:bg-zinc-800/50">
                  <FileText className="w-10 h-10 text-indigo-600 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Selecione um arquivo Word (.docx / .doc) ou PDF (.pdf)
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 mb-4">
                    O sistema usará OCR e IA Gemini para ler cláusulas e identificar variáveis automaticamente.
                  </p>
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf"
                    onChange={e => setImportFile(e.target.files?.[0] || null)}
                    className="text-xs text-zinc-600 dark:text-zinc-400 mx-auto block"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleProcessImport}
                    disabled={!importFile}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    Avançar para Análise <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Processando Documento */}
            {importStep === 2 && (
              <div className="text-center py-12 space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Analisando documento com IA Gemini...
                </h4>
                <p className="text-xs text-zinc-400">
                  Extraindo textos, identificando parágrafos, cláusulas e variáveis. Aguarde alguns segundos.
                </p>
              </div>
            )}

            {/* Step 3: Conteúdo Identificado */}
            {importStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Etapa 3: Conteúdo e Texto Convertido
                </p>
                <textarea
                  rows={8}
                  value={importAnalysis?.conteudoConvertido || importRawText}
                  onChange={e => setImportAnalysis({ ...importAnalysis, conteudoConvertido: e.target.value })}
                  className="w-full text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 bg-white dark:bg-zinc-800"
                />

                <div className="flex justify-between">
                  <button onClick={() => setImportStep(1)} className="px-3 py-1.5 text-xs text-zinc-500">Voltar</button>
                  <button onClick={() => setImportStep(4)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Próximo: Variáveis</button>
                </div>
              </div>
            )}

            {/* Step 4: Variáveis Identificadas */}
            {importStep === 4 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Etapa 4: Variáveis Detectadas pela IA
                </p>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                  {importAnalysis?.variaveisIdentificadas?.map((v: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-zinc-800 p-2 rounded border">
                      <span className="font-bold text-indigo-600">{`{{${v.chave}}}`}</span>
                      <span className="text-zinc-500">{v.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setImportStep(3)} className="px-3 py-1.5 text-xs text-zinc-500">Voltar</button>
                  <button onClick={() => setImportStep(5)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Próximo: Configurar Campos</button>
                </div>
              </div>
            )}

            {/* Step 5: Configurar Campos */}
            {importStep === 5 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Etapa 5: Campos Dinâmicos Recomendados
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {importAnalysis?.camposDinamicosRecomendados?.map((cd: any, idx: number) => (
                    <div key={idx} className="text-xs bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded flex justify-between items-center">
                      <span className="font-semibold">{cd.label}</span>
                      <span className="text-zinc-400 uppercase text-[10px]">{cd.tipo}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setImportStep(4)} className="px-3 py-1.5 text-xs text-zinc-500">Voltar</button>
                  <button onClick={() => setImportStep(6)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Próximo: Regras Condicionais</button>
                </div>
              </div>
            )}

            {/* Step 6: Configurar Condições */}
            {importStep === 6 && (
              <div className="space-y-4 text-xs">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                  Etapa 6: Regras Condicionais (Opcional)
                </p>
                <p className="text-zinc-500">
                  Defina cláusulas condicionais como &quot;SE auxilioTransporte = SIM&quot;. Poderá ajustar depois no editor completo.
                </p>

                <div className="flex justify-between">
                  <button onClick={() => setImportStep(5)} className="px-3 py-1.5 text-xs text-zinc-500">Voltar</button>
                  <button onClick={() => setImportStep(7)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Próximo: Pré-visualizar</button>
                </div>
              </div>
            )}

            {/* Step 7: Pré-visualizar */}
            {importStep === 7 && (
              <div className="space-y-4 text-xs">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                  Etapa 7: Pré-visualização do Modelo Importado
                </p>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-lg max-h-48 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap">
                  {importAnalysis?.conteudoConvertido}
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setImportStep(6)} className="px-3 py-1.5 text-xs text-zinc-500">Voltar</button>
                  <button onClick={() => setImportStep(8)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Próximo: Aprovação Final</button>
                </div>
              </div>
            )}

            {/* Step 8: Salvar Modelo */}
            {importStep === 8 && (
              <div className="space-y-4 text-xs text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Etapa 8: Aprovar e Carregar no Editor
                </h4>
                <p className="text-zinc-500">
                  O modelo foi processado e estruturado. Ao clicar no botão abaixo, ele será transferido para o editor de modelos para revisão final antes de salvar no banco de dados.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImportToEditor}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md"
                  >
                    Aprovar e Carregar Modelo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL MODEL EDITOR MODAL (Item 8) */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span>{editingId ? 'Editar Modelo de Contrato' : 'Novo Modelo de Contrato'}</span>
              <button onClick={() => setIsEditorOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </h3>

            <form onSubmit={handleSaveModel} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={modelForm.nome}
                    onChange={e => setModelForm({ ...modelForm, nome: e.target.value })}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Categoria *</label>
                  <select
                    value={modelForm.categoria}
                    onChange={e => setModelForm({ ...modelForm, categoria: e.target.value })}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                  >
                    <option value="Prestação de Serviços">Prestação de Serviços</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Empresarial">Empresarial</option>
                    <option value="Locação">Locação</option>
                    <option value="Compra e Venda">Compra e Venda</option>
                    <option value="Parcerias">Parcerias</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Descrição Breve</label>
                <input
                  type="text"
                  value={modelForm.descricao}
                  onChange={e => setModelForm({ ...modelForm, descricao: e.target.value })}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                />
              </div>

              {/* Full Text Editor */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Conteúdo e Minuta Base do Contrato (com Variáveis <code className="text-indigo-600">{`{{variável}}`}</code>)
                </label>
                <textarea
                  rows={14}
                  value={modelForm.conteudo}
                  onChange={e => setModelForm({ ...modelForm, conteudo: e.target.value })}
                  className="w-full font-mono text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 bg-white dark:bg-zinc-800 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Modelo de Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
