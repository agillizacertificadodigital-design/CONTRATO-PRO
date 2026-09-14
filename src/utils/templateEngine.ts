import { PartesDados, ModeloContrato } from '../types';
import { qualificarParte, formatarMoeda, valorPorExtenso, getDataPorExtenso, formatarDataBR } from './formatters';

export interface RenderResult {
  conteudoFinal: string;
  pendencias: string[];
}

/**
 * Fallback resolver for variable tags when not directly present in map
 */
function resolverVariavelFallback(
  key: string,
  map: Record<string, string>,
  dadosVariaveis: Record<string, any>,
  contratante: PartesDados | null,
  contratado: PartesDados | null,
  fCidade: string,
  fEstado: string
): string | null {
  const lowerKey = key.toLowerCase();
  const parts = lowerKey.split('.');

  if (parts.length === 2) {
    const [prefix, prop] = parts;

    // 1. Contratante
    if (prefix === 'contratante') {
      if (!contratante) return 'Contratante';
      if (prop === 'razaosocial' || prop === 'nomefantasia') return contratante.razaoSocial || contratante.nome;
      if (prop === 'logradouro' || prop === 'endereco' || prop === 'rua') return contratante.endereco || 'Endereço não informado';
      if (prop === 'numero') return contratante.numero || 's/n';
      if (prop === 'complemento') return contratante.complemento || '';
      if (prop === 'bairro') return contratante.bairro || 'Centro';
      if (prop === 'cep') return contratante.cep || '00000-000';
      if (prop === 'cidade') return contratante.cidade || fCidade;
      if (prop === 'uf' || prop === 'estado') return contratante.estado || fEstado;
      if (prop === 'representantenome') return contratante.representanteLegal?.nome || (contratante.tipoPessoa === 'PF' ? contratante.nome : 'Representante Legal');
      if (prop === 'representantecpf') return contratante.representanteLegal?.cpf || (contratante.tipoPessoa === 'PF' ? (contratante.cpf || '') : '');
      if (prop === 'nacionalidade') return contratante.nacionalidade || 'brasileiro(a)';
      if (prop === 'estadocivil') return contratante.estadoCivil || 'solteiro(a)';
      if (prop === 'profissao') return contratante.profissao || 'autônomo(a)';
      if (prop === 'rg') return contratante.rg || '';
      if (prop === 'orgaorg' || prop === 'orgaoexpedidor') return contratante.orgaoExpedidor || 'SSP';
      if (prop === 'ufrg') return contratante.estado || fEstado;
      if (prop === 'cpf') return contratante.cpf || '';
      if (prop === 'cnpj') return contratante.cnpj || '';
    }

    // 2. Contratada / Contratado
    if (prefix === 'contratada' || prefix === 'contratado') {
      if (!contratado) return prefix === 'contratada' ? 'Contratada' : 'Contratado';
      const isFeminino = prefix === 'contratada';
      if (prop === 'nome') return contratado.tipoPessoa === 'PJ' ? (contratado.razaoSocial || contratado.nome) : contratado.nome;
      if (prop === 'razaosocial' || prop === 'nomefantasia') return contratado.razaoSocial || contratado.nome;
      if (prop === 'nacionalidade') return contratado.nacionalidade || (isFeminino ? 'brasileira' : 'brasileiro');
      if (prop === 'estadocivil') return contratado.estadoCivil || (isFeminino ? 'solteira' : 'solteiro');
      if (prop === 'profissao') return contratado.profissao || (isFeminino ? 'Prestadora de Serviços' : 'Prestador de Serviços');
      if (prop === 'rg') return contratado.rg || '';
      if (prop === 'orgaorg' || prop === 'orgaoexpedidor') return contratado.orgaoExpedidor || 'SSP';
      if (prop === 'ufrg') return contratado.estado || fEstado;
      if (prop === 'cpf') return contratado.cpf || '';
      if (prop === 'cnpj') return contratado.cnpj || '';
      if (prop === 'logradouro' || prop === 'endereco' || prop === 'rua') return contratado.endereco || 'Endereço residencial';
      if (prop === 'numero') return contratado.numero || 's/n';
      if (prop === 'complemento') return contratado.complemento || '';
      if (prop === 'bairro') return contratado.bairro || 'Bairro';
      if (prop === 'cep') return contratado.cep || '00000-000';
      if (prop === 'cidade') return contratado.cidade || fCidade;
      if (prop === 'uf' || prop === 'estado') return contratado.estado || fEstado;
    }

    // 3. Local do Serviço / Local de Trabalho
    if (prefix === 'localservico' || prefix === 'local_servico' || prefix === 'localtrabalho' || prefix === 'local') {
      if (prop === 'logradouro' || prop === 'endereco' || prop === 'rua') {
        return dadosVariaveis.localServicoLogradouro || dadosVariaveis.localLogradouro || contratante?.endereco || 'No endereço do Contratante';
      }
      if (prop === 'numero') return dadosVariaveis.localServicoNumero || contratante?.numero || 's/n';
      if (prop === 'complemento') return dadosVariaveis.localServicoComplemento || contratante?.complemento || '';
      if (prop === 'bairro') return dadosVariaveis.localServicoBairro || contratante?.bairro || 'Centro';
      if (prop === 'cep') return dadosVariaveis.localServicoCep || contratante?.cep || '00000-000';
      if (prop === 'cidade') return dadosVariaveis.localServicoCidade || contratante?.cidade || fCidade;
      if (prop === 'uf' || prop === 'estado') return dadosVariaveis.localServicoUf || contratante?.estado || fEstado;
    }

    // 4. Pagamento
    if (prefix === 'pagamento') {
      const valDiaria = parseFloat(dadosVariaveis.valorDiaria) || 180;
      if (prop === 'valordiaria' || prop === 'valor') return valDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      if (prop === 'valordiariaextenso' || prop === 'valorextenso') return valorPorExtenso(valDiaria);
      if (prop === 'formapagamento' || prop === 'forma') return dadosVariaveis.formaPagamento || 'PIX';
      if (prop === 'detalhes' || prop === 'detalhespagamento') return dadosVariaveis.detalhesPagamento || '';
    }

    // 5. Contrato
    if (prefix === 'contrato') {
      if (prop === 'datainicioextenso') return getDataPorExtenso(dadosVariaveis.dataInicio);
      if (prop === 'prazoavisodias') return String(dadosVariaveis.prazoAvisoDias || '30');
      if (prop === 'prazoavisoextenso') return dadosVariaveis.prazoAvisoExtenso || 'trinta dias';
      if (prop === 'datainicio') return formatarDataBR(dadosVariaveis.dataInicio);
      if (prop === 'datafim') return formatarDataBR(dadosVariaveis.dataFim);
      if (prop === 'dataextenso') return getDataPorExtenso();
    }

    // 6. Foro
    if (prefix === 'foro') {
      if (prop === 'cidade') return fCidade;
      if (prop === 'uf' || prop === 'estado') return fEstado;
    }

    // 7. Assinatura
    if (prefix === 'assinatura') {
      if (prop === 'cidade') return fCidade;
      if (prop === 'uf' || prop === 'estado') return fEstado;
      if (prop === 'dataextenso' || prop === 'data') return getDataPorExtenso();
    }
  }

  return null;
}

