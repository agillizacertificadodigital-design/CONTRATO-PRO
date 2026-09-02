import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Edit2, Trash2, Building, User, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { getContratados, createContratado, updateContratado, deleteContratado } from '../services/contratadosService';
import { buscarCep, buscarCnpj } from '../services/viaCepService';
import { PartesDados } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatarCPF, formatarCNPJ, formatarCEP } from '../utils/formatters';

interface ContratadosPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export const ContratadosPage: React.FC<ContratadosPageProps> = () => {
  const { currentUser } = useAuth();
  const [list, setList] = useState<PartesDados[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'PF' | 'PJ'>('TODOS');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PartesDados>({
    tipoPessoa: 'PF',
    nome: '',
    cpf: '',
    rg: '',
    orgaoExpedidor: '',
    nacionalidade: 'Brasileiro(a)',
    estadoCivil: 'Solteiro(a)',
    profissao: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    representanteLegal: { nome: '', cpf: '', cargo: '' },
    telefone: '',
    whatsApp: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  const loadData = async () => {
    setLoading(true);
    const data = await getContratados();
    setList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (item?: PartesDados) => {
    if (item) {
      setEditingId(item.id || null);
      setFormData({
        ...item,
        representanteLegal: item.representanteLegal || { nome: '', cpf: '', cargo: '' }
      });
    } else {
      setEditingId(null);
      setFormData({
        tipoPessoa: 'PF',
        nome: '',
        cpf: '',
        rg: '',
        orgaoExpedidor: '',
        nacionalidade: 'Brasileiro(a)',
        estadoCivil: 'Solteiro(a)',
        profissao: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        inscricaoEstadual: '',
        inscricaoMunicipal: '',
        representanteLegal: { nome: '', cpf: '', cargo: '' },
        telefone: '',
        whatsApp: '',
        email: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCepLookup = async () => {
    if (!formData.cep) {
      alert('Por favor, informe o CEP.');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await buscarCep(formData.cep);
      if (res) {
        setFormData(prev => ({
          ...prev,
          endereco: res.logradouro || prev.endereco,
          bairro: res.bairro || prev.bairro,
          cidade: res.localidade || prev.cidade,
          estado: res.uf || prev.estado
        }));
      } else {
        alert('CEP não localizado. Preencha o endereço manualmente.');
      }
    } catch (err) {
      console.warn('Erro ao consultar CEP:', err);
      alert('Não foi possível consultar o CEP no momento. Preencha manualmente.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCnpjLookup = async () => {
    const clean = (formData.cnpj || '').replace(/\D/g, '');
    if (clean.length !== 14) {
      alert('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await buscarCnpj(formData.cnpj);
      if (res) {
        setFormData(prev => ({
          ...prev,
          razaoSocial: res.razao_social || prev.razaoSocial,
          nomeFantasia: res.nome_fantasia || prev.nomeFantasia,
          nome: res.razao_social || prev.nome,
          telefone: res.ddd_telefone_1 || prev.telefone,
          email: res.email || prev.email,
          cep: res.cep ? formatarCEP(res.cep) : prev.cep,
          endereco: res.logradouro || prev.endereco,
          numero: res.numero || prev.numero,
          complemento: res.complemento || prev.complemento,
          bairro: res.bairro || prev.bairro,
          cidade: res.municipio || prev.cidade,
          estado: res.uf || prev.estado
        }));
      } else {
        alert('CNPJ não encontrado. Por favor, preencha os dados da empresa manualmente.');
      }
    } catch (err) {
      console.warn('Erro ao buscar CNPJ:', err);
      alert('Não foi possível buscar o CNPJ automaticamente. Preencha os campos manualmente.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() && !formData.razaoSocial?.trim()) return;

    setSaving(true);
    try {
      const finalName = formData.tipoPessoa === 'PJ' ? (formData.razaoSocial || formData.nome) : formData.nome;
      const payload = {
        ...formData,
        nome: finalName
      };

      if (editingId) {
        await updateContratado(editingId, payload);
      } else {
        await createContratado(payload, currentUser?.uid || 'user');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contratado?')) return;
    await deleteContratado(id);
    await loadData();
  };

  const filteredList = list.filter(item => {
    const q = search.toLowerCase();
    const matchSearch =
      item.nome.toLowerCase().includes(q) ||
      (item.cpf && item.cpf.includes(q)) ||
      (item.cnpj && item.cnpj.includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q));

    const matchTipo = filterTipo === 'TODOS' || item.tipoPessoa === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm backdrop-blur-xs transition-colors duration-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            Cadastro de Contratados
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre prestadores de serviços, profissionais autônomos ou empresas contratadas com autopreenchimento
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-900/20 flex items-center gap-2 shrink-0 border border-blue-400/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Contratado
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, CNPJ ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg shrink-0 text-xs">
          <button
            onClick={() => setFilterTipo('TODOS')}
            className={`px-3 py-1 rounded-md font-semibold ${filterTipo === 'TODOS' ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterTipo('PF')}
            className={`px-3 py-1 rounded-md font-semibold ${filterTipo === 'PF' ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}
          >
            Pessoa Física (PF)
          </button>
          <button
            onClick={() => setFilterTipo('PJ')}
            className={`px-3 py-1 rounded-md font-semibold ${filterTipo === 'PJ' ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}
          >
            Pessoa Jurídica (PJ)
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-400 text-center py-8">Carregando contratados...</p>
      ) : filteredList.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-400">
          Nenhum contratado encontrado. Clique em &quot;Novo Contratado&quot; para cadastrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg text-xs font-bold ${
                      item.tipoPessoa === 'PJ'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    }`}>
                      {item.tipoPessoa === 'PJ' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </span>
                    <div>
                      <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {item.nome}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {item.tipoPessoa === 'PJ' ? `CNPJ: ${item.cnpj || 'N/A'}` : `CPF: ${item.cpf || 'N/A'}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {item.tipoPessoa}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {item.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </p>
                  )}
                  {item.telefone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{item.telefone}</span>
                    </p>
                  )}
                  {item.cidade && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{item.cidade}/{item.estado}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => handleOpenModal(item)}
                  className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md flex items-center gap-1 font-medium"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(item.id!)}
                  className="px-2.5 py-1 text-xs bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-md flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              {editingId ? 'Editar Contratado' : 'Novo Contratado'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Tipo de Pessoa:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="tipoPessoa"
                      value="PF"
                      checked={formData.tipoPessoa === 'PF'}
                      onChange={() => setFormData({ ...formData, tipoPessoa: 'PF' })}
                    />
                    Pessoa Física (PF)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="tipoPessoa"
                      value="PJ"
                      checked={formData.tipoPessoa === 'PJ'}
                      onChange={() => setFormData({ ...formData, tipoPessoa: 'PJ' })}
                    />
                    Pessoa Jurídica (PJ)
                  </label>
                </div>
              </div>

              {formData.tipoPessoa === 'PF' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">CPF *</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: formatarCPF(e.target.value) })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">RG & Órgão Expedidor</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="RG"
                        value={formData.rg}
                        onChange={e => setFormData({ ...formData, rg: e.target.value })}
                        className="w-2/3 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                      <input
                        type="text"
                        placeholder="SSP/SP"
                        value={formData.orgaoExpedidor}
                        onChange={e => setFormData({ ...formData, orgaoExpedidor: e.target.value })}
                        className="w-1/3 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nacionalidade & Estado Civil</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Brasileiro(a)"
                        value={formData.nacionalidade}
                        onChange={e => setFormData({ ...formData, nacionalidade: e.target.value })}
                        className="w-1/2 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                      <input
                        type="text"
                        placeholder="Solteiro(a)"
                        value={formData.estadoCivil}
                        onChange={e => setFormData({ ...formData, estadoCivil: e.target.value })}
                        className="w-1/2 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Profissão / Função</label>
                    <input
                      type="text"
                      placeholder="Ex: Diarista / Prestador(a)"
                      value={formData.profissao}
                      onChange={e => setFormData({ ...formData, profissao: e.target.value })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              )}

              {formData.tipoPessoa === 'PJ' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">CNPJ *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="00.000.000/0000-00"
                        value={formData.cnpj}
                        onChange={e => setFormData({ ...formData, cnpj: formatarCNPJ(e.target.value) })}
                        className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                      />
                      <button
                        type="button"
                        onClick={handleCnpjLookup}
                        disabled={lookupLoading}
                        className="px-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 shrink-0 font-semibold"
                      >
                        {lookupLoading ? '...' : 'CNPJ'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={formData.razaoSocial}
                      onChange={e => setFormData({ ...formData, razaoSocial: e.target.value, nome: e.target.value })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      value={formData.nomeFantasia}
                      onChange={e => setFormData({ ...formData, nomeFantasia: e.target.value })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Inscrições</label>
                    <input
                      type="text"
                      placeholder="IE / IM"
                      value={formData.inscricaoEstadual}
                      onChange={e => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value, whatsApp: e.target.value })}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">CEP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={e => setFormData({ ...formData, cep: formatarCEP(e.target.value) })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                    <button
                      type="button"
                      onClick={handleCepLookup}
                      disabled={lookupLoading}
                      className="px-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 border rounded-lg font-semibold shrink-0"
                    >
                      CEP
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Número / Comp.</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nº"
                      value={formData.numero}
                      onChange={e => setFormData({ ...formData, numero: e.target.value })}
                      className="w-1/2 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                    <input
                      type="text"
                      placeholder="Comp"
                      value={formData.complemento}
                      onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                      className="w-1/2 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Cidade / Estado</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={formData.cidade}
                      onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                      className="w-3/4 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      value={formData.estado}
                      onChange={e => setFormData({ ...formData, estado: e.target.value })}
                      className="w-1/4 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Contratado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
