import { PartesDados, ModeloContrato, RegraCondicional } from '../types';
import { qualificarParte, formatarMoeda, valorPorExtenso, getDataPorExtenso, formatarDataBR } from './formatters';

export interface RenderResult {
  conteudoFinal: string;
  pendencias: string[];
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

  // Build mapping dictionary
  const map: Record<string, string> = {};

  // Contratante variables
  if (contratante) {
    map['contratante.qualificacao'] = qualificarParte(contratante);
    map['contratante.nome'] = contratante.tipoPessoa === 'PJ' ? (contratante.razaoSocial || contratante.nome) : contratante.nome;
    map['contratante.cpf'] = contratante.cpf || '';
    map['contratante.cnpj'] = contratante.cnpj || '';
    map['contratante.rg'] = contratante.rg || '';
    map['contratante.enderecoCompleto'] = `${contratante.endereco || ''}, nº ${contratante.numero || 's/n'}, ${contratante.bairro || ''}, CEP ${contratante.cep || ''}, ${contratante.cidade || ''}/${contratante.estado || ''}`;

    if (contratante.tipoPessoa === 'PF' && !contratante.cpf) {
      pendencias.push('CPF do contratante não preenchido.');
    }
    if (contratante.tipoPessoa === 'PJ' && !contratante.cnpj) {
      pendencias.push('CNPJ do contratante não preenchido.');
    }
  }

  // Contratado variables
  if (contratado) {
    map['contratado.qualificacao'] = qualificarParte(contratado);
    map['contratado.nome'] = contratado.tipoPessoa === 'PJ' ? (contratado.razaoSocial || contratado.nome) : contratado.nome;
    map['contratado.cpf'] = contratado.cpf || '';
    map['contratado.cnpj'] = contratado.cnpj || '';
    map['contratado.rg'] = contratado.rg || '';
    map['contratado.enderecoCompleto'] = `${contratado.endereco || ''}, nº ${contratado.numero || 's/n'}, ${contratado.bairro || ''}, CEP ${contratado.cep || ''}, ${contratado.cidade || ''}/${contratado.estado || ''}`;

    if (contratado.tipoPessoa === 'PF' && !contratado.cpf) {
      pendencias.push('CPF do contratado não preenchido.');
    }
    if (contratado.tipoPessoa === 'PJ' && !contratado.cnpj) {
      pendencias.push('CNPJ do contratado não preenchido.');
    }
  }

  // Dynamic fields mapping
  const servicosList: string[] = dadosVariaveis['servicos'] || [];
  let servicosDesc = servicosList.join(', ');
  if (servicosList.includes('Outros') && dadosVariaveis['servicosOutros']) {
    servicosDesc = servicosDesc.replace('Outros', dadosVariaveis['servicosOutros']);
  }
  if (!servicosDesc && modelo.nome.toLowerCase().includes('diarista')) {
    pendencias.push('Serviços inclusos não informados.');
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

  const valDiaria = parseFloat(dadosVariaveis['valorDiaria']) || 0;
  if (valDiaria <= 0 && modelo.nome.toLowerCase().includes('diarista')) {
    pendencias.push('Valor da diária não informado.');
  }
  map['contrato.valorDiaria'] = valDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  map['contrato.valorDiariaExtenso'] = valorPorExtenso(valDiaria);

  map['contrato.formaPagamento'] = dadosVariaveis['formaPagamento'] || 'PIX';
  map['contrato.detalhesPagamento'] = dadosVariaveis['detalhesPagamento'] ? `(Chave/Dados: ${dadosVariaveis['detalhesPagamento']})` : '';

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
    const dInicio = formatarDataBR(dadosVariaveis['dataInicio']);
    const dFim = formatarDataBR(dadosVariaveis['dataFim']);
    if (!dadosVariaveis['dataInicio']) pendencias.push('Data de início do contrato não informada.');
    if (!dadosVariaveis['dataFim']) pendencias.push('Data de término do contrato determinado não informada.');
    map['contrato.clausulaPrazo'] = `O presente contrato é firmado por prazo determinado, vigendo de ${dInicio || '[DATA INÍCIO]'} até ${dFim || '[DATA FIM]'}, podendo ser renovado por mútuo acordo das partes.`;
    map['contrato.clausulaRescisao'] = `Durante a vigência do prazo determinado, qualquer das partes poderá rescindir o contrato mediante aviso prévio por escrito com antecedência mínima de 15 (quinze) dias.`;
  } else {
    const dInicio = formatarDataBR(dadosVariaveis['dataInicio']);
    if (!dadosVariaveis['dataInicio']) pendencias.push('Data de início do contrato não informada.');
    map['contrato.clausulaPrazo'] = `O presente contrato vigorará por prazo indeterminado, com início a partir de ${dInicio || '[DATA INÍCIO]'}.`;
    map['contrato.clausulaRescisao'] = `Por se tratar de contrato por prazo indeterminado, qualquer das partes poderá rescindi-lo sem justa causa a qualquer tempo, mediante aviso prévio por escrito com antecedência de 7 (sete) dias.`;
  }

  // Multa
  const haverMulta = dadosVariaveis['haverMulta'] === 'SIM' || dadosVariaveis['haverMulta'] === true;
  const valMulta = dadosVariaveis['valorMulta'] || 'R$ 200,00';
  map['contrato.clausulaMulta'] = haverMulta
    ? `A parte que descumprir quaisquer cláusulas estabelecidas neste contrato ou rescindir o contrato sem o aviso prévio estipulado ficará sujeita ao pagamento de multa no valor de ${valMulta} em favor da parte prejudicada.`
    : 'Não é estipulada multa rescisória, respondendo as partes apenas por eventuais perdas e danos comprovados.';

  // Foro
  const fCidade = foroCidade || dadosVariaveis['foroCidade'] || contratante?.cidade || 'São Paulo';
  const fEstado = foroEstado || dadosVariaveis['foroEstado'] || contratante?.estado || 'SP';
  if (!fCidade || !fEstado) {
    pendencias.push('Foro do contrato não informado.');
  }
  map['contrato.foroCidade'] = fCidade;
  map['contrato.foroEstado'] = fEstado;
  map['contrato.dataExtenso'] = getDataPorExtenso();

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
    if (map[key] !== undefined) {
      return map[key];
    }
    // Check inside custom dynamic values
    if (dadosVariaveis[key] !== undefined) {
      return String(dadosVariaveis[key]);
    }
    pendencias.push(`Variável {{${key}}} não preenchida.`);
    return `[${key.toUpperCase()} PENDENTE]`;
  });

  return {
    conteudoFinal: rendered,
    pendencias: Array.from(new Set(pendencias))
  };
}