export function renderizarContrato(
  modelo: ModeloContrato,
  contratante: PartesDados | null,
  contratado: PartesDados | null,
  dadosVariaveis: Record<string, any>,
  foroCidade?: string,
  foroEstado?: string
): RenderResult {
  let texto = modelo.conteudo || '';
  const pendencias: string[] = [];

  // Check essential parties
  if (!contratante) {
    pendencias.push('Contratante não foi selecionado.');
  }
  if (!contratado) {
    pendencias.push('Contratado não foi selecionado.');
  }

  // Determine standard Foro
  const fCidade = foroCidade || dadosVariaveis['foroCidade'] || contratante?.cidade || contratado?.cidade || 'São Paulo';
  const fEstado = foroEstado || dadosVariaveis['foroEstado'] || contratante?.estado || contratado?.estado || 'SP';

  // Build mapping dictionary
  const map: Record<string, string> = {};

  // Contratante variables
  if (contratante) {
    const cNome = contratante.tipoPessoa === 'PJ' ? (contratante.razaoSocial || contratante.nome) : contratante.nome;
    const cEndereco = contratante.endereco || '';
    const cNumero = contratante.numero || 's/n';
    const cBairro = contratante.bairro || '';
    const cCep = contratante.cep || '';
    const cCidade = contratante.cidade || fCidade;
    const cEstado = contratante.estado || fEstado;

    map['contratante.qualificacao'] = qualificarParte(contratante);
    map['contratante.nome'] = cNome;
    map['contratante.razaoSocial'] = contratante.razaoSocial || cNome;
    map['contratante.nomeFantasia'] = contratante.nomeFantasia || cNome;
    map['contratante.cpf'] = contratante.cpf || '';
    map['contratante.cnpj'] = contratante.cnpj || '';
    map['contratante.rg'] = contratante.rg || '';
    map['contratante.orgaoRg'] = contratante.orgaoExpedidor || 'SSP';
    map['contratante.orgaoExpedidor'] = contratante.orgaoExpedidor || 'SSP';
    map['contratante.ufRg'] = cEstado;
    map['contratante.nacionalidade'] = contratante.nacionalidade || 'brasileiro(a)';
    map['contratante.estadoCivil'] = contratante.estadoCivil || 'solteiro(a)';
    map['contratante.profissao'] = contratante.profissao || 'autônomo(a)';
    map['contratante.logradouro'] = cEndereco || 'Endereço residencial/comercial';
    map['contratante.endereco'] = cEndereco || 'Endereço residencial/comercial';
    map['contratante.rua'] = cEndereco || 'Endereço residencial/comercial';
    map['contratante.numero'] = cNumero;
    map['contratante.complemento'] = contratante.complemento || '';
    map['contratante.bairro'] = cBairro || 'Centro';
    map['contratante.cep'] = cCep || '00000-000';
    map['contratante.cidade'] = cCidade;
    map['contratante.uf'] = cEstado;
    map['contratante.estado'] = cEstado;
    map['contratante.telefone'] = contratante.telefone || contratante.whatsApp || '';
    map['contratante.email'] = contratante.email || '';

    // Legal Representative
    const repNome = contratante.representanteLegal?.nome || (contratante.tipoPessoa === 'PF' ? cNome : 'Representante Legal');
    const repCpf = contratante.representanteLegal?.cpf || (contratante.tipoPessoa === 'PF' ? (contratante.cpf || '') : '');
    map['contratante.representanteNome'] = repNome;
    map['contratante.representanteCpf'] = repCpf;
    map['contratante.representanteRg'] = contratante.representanteLegal?.rg || '';
    map['contratante.representanteCargo'] = contratante.representanteLegal?.cargo || 'Representante Legal';

    map['contratante.enderecoCompleto'] = `${cEndereco || 'Endereço'}, nº ${cNumero}, ${cBairro || 'Bairro'}, CEP ${cCep || ''}, ${cCidade}/${cEstado}`;

    if (contratante.tipoPessoa === 'PF' && !contratante.cpf) {
      pendencias.push('CPF do contratante não preenchido.');
    }
    if (contratante.tipoPessoa === 'PJ' && !contratante.cnpj) {
      pendencias.push('CNPJ do contratante não preenchido.');
    }
  }

  // Contratado & Contratada variables (both masculine and feminine supported)
  if (contratado) {
    const dNome = contratado.tipoPessoa === 'PJ' ? (contratado.razaoSocial || contratado.nome) : contratado.nome;
    const dEndereco = contratado.endereco || '';
    const dNumero = contratado.numero || 's/n';
    const dBairro = contratado.bairro || '';
    const dCep = contratado.cep || '';
    const dCidade = contratado.cidade || fCidade;
    const dEstado = contratado.estado || fEstado;

    const qualif = qualificarParte(contratado);
    const endComp = `${dEndereco || 'Endereço'}, nº ${dNumero}, ${dBairro || 'Bairro'}, CEP ${dCep || ''}, ${dCidade}/${dEstado}`;

    const setPartyVars = (prefix: 'contratado' | 'contratada', fem: boolean) => {
      map[`${prefix}.qualificacao`] = qualif;
      map[`${prefix}.nome`] = dNome;
      map[`${prefix}.razaoSocial`] = contratado.razaoSocial || dNome;
      map[`${prefix}.nomeFantasia`] = contratado.nomeFantasia || dNome;
      map[`${prefix}.nacionalidade`] = contratado.nacionalidade || (fem ? 'brasileira' : 'brasileiro');
      map[`${prefix}.estadoCivil`] = contratado.estadoCivil || (fem ? 'solteira' : 'solteiro');
      map[`${prefix}.profissao`] = contratado.profissao || (fem ? 'Prestadora de Serviços' : 'Prestador de Serviços');
      map[`${prefix}.rg`] = contratado.rg || '';
      map[`${prefix}.orgaoRg`] = contratado.orgaoExpedidor || 'SSP';
      map[`${prefix}.orgaoExpedidor`] = contratado.orgaoExpedidor || 'SSP';
      map[`${prefix}.ufRg`] = dEstado;
      map[`${prefix}.cpf`] = contratado.cpf || '';
      map[`${prefix}.cnpj`] = contratado.cnpj || '';
      map[`${prefix}.logradouro`] = dEndereco || 'Endereço residencial';
      map[`${prefix}.endereco`] = dEndereco || 'Endereço residencial';
      map[`${prefix}.rua`] = dEndereco || 'Endereço residencial';
      map[`${prefix}.numero`] = dNumero;
      map[`${prefix}.complemento`] = contratado.complemento || '';
      map[`${prefix}.bairro`] = dBairro || 'Bairro';
      map[`${prefix}.cep`] = dCep || '00000-000';
      map[`${prefix}.cidade`] = dCidade;
      map[`${prefix}.uf`] = dEstado;
      map[`${prefix}.estado`] = dEstado;
      map[`${prefix}.telefone`] = contratado.telefone || contratado.whatsApp || '';
      map[`${prefix}.email`] = contratado.email || '';
      map[`${prefix}.enderecoCompleto`] = endComp;
    };

    setPartyVars('contratado', false);
    setPartyVars('contratada', true);

    if (contratado.tipoPessoa === 'PF' && !contratado.cpf) {
      pendencias.push('CPF da parte contratada não preenchido.');
    }
    if (contratado.tipoPessoa === 'PJ' && !contratado.cnpj) {
      pendencias.push('CNPJ da parte contratada não preenchido.');
    }
  }

  // Local do Serviço variables
  const lLogradouro = dadosVariaveis['localServicoLogradouro'] || dadosVariaveis['localLogradouro'] || contratante?.endereco || 'No endereço do Contratante';
  const lNumero = dadosVariaveis['localServicoNumero'] || contratante?.numero || 's/n';
  const lComplemento = dadosVariaveis['localServicoComplemento'] || contratante?.complemento || '';
  const lBairro = dadosVariaveis['localServicoBairro'] || contratante?.bairro || 'Centro';
  const lCep = dadosVariaveis['localServicoCep'] || contratante?.cep || '00000-000';
  const lCidade = dadosVariaveis['localServicoCidade'] || contratante?.cidade || fCidade;
  const lUf = dadosVariaveis['localServicoUf'] || contratante?.estado || fEstado;

  const setLocalVars = (prefix: string) => {
    map[`${prefix}.logradouro`] = lLogradouro;
    map[`${prefix}.endereco`] = lLogradouro;
    map[`${prefix}.rua`] = lLogradouro;
    map[`${prefix}.numero`] = lNumero;
    map[`${prefix}.complemento`] = lComplemento;
    map[`${prefix}.bairro`] = lBairro;
    map[`${prefix}.cep`] = lCep;
    map[`${prefix}.cidade`] = lCidade;
    map[`${prefix}.uf`] = lUf;
    map[`${prefix}.estado`] = lUf;
    map[`${prefix}.enderecoCompleto`] = `${lLogradouro}, nº ${lNumero}, ${lBairro}, CEP ${lCep}, ${lCidade}/${lUf}`;
  };

  setLocalVars('localServico');
  setLocalVars('local_servico');
  setLocalVars('localTrabalho');

  // Dynamic fields mapping
  const servicosList: string[] = dadosVariaveis['servicos'] || [];
  let servicosDesc = servicosList.join(', ');
  if (servicosList.includes('Outros') && dadosVariaveis['servicosOutros']) {
    servicosDesc = servicosDesc.replace('Outros', dadosVariaveis['servicosOutros']);
  }
  map['contrato.serviciosDescricao'] = servicosDesc || 'serviços de limpeza e organização';

  let periodicidadeFinal = dadosVariaveis['periodicidade'] || 'Eventual';
  if ((periodicidadeFinal.includes('Personalizada') || periodicidadeFinal.includes('especificar')) && dadosVariaveis['periodicidadePersonalizada']) {
    periodicidadeFinal = dadosVariaveis['periodicidadePersonalizada'];
  }
  map['contrato.periodicidade'] = periodicidadeFinal;
  const diasSemana: string[] = dadosVariaveis['diasSemana'] || [];
  map['contrato.diasSemana'] = diasSemana.join(', ') || 'conforme necessidade';

  map['contrato.horarioInicio'] = dadosVariaveis['horarioInicio'] || '08:00';
  map['contrato.horarioFim'] = dadosVariaveis['horarioFim'] || '17:00';

  // Valor e Pagamento
  const valDiaria = parseFloat(dadosVariaveis['valorDiaria']) || 180;
  const valDiariaFormatado = valDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const valDiariaExtenso = valorPorExtenso(valDiaria);

  map['contrato.valorDiaria'] = valDiariaFormatado;
  map['contrato.valorDiariaExtenso'] = valDiariaExtenso;
  map['contrato.valor'] = valDiariaFormatado;
  map['contrato.valorExtenso'] = valDiariaExtenso;

  map['pagamento.valorDiaria'] = valDiariaFormatado;
  map['pagamento.valorDiariaExtenso'] = valDiariaExtenso;
  map['pagamento.valor'] = valDiariaFormatado;
  map['pagamento.valorExtenso'] = valDiariaExtenso;
  map['pagamento.formaPagamento'] = dadosVariaveis['formaPagamento'] || 'PIX';
  map['pagamento.detalhes'] = dadosVariaveis['detalhesPagamento'] || '';

  map['contrato.formaPagamento'] = dadosVariaveis['formaPagamento'] || 'PIX';
  map['contrato.detalhesPagamento'] = dadosVariaveis['detalhesPagamento'] ? `(Chave/Dados: ${dadosVariaveis['detalhesPagamento']})` : '';

  // Prazo de aviso prévio
  const pAvisoDias = String(dadosVariaveis['prazoAvisoDias'] || '30');
  const pAvisoExtenso = dadosVariaveis['prazoAvisoExtenso'] || 'trinta dias';
  map['contrato.prazoAvisoDias'] = pAvisoDias;
  map['contrato.prazoAvisoExtenso'] = pAvisoExtenso;

  // Data de Início e Término
  const dInicio = formatarDataBR(dadosVariaveis['dataInicio']);
  const dInicioExtenso = getDataPorExtenso(dadosVariaveis['dataInicio']);
  map['contrato.dataInicio'] = dInicio || formatarDataBR(new Date().toISOString());
  map['contrato.dataInicioExtenso'] = dInicioExtenso || getDataPorExtenso();

  // Conditional Rules
  const haverTransporte = dadosVariaveis['haverAuxilioTransporte'] === 'SIM' || dadosVariaveis['haverAuxilioTransporte'] === true;
  const valTransp = parseFloat(dadosVariaveis['valorAuxilioTransporte']) || 0;
  map['contrato.clausulaAuxilioTransporte'] = haverTransporte
    ? `O(A) CONTRATANTE concederá ao(à) CONTRATADO(A) auxílio-transporte no valor diário de R$ ${valTransp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
    : 'O(A) CONTRATADO(A) declara que não necessita de auxílio-transporte fornecido pelo(a) CONTRATANTE.';

  const haverAlimentacao = dadosVariaveis['haverAuxilioAlimentacao'] === 'SIM' || dadosVariaveis['haverAuxilioAlimentacao'] === true;
  const valAlim = parseFloat(dadosVariaveis['valorAuxilioAlimentacao']) || 0;
  map['contrato.clausulaAuxilioAlimentacao'] = haverAlimentacao
    ? `O(A) CONTRATANTE fornecerá ao(à) CONTRATADO(A) auxílio-alimentação/refeição no valor de R$ ${valAlim.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por dia trabalhado.`
    : 'Não haverá concessão de auxílio-alimentação em pecúnia.';

  // Prazo
  const tipoPrazo = dadosVariaveis['tipoPrazo'] || 'Indeterminado';
  if (tipoPrazo === 'Determinado') {
    const dFim = formatarDataBR(dadosVariaveis['dataFim']);
    map['contrato.clausulaPrazo'] = `O presente contrato é firmado por prazo determinado, vigendo de ${dInicio || '[DATA INÍCIO]'} até ${dFim || '[DATA FIM]'}, podendo ser renovado por mútuo acordo das partes.`;
    map['contrato.clausulaRescisao'] = `Durante a vigência do prazo determinado, qualquer das partes poderá rescindir o contrato mediante aviso prévio por escrito com antecedência mínima de ${pAvisoDias} (${pAvisoExtenso}).`;
  } else {
    map['contrato.clausulaPrazo'] = `O presente contrato vigorará por prazo indeterminado, com início a partir de ${dInicio || '[DATA INÍCIO]'}.`;
    map['contrato.clausulaRescisao'] = `Por se tratar de contrato por prazo indeterminado, qualquer das partes poderá rescindi-lo sem justa causa a qualquer tempo, mediante aviso prévio por escrito com antecedência de ${pAvisoDias} (${pAvisoExtenso}).`;
  }

  // Multa
  const haverMulta = dadosVariaveis['haverMulta'] === 'SIM' || dadosVariaveis['haverMulta'] === true;
  const valMulta = dadosVariaveis['valorMulta'] || 'R$ 200,00';
  map['contrato.clausulaMulta'] = haverMulta
    ? `A parte que descumprir quaisquer cláusulas estabelecidas neste contrato ou rescindir o contrato sem o aviso prévio estipulado ficará sujeita ao pagamento de multa no valor de ${valMulta} em favor da parte prejudicada.`
    : 'Não é estipulada multa rescisória, respondendo as partes apenas por eventuais perdas e danos comprovados.';

  // Foro
  map['contrato.foroCidade'] = fCidade;
  map['contrato.foroEstado'] = fEstado;
  map['foro.cidade'] = fCidade;
  map['foro.uf'] = fEstado;
  map['foro.estado'] = fEstado;
  map['foro.comarca'] = fCidade;

  // Assinatura
  const dataHojeExtenso = getDataPorExtenso();
  map['contrato.dataExtenso'] = dataHojeExtenso;
  map['assinatura.cidade'] = fCidade;
  map['assinatura.uf'] = fEstado;
  map['assinatura.estado'] = fEstado;
  map['assinatura.dataExtenso'] = dataHojeExtenso;

  // Testemunhas
  const t1Nome = dadosVariaveis['testemunha1Nome'];
  const t1Cpf = dadosVariaveis['testemunha1Cpf'];
  const t2Nome = dadosVariaveis['testemunha2Nome'];
  const t2Cpf = dadosVariaveis['testemunha2Cpf'];

  let testSec = '';
  if (t1Nome || t2Nome) {
    testSec = '\nTESTEMUNHAS:\n\n';
    if (t1Nome) testSec += `1) _____________________________________\n   Nome: ${t1Nome}\n   CPF: ${t1Cpf || '[NÃO INFORMADO]'}\n\n`;
    if (t2Nome) testSec += `2) _____________________________________\n   Nome: ${t2Nome}\n   CPF: ${t2Cpf || '[NÃO INFORMADO]'}\n`;
  } else {
    testSec = '\nTESTEMUNHAS:\n\n1) _____________________________________\n   Nome:\n   CPF:\n\n2) _____________________________________\n   Nome:\n   CPF:';
  }
  map['contrato.secaoTestemunhas'] = testSec;

  // Custom variables from settings
  if (dadosVariaveis['customVars']) {
    Object.entries(dadosVariaveis['customVars']).forEach(([k, v]) => {
      map[k] = String(v);
    });
  }

  // Replace all {{key}} tags
  let rendered = texto.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
    // 1. Direct hit in map
    if (map[key] !== undefined && map[key] !== '') {
      return map[key];
    }
    // 2. Direct hit in dadosVariaveis
    if (dadosVariaveis[key] !== undefined && dadosVariaveis[key] !== '') {
      return String(dadosVariaveis[key]);
    }
    // 3. Fallback resolution
    const resolved = resolverVariavelFallback(key, map, dadosVariaveis, contratante, contratado, fCidade, fEstado);
    if (resolved !== null && resolved !== undefined && resolved !== '') {
      return resolved;
    }

    pendencias.push(`Variável {{${key}}} não preenchida.`);
    return `[${key.toUpperCase()} PENDENTE]`;
  });

  return {
    conteudoFinal: rendered,
    pendencias: Array.from(new Set(pendencias))
  };
}

