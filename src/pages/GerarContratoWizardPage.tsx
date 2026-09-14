import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  Users,
  UserCheck,
  LayoutTemplate,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  FileText,
  Save,
  Download,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { getModelos } from '../services/modelosService';
import { getContratantes } from '../services/contratantesService';
import { getContratados } from '../services/contratadosService';
import { createContrato } from '../services/contratosService';
import { exportarPDF, exportarDOCX } from '../services/documentExportService';
import { renderizarContrato } from '../utils/templateEngine';
import { ModeloContrato, PartesDados, ClausulaModel, ContratoData } from '../types';
import { AIAssistantModal } from '../components/AIAssistantModal';
import { A4DocumentPreview } from '../components/A4DocumentPreview';
import { useAuth } from '../context/AuthContext';

interface GerarContratoWizardPageProps {
  onNavigate: (page: string, id?: string) => void;
}

export const GerarContratoWizardPage: React.FC<GerarContratoWizardPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Loaded Data
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [contratantes, setContratantes] = useState<PartesDados[]>([]);
  const [contratados, setContratados] = useState<PartesDados[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard Selections
  const [selectedModelo, setSelectedModelo] = useState<ModeloContrato | null>(null);
  const [selectedContratante, setSelectedContratante] = useState<PartesDados | null>(null);
  const [selectedContratado, setSelectedContratado] = useState<PartesDados | null>(null);

  // Step 4 Form Data
  const [dadosVariaveis, setDadosVariaveis] = useState<Record<string, any>>({
    servicos: ['Limpeza interna', 'Organização geral'],
    servicosOutros: '',
    periodicidade: 'Uma vez por semana',
    periodicidadePersonalizada: '',
    diasSemana: ['Segunda-feira'],
    horarioInicio: '08:00',
    horarioFim: '17:00',
    valorDiaria: 180.00,
    formaPagamento: 'PIX',
    detalhesPagamento: '',
    haverAuxilioTransporte: 'SIM',
    valorAuxilioTransporte: 20.00,
    haverAuxilioAlimentacao: 'NAO',
    valorAuxilioAlimentacao: 0,
    tipoPrazo: 'Indeterminado',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: '',
    haverMulta: 'SIM',
    valorMulta: 'R$ 200,00',
    prazoAvisoDias: '30',
    prazoAvisoExtenso: 'trinta dias',
    localServicoMesmoEndereco: true,
    localServicoLogradouro: '',
    localServicoNumero: '',
    localServicoBairro: '',
    localServicoCep: '',
    localServicoCidade: '',
    localServicoUf: '',
    foroCidade: '',
    foroEstado: '',
    testemunha1Nome: '',
    testemunha1Cpf: '',
    testemunha2Nome: '',
    testemunha2Cpf: ''
  });

  // Step 5 & 6 Contract State
  const [renderedText, setRenderedText] = useState('');
  const [pendencias, setPendencias] = useState<string[]>([]);
  const [clausulasModel, setClausulasModel] = useState<ClausulaModel[]>([]);

  // AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'improve' | 'suggest' | 'review'>('improve');
  const [targetClauseIdx, setTargetClauseIdx] = useState<number | null>(null);

  // Finalization State
  const [savingContract, setSavingContract] = useState(false);
  const [createdContratoId, setCreatedContratoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [mds, cts, cds] = await Promise.all([
        getModelos(),
        getContratantes(),
        getContratados()
      ]);
      setModelos(mds);
      setContratantes(cts);
      setContratados(cds);

      if (mds.length > 0) {
        setSelectedModelo(mds[0]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Update foro and local de serviço when contratante is selected
  useEffect(() => {
    if (selectedContratante) {
      setDadosVariaveis(prev => ({
        ...prev,
        foroCidade: selectedContratante.cidade || prev.foroCidade || 'São Paulo',
        foroEstado: selectedContratante.estado || prev.foroEstado || 'SP',
        localServicoLogradouro: prev.localServicoLogradouro || selectedContratante.endereco || '',
        localServicoNumero: prev.localServicoNumero || selectedContratante.numero || 's/n',
        localServicoBairro: prev.localServicoBairro || selectedContratante.bairro || '',
        localServicoCep: prev.localServicoCep || selectedContratante.cep || '',
        localServicoCidade: prev.localServicoCidade || selectedContratante.cidade || 'São Paulo',
        localServicoUf: prev.localServicoUf || selectedContratante.estado || 'SP',
      }));
    }
  }, [selectedContratante]);

  // Recalculate Minuta
  const handleGenerateMinuta = () => {
    if (!selectedModelo) return;

    const res = renderizarContrato(
      selectedModelo,
      selectedContratante,
      selectedContratado,
      dadosVariaveis,
      dadosVariaveis.foroCidade,
      dadosVariaveis.foroEstado
    );

    setRenderedText(res.conteudoFinal);
    setPendencias(res.pendencias);

    // Initial clauses breakdown
    if (selectedModelo.clausulas && selectedModelo.clausulas.length > 0) {
      setClausulasModel(selectedModelo.clausulas);
    } else {
      setClausulasModel([
        { id: '1', titulo: 'CONTEÚDO DO CONTRATO', conteudo: res.conteudoFinal, ordem: 1 }
      ]);
    }

    setCurrentStep(5);
  };

  // Auto-resolve any missing fields and refresh preview
  const handleAutoResolverPendencias = () => {
    if (!selectedModelo) return;

    const updatedDados = {
      ...dadosVariaveis,
      prazoAvisoDias: dadosVariaveis.prazoAvisoDias || '30',
      prazoAvisoExtenso: dadosVariaveis.prazoAvisoExtenso || 'trinta dias',
      localServicoLogradouro: dadosVariaveis.localServicoLogradouro || selectedContratante?.endereco || 'No endereço do Contratante',
      localServicoNumero: dadosVariaveis.localServicoNumero || selectedContratante?.numero || 's/n',
      localServicoBairro: dadosVariaveis.localServicoBairro || selectedContratante?.bairro || 'Centro',
      localServicoCep: dadosVariaveis.localServicoCep || selectedContratante?.cep || '00000-000',
      localServicoCidade: dadosVariaveis.localServicoCidade || selectedContratante?.cidade || 'São Paulo',
      localServicoUf: dadosVariaveis.localServicoUf || selectedContratante?.estado || 'SP',
      foroCidade: dadosVariaveis.foroCidade || selectedContratante?.cidade || 'São Paulo',
      foroEstado: dadosVariaveis.foroEstado || selectedContratante?.estado || 'SP',
      valorDiaria: dadosVariaveis.valorDiaria || 180,
      formaPagamento: dadosVariaveis.formaPagamento || 'PIX'
    };

    setDadosVariaveis(updatedDados);

    const res = renderizarContrato(
      selectedModelo,
      selectedContratante,
      selectedContratado,
      updatedDados,
      updatedDados.foroCidade,
      updatedDados.foroEstado
    );

    setRenderedText(res.conteudoFinal);
    setPendencias(res.pendencias);
  };

  const handleSaveFinalContract = async () => {
    if (!selectedModelo || !selectedContratante || !selectedContratado) return;

    setSavingContract(true);
    try {
      const contractPayload = {
        titulo: `${selectedModelo.nome} - ${selectedContratante.nome} e ${selectedContratado.nome}`,
        modeloId: selectedModelo.id,
        modeloNome: selectedModelo.nome,
        contratanteId: selectedContratante.id!,
        contratadoId: selectedContratado.id!,
        status: 'Rascunho' as const,
        dataInicio: dadosVariaveis.dataInicio || new Date().toISOString().split('T')[0],
        dataFim: dadosVariaveis.dataFim || null,
        tipoPrazo: (dadosVariaveis.tipoPrazo?.toLowerCase() as any) || 'indeterminado',
        valor: parseFloat(dadosVariaveis.valorDiaria) || 0,
        dadosVariaveis,
        clausulas: clausulasModel,
        conteudoFinal: renderedText,
        contractDataSnapshot: {
          contratanteSnapshot: selectedContratante,
          contratadoSnapshot: selectedContratado,
          dadosGeraisSnapshot: dadosVariaveis,
          dataSnapshot: new Date().toISOString()
        },
        foroCidade: dadosVariaveis.foroCidade,
        foroEstado: dadosVariaveis.foroEstado,
        createdBy: currentUser?.uid || 'user',
        testemunhas: [
          { nome: dadosVariaveis.testemunha1Nome, cpf: dadosVariaveis.testemunha1Cpf },
          { nome: dadosVariaveis.testemunha2Nome, cpf: dadosVariaveis.testemunha2Cpf }
        ].filter(t => t.nome)
      };

      const newId = await createContrato(contractPayload, currentUser?.uid || 'user');
      setCreatedContratoId(newId);
      setCurrentStep(7);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingContract(false);
    }
  };

  const steps = [
    { num: 1, name: '1. Modelo' },
    { num: 2, name: '2. Contratante' },
    { num: 3, name: '3. Contratado' },
    { num: 4, name: '4. Informações' },
    { num: 5, name: '5. Minuta' },
    { num: 6, name: '6. Revisar com IA' },
    { num: 7, name: '7. Finalizar' }
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicator (Item 21 visual indicator) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
          {steps.map(s => (
            <div key={s.num} className="flex items-center gap-2 shrink-0">
              <div
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  currentStep === s.num
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950'
                    : currentStep > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${
                currentStep === s.num ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'
              }`}>
                {s.name}
              </span>
              {s.num < 7 && <ArrowRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-400 text-center py-12">Carregando dados do gerador...</p>
      ) : (
        <>
          {/* ETAPA 1: SELECIONAR MODELO */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                Etapa 1: Selecione o Modelo de Contrato
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {modelos.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModelo(m)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedModelo?.id === m.id
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                      {m.categoria}
                    </span>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 mt-2">{m.nome}</h4>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{m.descricao}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedModelo}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  Próximo: Selecionar Contratante <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: SELECIONAR CONTRATANTE */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Etapa 2: Selecione o Contratante
                </h3>
                <button
                  onClick={() => onNavigate('contratantes')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  + Cadastrar Novo Contratante
                </button>
              </div>

              {contratantes.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhum contratante cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {contratantes.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContratante(c)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedContratante?.id === c.id
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-300'
                      }`}
                    >
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{c.nome}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {c.tipoPessoa === 'PJ' ? `CNPJ: ${c.cnpj}` : `CPF: ${c.cpf}`}
                      </p>
                      <p className="text-[11px] text-zinc-400">{c.cidade}/{c.estado}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!selectedContratante}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  Próximo: Selecionar Contratado <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 3: SELECIONAR CONTRATADO */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Etapa 3: Selecione o Contratado
                </h3>
                <button
                  onClick={() => onNavigate('contratados')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  + Cadastrar Novo Contratado
                </button>
              </div>

              {contratados.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhum contratado cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {contratados.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContratado(c)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedContratado?.id === c.id
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-300'
                      }`}
                    >
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{c.nome}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {c.tipoPessoa === 'PJ' ? `CNPJ: ${c.cnpj}` : `CPF: ${c.cpf}`}
                      </p>
                      <p className="text-[11px] text-zinc-400">{c.cidade}/{c.estado}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!selectedContratado}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  Próximo: Preencher Informações <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 4: FORMULÁRIO DINÂMICO DE INFORMAÇÕES ESPECÍFICAS (Items 13-20) */}
          {currentStep === 4 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Etapa 4: Informações Específicas do Contrato ({selectedModelo?.nome})
              </h3>

              <div className="space-y-5 text-xs">
                {/* Item 13: Serviços */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    13. Serviços Inclusos no Contrato
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      'Limpeza interna',
                      'Limpeza externa',
                      'Lavar roupas',
                      'Passar roupas',
                      'Guardar roupas',
                      'Lavar louça',
                      'Organização',
                      'Outros'
                    ].map(s => {
                      const list = dadosVariaveis.servicos || [];
                      const checked = list.includes(s);
                      return (
                        <label key={s} className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const updated = e.target.checked
                                ? [...list, s]
                                : list.filter((i: string) => i !== s);
                              setDadosVariaveis({ ...dadosVariaveis, servicos: updated });
                            }}
                          />
                          {s}
                        </label>
                      );
                    })}
                  </div>
                  {dadosVariaveis.servicos?.includes('Outros') && (
                    <input
                      type="text"
                      placeholder="Descreva os outros serviços..."
                      value={dadosVariaveis.servicosOutros}
                      onChange={e => setDadosVariaveis({ ...dadosVariaveis, servicosOutros: e.target.value })}
                      className="w-full mt-2 border rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  )}
                </div>

                {/* Item 14: Periodicidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                      14. Periodicidade dos Serviços
                    </label>
                    <select
                      value={dadosVariaveis.periodicidade}
                      onChange={e => setDadosVariaveis({ ...dadosVariaveis, periodicidade: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800 font-medium text-sm"
                    >
                      <optgroup label="Frequência Semanal">
                        <option value="Uma vez por semana">Uma vez por semana</option>
                        <option value="Duas vezes por semana">Duas vezes por semana</option>
                        <option value="Três vezes por semana">Três vezes por semana</option>
                        <option value="Quatro vezes por semana">Quatro vezes por semana</option>
                        <option value="Cinco vezes por semana (dias úteis)">Cinco vezes por semana (dias úteis)</option>
                        <option value="Finais de semana (sábado e domingo)">Finais de semana (sábado e domingo)</option>
                      </optgroup>
                      <optgroup label="Frequência Diária / Turnos">
                        <option value="Diária (segunda a sexta-feira)">Diária (segunda a sexta-feira)</option>
                        <option value="Diária contínua (segunda a sábado)">Diária contínua (segunda a sábado)</option>
                        <option value="Escala 12x36 / Plantão">Escala 12x36 / Plantão</option>
                        <option value="Por horas trabalhadas (horista)">Por horas trabalhadas (horista)</option>
                        <option value="Por diárias avulsas">Por diárias avulsas</option>
                      </optgroup>
                      <optgroup label="Períodos Quinzenais & Mensais">
                        <option value="Quinzenal (a cada 15 dias)">Quinzenal (a cada 15 dias)</option>
                        <option value="Mensal (uma vez ao mês)">Mensal (uma vez ao mês)</option>
                        <option value="Bimestral (a cada 2 meses)">Bimestral (a cada 2 meses)</option>
                        <option value="Trimestral (a cada 3 meses)">Trimestral (a cada 3 meses)</option>
                        <option value="Semestral">Semestral</option>
                        <option value="Anual">Anual</option>
                      </optgroup>
                      <optgroup label="Demanda & Flexível">
                        <option value="Eventual / Sob demanda">Eventual / Sob demanda</option>
                        <option value="Por projeto / Por entrega de etapas">Por projeto / Por entrega de etapas</option>
                        <option value="Personalizada (especificar)">Personalizada (especificar abaixo)</option>
                      </optgroup>
                    </select>

                    {(dadosVariaveis.periodicidade?.includes('Personalizada') || dadosVariaveis.periodicidade?.includes('especificar')) && (
                      <input
                        type="text"
                        placeholder="Ex: Terças e quintas à tarde e 1 sábado por mês..."
                        value={dadosVariaveis.periodicidadePersonalizada || ''}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, periodicidadePersonalizada: e.target.value })}
                        className="w-full mt-2 border rounded-lg p-2 bg-white dark:bg-zinc-800 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Horário de Trabalho
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={dadosVariaveis.horarioInicio}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, horarioInicio: e.target.value })}
                        className="w-1/2 border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                      <span>até</span>
                      <input
                        type="time"
                        value={dadosVariaveis.horarioFim}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, horarioFim: e.target.value })}
                        className="w-1/2 border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Item 15: Remuneração */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    15. Remuneração e Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-600 mb-1 font-semibold">Valor da Diária (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dadosVariaveis.valorDiaria}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, valorDiaria: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 mb-1 font-semibold">Forma de Pagamento</label>
                      <select
                        value={dadosVariaveis.formaPagamento}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, formaPagamento: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência bancária">Transferência bancária</option>
                        <option value="Depósito">Depósito</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-600 mb-1 font-semibold">Chave PIX / Dados Bancários</label>
                      <input
                        type="text"
                        placeholder="Chave ou agência e conta"
                        value={dadosVariaveis.detalhesPagamento}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, detalhesPagamento: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Item 16: Auxílios (Transporte / Alimentação) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                      16. Auxílio Transporte
                    </label>
                    <div className="flex items-center gap-4 mb-2">
                      <label className="flex items-center gap-1 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          name="auxTransp"
                          value="SIM"
                          checked={dadosVariaveis.haverAuxilioTransporte === 'SIM'}
                          onChange={() => setDadosVariaveis({ ...dadosVariaveis, haverAuxilioTransporte: 'SIM' })}
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          name="auxTransp"
                          value="NAO"
                          checked={dadosVariaveis.haverAuxilioTransporte === 'NAO'}
                          onChange={() => setDadosVariaveis({ ...dadosVariaveis, haverAuxilioTransporte: 'NAO' })}
                        />
                        Não
                      </label>
                    </div>
                    {dadosVariaveis.haverAuxilioTransporte === 'SIM' && (
                      <input
                        type="number"
                        placeholder="Valor R$"
                        value={dadosVariaveis.valorAuxilioTransporte}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, valorAuxilioTransporte: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Auxílio Alimentação
                    </label>
                    <div className="flex items-center gap-4 mb-2">
                      <label className="flex items-center gap-1 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          name="auxAlim"
                          value="SIM"
                          checked={dadosVariaveis.haverAuxilioAlimentacao === 'SIM'}
                          onChange={() => setDadosVariaveis({ ...dadosVariaveis, haverAuxilioAlimentacao: 'SIM' })}
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          name="auxAlim"
                          value="NAO"
                          checked={dadosVariaveis.haverAuxilioAlimentacao === 'NAO'}
                          onChange={() => setDadosVariaveis({ ...dadosVariaveis, haverAuxilioAlimentacao: 'NAO' })}
                        />
                        Não
                      </label>
                    </div>
                    {dadosVariaveis.haverAuxilioAlimentacao === 'SIM' && (
                      <input
                        type="number"
                        placeholder="Valor R$"
                        value={dadosVariaveis.valorAuxilioAlimentacao}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, valorAuxilioAlimentacao: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    )}
                  </div>
                </div>

                {/* Item 17, 18, 19, 20: Prazo, Multa, Foro e Local */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className="font-bold block mb-1">17. Prazo do Contrato</label>
                    <select
                      value={dadosVariaveis.tipoPrazo}
                      onChange={e => setDadosVariaveis({ ...dadosVariaveis, tipoPrazo: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800 mb-2"
                    >
                      <option value="Indeterminado">Indeterminado</option>
                      <option value="Determinado">Determinado</option>
                    </select>
                    <input
                      type="date"
                      value={dadosVariaveis.dataInicio}
                      onChange={e => setDadosVariaveis({ ...dadosVariaveis, dataInicio: e.target.value })}
                      className="w-full border rounded-lg p-1.5 bg-white dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1">18. Multa Rescisória</label>
                    <input
                      type="text"
                      value={dadosVariaveis.valorMulta}
                      onChange={e => setDadosVariaveis({ ...dadosVariaveis, valorMulta: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white dark:bg-zinc-800 mb-2"
                    />
                    <div className="flex gap-1 items-center">
                      <span className="text-[11px] text-zinc-500 font-semibold">Aviso prévio:</span>
                      <input
                        type="text"
                        placeholder="30"
                        value={dadosVariaveis.prazoAvisoDias}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, prazoAvisoDias: e.target.value })}
                        className="w-14 border rounded p-1 text-xs bg-white dark:bg-zinc-800 text-center"
                      />
                      <span className="text-[11px] text-zinc-500">dias</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">19. Foro da Comarca</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={dadosVariaveis.foroCidade}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, foroCidade: e.target.value })}
                        className="w-3/4 border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                      <input
                        type="text"
                        placeholder="UF"
                        value={dadosVariaveis.foroEstado}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, foroEstado: e.target.value })}
                        className="w-1/4 border rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Local da Prestação dos Serviços */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                      20. Local da Prestação dos Serviços
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosVariaveis.localServicoMesmoEndereco !== false}
                        onChange={e => {
                          const checked = e.target.checked;
                          setDadosVariaveis({
                            ...dadosVariaveis,
                            localServicoMesmoEndereco: checked,
                            localServicoLogradouro: checked ? (selectedContratante?.endereco || '') : dadosVariaveis.localServicoLogradouro,
                            localServicoNumero: checked ? (selectedContratante?.numero || 's/n') : dadosVariaveis.localServicoNumero,
                            localServicoBairro: checked ? (selectedContratante?.bairro || '') : dadosVariaveis.localServicoBairro,
                            localServicoCep: checked ? (selectedContratante?.cep || '') : dadosVariaveis.localServicoCep,
                            localServicoCidade: checked ? (selectedContratante?.cidade || '') : dadosVariaveis.localServicoCidade,
                            localServicoUf: checked ? (selectedContratante?.estado || '') : dadosVariaveis.localServicoUf,
                          });
                        }}
                      />
                      Mesmo endereço do contratante
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Logradouro (Rua, Av.)"
                        value={dadosVariaveis.localServicoLogradouro}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, localServicoLogradouro: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs bg-white dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Número"
                        value={dadosVariaveis.localServicoNumero}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, localServicoNumero: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs bg-white dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={dadosVariaveis.localServicoBairro}
                        onChange={e => setDadosVariaveis({ ...dadosVariaveis, localServicoBairro: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setCurrentStep(3)} className="px-4 py-2 border rounded-lg text-xs font-bold">
                  Voltar
                </button>
                <button
                  onClick={handleGenerateMinuta}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2"
                >
                  Gerar Minuta do Contrato <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 5: GERAR MINUTA & PRÉ-VISUALIZAR */}
          {currentStep === 5 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Etapa 5: Minuta do Contrato Gerada
                </h3>
                <button
                  onClick={() => {
                    setAiMode('review');
                    setAiModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-lg border border-indigo-200 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Revisar com IA
                </button>
              </div>

              {/* Pendencias Warning (Item 55) */}
              {pendencias.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4" />
                      PENDÊNCIAS DO CONTRATO ({pendencias.length})
                    </p>
                    <button
                      type="button"
                      onClick={handleAutoResolverPendencias}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Preencher e Resolver Automaticamente
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-36 overflow-y-auto">
                    {pendencias.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Textarea Editor before final approval */}
              <textarea
                rows={16}
                value={renderedText}
                onChange={e => setRenderedText(e.target.value)}
                className="w-full font-mono text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 leading-relaxed"
              />

              <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setCurrentStep(4)} className="px-4 py-2 border rounded-lg text-xs font-bold">
                  Voltar e Ajustar Dados
                </button>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2"
                >
                  Próximo: Aperfeiçoar Cláusulas com IA <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 6: REVISAR CLÁUSULAS COM IA GEMINI (Items 23, 24, 25, 26) */}
          {currentStep === 6 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Etapa 6: Assistente de Inteligência Artificial Gemini
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Utilize os recursos de IA para aperfeiçoar redação, sugerir novas cláusulas ou revisar o texto final.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAiMode('suggest');
                      setAiModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-lg border border-indigo-200 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Cláusula com IA
                  </button>
                  <button
                    onClick={() => {
                      setAiMode('review');
                      setAiModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auditoria Geral
                  </button>
                </div>
              </div>

              {/* Clause List with Aperfeiçoar com IA Button next to each clause (Item 23) */}
              <div className="space-y-4">
                {clausulasModel.map((c, idx) => (
                  <div key={c.id || idx} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{c.titulo}</span>
                      <button
                        onClick={() => {
                          setTargetClauseIdx(idx);
                          setAiMode('improve');
                          setAiModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md font-semibold hover:bg-indigo-200 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> APERFEIÇOAR COM IA
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={c.conteudo}
                      onChange={e => {
                        const updated = [...clausulasModel];
                        updated[idx].conteudo = e.target.value;
                        setClausulasModel(updated);
                      }}
                      className="w-full text-xs border rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setCurrentStep(5)} className="px-4 py-2 border rounded-lg text-xs font-bold">
                  Voltar
                </button>
                <button
                  onClick={handleSaveFinalContract}
                  disabled={savingContract}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2"
                >
                  {savingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Finalizar e Salvar Contrato
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 7: GERAR DOCUMENTO FINAL & EXPORTAR PDF / WORD */}
          {currentStep === 7 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                  Contrato Gerado e Salvo com Sucesso!
                </h3>
                <p className="text-xs text-zinc-500">
                  O documento foi registrado no banco de dados e está pronto para exportação profissional.
                </p>
              </div>

              {/* Action Buttons: PDF & WORD */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    const tempContrato: ContratoData = {
                      id: createdContratoId || 'temp',
                      numero: '0001/2026',
                      titulo: `${selectedModelo?.nome} - ${selectedContratante?.nome}`,
                      modeloId: selectedModelo?.id || '',
                      modeloNome: selectedModelo?.nome || '',
                      contratanteId: selectedContratante?.id || '',
                      contratadoId: selectedContratado?.id || '',
                      status: 'Rascunho',
                      dadosVariaveis,
                      clausulas: clausulasModel,
                      conteudoFinal: renderedText,
                      versaoAtual: 1,
                      createdBy: currentUser?.uid || 'user',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    exportarPDF(tempContrato);
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Gerar PDF Profissional
                </button>

                <button
                  onClick={() => {
                    const tempContrato: ContratoData = {
                      id: createdContratoId || 'temp',
                      numero: '0001/2026',
                      titulo: `${selectedModelo?.nome} - ${selectedContratante?.nome}`,
                      modeloId: selectedModelo?.id || '',
                      modeloNome: selectedModelo?.nome || '',
                      contratanteId: selectedContratante?.id || '',
                      contratadoId: selectedContratado?.id || '',
                      status: 'Rascunho',
                      dadosVariaveis,
                      clausulas: clausulasModel,
                      conteudoFinal: renderedText,
                      versaoAtual: 1,
                      createdBy: currentUser?.uid || 'user',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    exportarDOCX(tempContrato);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Gerar Word (.DOCX)
                </button>
              </div>

              {/* Visual A4 Document Preview */}
              <A4DocumentPreview
                contrato={{
                  id: createdContratoId || 'temp',
                  numero: '0001/2026',
                  titulo: selectedModelo?.nome || 'CONTRATO',
                  modeloId: '',
                  modeloNome: '',
                  contratanteId: '',
                  contratadoId: '',
                  status: 'Rascunho',
                  dadosVariaveis,
                  clausulas: clausulasModel,
                  conteudoFinal: renderedText,
                  versaoAtual: 1,
                  createdBy: 'user',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }}
              />

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => onNavigate('contratos', createdContratoId || undefined)}
                  className="px-6 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl"
                >
                  Ir para Lista de Contratos
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Assistant Modal Integration */}
      <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        mode={aiMode}
        initialClauseText={
          targetClauseIdx !== null ? clausulasModel[targetClauseIdx]?.conteudo : renderedText
        }
        contractFullText={renderedText}
        variablesData={dadosVariaveis}
        onAcceptImprovement={newText => {
          if (targetClauseIdx !== null) {
            const updated = [...clausulasModel];
            updated[targetClauseIdx].conteudo = newText;
            setClausulasModel(updated);
          } else {
            setRenderedText(newText);
          }
        }}
        onAcceptSuggestedClause={(title, content) => {
          const newClause: ClausulaModel = {
            id: `new_${Date.now()}`,
            titulo: title,
            conteudo: content,
            ordem: clausulasModel.length + 1
          };
          setClausulasModel([...clausulasModel, newClause]);
          setRenderedText(prev => `${prev}\n\n${title}\n${content}`);
        }}
      />
    </div>
  );
};
