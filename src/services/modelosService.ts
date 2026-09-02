import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ModeloContrato } from '../types';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';

const COLLECTION_NAME = 'modelos';

export const MODELO_DIARISTA_PADRAO: Omit<ModeloContrato, 'id'> = {
  nome: 'Contrato de Prestação de Serviço de Diarista',
  categoria: 'Prestação de Serviços',
  descricao: 'Modelo completo para contratação de diarista sem vínculo empregatício, com definição de tarefas, dias, horários, remuneração, auxílios e penalidades.',
  conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DIARISTA

IDENTIFICAÇÃO DAS PARTES

CONTRATANTE:
{{contratante.qualificacao}}

CONTRATADO(A):
{{contratado.qualificacao}}

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços de Diarista, que se regerá pelas cláusulas e condições a seguir expostas:

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação autônoma de serviços de limpeza e conservação residencial/comercial pelo(a) CONTRATADO(A) em favor do(a) CONTRATANTE.

Os serviços contratados englobam: {{contrato.serviciosDescricao}}.

CLÁUSULA SEGUNDA - DA PRESTAÇÃO DE SERVIÇOS
A prestação dos serviços ocorrerá de forma eventual e sem habitualidade de vínculo de emprego, respeitando a periodicidade de: {{contrato.periodicidade}} (dias: {{contrato.diasSemana}}), no horário das {{contrato.horarioInicio}} às {{contrato.horarioFim}}.

CLÁUSULA TERCEIRA - DA REMUNERAÇÃO E FORMA DE PAGAMENTO
Pela prestação dos serviços contratados, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) o valor diário de R$ {{contrato.valorDiaria}} ({{contrato.valorDiariaExtenso}}) por diária realizada.

O pagamento será efetuado por meio de {{contrato.formaPagamento}} {{contrato.detalhesPagamento}}, ao final de cada dia trabalhado ou conforme ajustado entre as partes.

{{contrato.clausulaAuxilioTransporte}}
{{contrato.clausulaAuxilioAlimentacao}}

CLÁUSULA QUARTA - DO LOCAL DE TRABALHO
Os serviços serão prestados no seguinte endereço: {{contratante.enderecoCompleto}}.

CLÁUSULA QUINTA - DA AUSÊNCIA DE VÍNCULO TRABALHISTA
As partes declaram expressamente que a relação jurídica estabelecida por este instrumento é de natureza estritamente civil e autônoma, sem qualquer vínculo empregatício nos termos da Consolidação das Leis do Trabalho (CLT), tendo em vista a não habitualidade e a autonomia na execução dos serviços.

CLÁUSULA SEXTA - DAS OBRIGAÇÕES DAS PARTES
São obrigações do(a) CONTRATADO(A):
a) Executar os serviços com zelo, atenção, assiduidade e pontualidade;
b) Zelar pelos materiais, móveis e equipamentos do(a) CONTRATANTE;
c) Manter sigilo sobre fatos e documentos da residência/empresa do(a) CONTRATANTE.

São obrigações do(a) CONTRATANTE:
a) Fornecer os produtos e instrumentos de limpeza adequados para a realização dos serviços;
b) Efetuar o pagamento da remuneração acordada na forma e prazo estabelecidos neste contrato;
c) Garantir ambiente de trabalho seguro e respeitoso.

CLÁUSULA SÉTIMA - DO PRAZO DO CONTRATO
{{contrato.clausulaPrazo}}

CLÁUSULA OITAVA - DA RESCISÃO
{{contrato.clausulaRescisao}}

CLÁUSULA NÓNA - DAS PENALIDADES E MULTA
{{contrato.clausulaMulta}}

CLÁUSULA DÉCIMA - DAS CONSIDERAÇÕES FINAIS
Qualquer alteração neste contrato deverá ser feita por meio de termo aditivo por escrito, assinado por ambas as partes.

CLÁUSULA DÉCIMA PRIMEIRA - DO FORO
Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de {{contrato.foroCidade}}/{{contrato.foroEstado}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas.

{{contrato.foroCidade}}/{{contrato.foroEstado}}, {{contrato.dataExtenso}}.


________________________________________
CONTRATANTE: {{contratante.nome}}

________________________________________
CONTRATADO(A): {{contratado.nome}}

{{contrato.secaoTestemunhas}}`,
  clausulas: [
    { id: 'c1', titulo: 'CLÁUSULA PRIMEIRA - DO OBJETO', conteudo: 'O presente contrato tem por objeto a prestação autônoma de serviços de limpeza e conservação residencial/comercial pelo(a) CONTRATADO(A) em favor do(a) CONTRATANTE.\nOs serviços contratados englobam: {{contrato.serviciosDescricao}}.', ordem: 1, obrigatoria: true },
    { id: 'c2', titulo: 'CLÁUSULA SEGUNDA - DA PRESTAÇÃO DE SERVIÇOS', conteudo: 'A prestação dos serviços ocorrerá de forma eventual e sem habitualidade de vínculo de emprego, respeitando a periodicidade de: {{contrato.periodicidade}} (dias: {{contrato.diasSemana}}), no horário das {{contrato.horarioInicio}} às {{contrato.horarioFim}}.', ordem: 2, obrigatoria: true },
    { id: 'c3', titulo: 'CLÁUSULA TERCEIRA - DA REMUNERAÇÃO E FORMA DE PAGAMENTO', conteudo: 'Pela prestação dos serviços contratados, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) o valor diário de R$ {{contrato.valorDiaria}} por diária realizada.\nO pagamento será efetuado por meio de {{contrato.formaPagamento}} {{contrato.detalhesPagamento}}, ao final de cada dia trabalhado.', ordem: 3, obrigatoria: true },
    { id: 'c4', titulo: 'CLÁUSULA QUARTA - DO LOCAL DE TRABALHO', conteudo: 'Os serviços serão prestados no seguinte endereço: {{contratante.enderecoCompleto}}.', ordem: 4, obrigatoria: true },
    { id: 'c5', titulo: 'CLÁUSULA QUINTA - DA AUSÊNCIA DE VÍNCULO TRABALHISTA', conteudo: 'As partes declaram expressamente que a relação jurídica estabelecida por este instrumento é de natureza estritamente civil e autônoma, sem qualquer vínculo empregatício nos termos da CLT.', ordem: 5, obrigatoria: true },
    { id: 'c6', titulo: 'CLÁUSULA SEXTA - DAS OBRIGAÇÕES DAS PARTES', conteudo: 'O CONTRATADO compromete-se a prestar os serviços com atenção e qualidade. O CONTRATANTE compromete-se a fornecer materiais adequados e efetuar os pagamentos em dia.', ordem: 6, obrigatoria: true },
    { id: 'c7', titulo: 'CLÁUSULA SÉTIMA - DO PRAZO DO CONTRATO', conteudo: '{{contrato.clausulaPrazo}}', ordem: 7, obrigatoria: true },
    { id: 'c8', titulo: 'CLÁUSULA OITAVA - DA RESCISÃO', conteudo: '{{contrato.clausulaRescisao}}', ordem: 8, obrigatoria: true },
    { id: 'c9', titulo: 'CLÁUSULA NÓNA - DAS PENALIDADES E MULTA', conteudo: '{{contrato.clausulaMulta}}', ordem: 9, obrigatoria: true },
    { id: 'c10', titulo: 'CLÁUSULA DÉCIMA - DAS CONSIDERAÇÕES FINAIS', conteudo: 'Qualquer alteração neste contrato deverá ser feita por meio de termo aditivo escrito.', ordem: 10, obrigatoria: true },
    { id: 'c11', titulo: 'CLÁUSULA DÉCIMA PRIMEIRA - DO FORO', conteudo: 'As partes elegem o foro da Comarca de {{contrato.foroCidade}}/{{contrato.foroEstado}}.', ordem: 11, obrigatoria: true }
  ],
  variaveis: [
    'contratante.qualificacao',
    'contratado.qualificacao',
    'contratante.nome',
    'contratado.nome',
    'contratante.enderecoCompleto',
    'contrato.serviciosDescricao',
    'contrato.periodicidade',
    'contrato.diasSemana',
    'contrato.horarioInicio',
    'contrato.horarioFim',
    'contrato.valorDiaria',
    'contrato.formaPagamento',
    'contrato.detalhesPagamento',
    'contrato.clausulaAuxilioTransporte',
    'contrato.clausulaAuxilioAlimentacao',
    'contrato.clausulaPrazo',
    'contrato.clausulaRescisao',
    'contrato.clausulaMulta',
    'contrato.foroCidade',
    'contrato.foroEstado',
    'contrato.dataExtenso',
    'contrato.secaoTestemunhas'
  ],
  camposDinamicos: [
    {
      id: 'f1',
      chave: 'servicos',
      label: 'Serviços Inclusos',
      tipo: 'multipla_escolha',
      opcoes: ['Limpeza interna', 'Limpeza externa', 'Lavar roupas', 'Passar roupas', 'Guardar roupas', 'Lavar louça', 'Organização geral', 'Outros'],
      obrigatorio: true
    },
    {
      id: 'f2',
      chave: 'servicosOutros',
      label: 'Descrição de Outros Serviços (se selecionado "Outros")',
      tipo: 'texto',
      obrigatorio: false
    },
    {
      id: 'f3',
      chave: 'periodicidade',
      label: 'Periodicidade',
      tipo: 'selecao',
      opcoes: [
        'Uma vez por semana',
        'Duas vezes por semana',
        'Três vezes por semana',
        'Quatro vezes por semana',
        'Cinco vezes por semana (dias úteis)',
        'Diária (segunda a sexta-feira)',
        'Diária contínua (segunda a sábado)',
        'Finais de semana (sábado e domingo)',
        'Quinzenal (a cada 15 dias)',
        'Mensal (uma vez ao mês)',
        'Bimestral (a cada 2 meses)',
        'Trimestral (a cada 3 meses)',
        'Semestral',
        'Anual',
        'Eventual / Sob demanda',
        'Por horas trabalhadas (horista)',
        'Por diárias avulsas',
        'Por projeto / Por entrega de etapas',
        'Escala 12x36 / Plantão',
        'Personalizada (especificar)'
      ],
      obrigatorio: true,
      valorPadrao: 'Uma vez por semana'
    },
    {
      id: 'f4',
      chave: 'diasSemana',
      label: 'Dias da Semana',
      tipo: 'multipla_escolha',
      opcoes: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'],
      obrigatorio: true
    },
    {
      id: 'f5',
      chave: 'horarioInicio',
      label: 'Horário Inicial',
      tipo: 'hora',
      obrigatorio: true,
      valorPadrao: '08:00'
    },
    {
      id: 'f6',
      chave: 'horarioFim',
      label: 'Horário Final',
      tipo: 'hora',
      obrigatorio: true,
      valorPadrao: '17:00'
    },
    {
      id: 'f7',
      chave: 'valorDiaria',
      label: 'Valor da Diária (R$)',
      tipo: 'moeda',
      obrigatorio: true,
      valorPadrao: 180.00
    },
    {
      id: 'f8',
      chave: 'formaPagamento',
      label: 'Forma de Pagamento',
      tipo: 'selecao',
      opcoes: ['PIX', 'Dinheiro', 'Transferência bancária', 'Depósito bancário', 'Outro'],
      obrigatorio: true,
      valorPadrao: 'PIX'
    },
    {
      id: 'f9',
      chave: 'detalhesPagamento',
      label: 'Chave PIX / Dados Bancários para Pagamento',
      tipo: 'texto',
      obrigatorio: false
    },
    {
      id: 'f10',
      chave: 'haverAuxilioTransporte',
      label: 'Haverá Auxílio Transporte?',
      tipo: 'sim_nao',
      obrigatorio: true,
      valorPadrao: 'SIM'
    },
    {
      id: 'f11',
      chave: 'valorAuxilioTransporte',
      label: 'Valor do Auxílio Transporte (R$)',
      tipo: 'moeda',
      obrigatorio: false,
      valorPadrao: 20.00
    },
    {
      id: 'f12',
      chave: 'haverAuxilioAlimentacao',
      label: 'Haverá Auxílio Alimentação?',
      tipo: 'sim_nao',
      obrigatorio: true,
      valorPadrao: 'NAO'
    },
    {
      id: 'f13',
      chave: 'valorAuxilioAlimentacao',
      label: 'Valor do Auxílio Alimentação (R$)',
      tipo: 'moeda',
      obrigatorio: false
    },
    {
      id: 'f14',
      chave: 'tipoPrazo',
      label: 'Tipo de Prazo do Contrato',
      tipo: 'selecao',
      opcoes: ['Indeterminado', 'Determinado'],
      obrigatorio: true,
      valorPadrao: 'Indeterminado'
    },
    {
      id: 'f15',
      chave: 'dataInicio',
      label: 'Data de Início',
      tipo: 'data',
      obrigatorio: true
    },
    {
      id: 'f16',
      chave: 'dataFim',
      label: 'Data de Término (se Prazo Determinado)',
      tipo: 'data',
      obrigatorio: false
    },
    {
      id: 'f17',
      chave: 'haverMulta',
      label: 'Deseja estabelecer Multa Contratual?',
      tipo: 'sim_nao',
      obrigatorio: true,
      valorPadrao: 'SIM'
    },
    {
      id: 'f18',
      chave: 'valorMulta',
      label: 'Valor ou Percentual da Multa Rescisória (R$ ou %)',
      tipo: 'texto',
      obrigatorio: false,
      valorPadrao: 'R$ 200,00'
    },
    {
      id: 'f19',
      chave: 'foroCidade',
      label: 'Cidade do Foro',
      tipo: 'texto',
      obrigatorio: true
    },
    {
      id: 'f20',
      chave: 'foroEstado',
      label: 'Estado do Foro (UF)',
      tipo: 'texto',
      obrigatorio: true
    },
    {
      id: 'f21',
      chave: 'testemunha1Nome',
      label: 'Nome da Testemunha 1 (Opcional)',
      tipo: 'texto',
      obrigatorio: false
    },
    {
      id: 'f22',
      chave: 'testemunha1Cpf',
      label: 'CPF da Testemunha 1',
      tipo: 'cpf',
      obrigatorio: false
    },
    {
      id: 'f23',
      chave: 'testemunha2Nome',
      label: 'Nome da Testemunha 2 (Opcional)',
      tipo: 'texto',
      obrigatorio: false
    },
    {
      id: 'f24',
      chave: 'testemunha2Cpf',
      label: 'CPF da Testemunha 2',
      tipo: 'cpf',
      obrigatorio: false
    }
  ],
  regrasCondicionais: [
    {
      id: 'r1',
      nome: 'Regra Auxilio Transporte',
      campoChave: 'haverAuxilioTransporte',
      operador: 'igual',
      valorEsperado: 'SIM',
      textoInserirSeVerdadeiro: 'O(A) CONTRATANTE concederá ao(à) CONTRATADO(A) auxílio-transporte no valor diário de R$ {{contrato.valorAuxilioTransporte}}.',
      textoInserirSeFalso: 'O(A) CONTRATADO(A) declara que não necessita de auxílio-transporte fornecido pelo CONTRATANTE.'
    },
    {
      id: 'r2',
      nome: 'Regra Auxilio Alimentacao',
      campoChave: 'haverAuxilioAlimentacao',
      operador: 'igual',
      valorEsperado: 'SIM',
      textoInserirSeVerdadeiro: 'O(A) CONTRATANTE fornecerá ao(à) CONTRATADO(A) auxílio-alimentação/refeição no valor de R$ {{contrato.valorAuxilioAlimentacao}} por dia trabalhado.',
      textoInserirSeFalso: 'Não haverá concessão de auxílio-alimentação em pecúnia.'
    }
  ],
  isFavorito: true,
  status: 'ativo',
  versao: 1,
  createdBy: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export async function getModelos(): Promise<ModeloContrato[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('nome', 'asc'));
    const snap = await getDocs(q);
    const result = snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as ModeloContrato[];

    if (result.length === 0) {
      // Seed default model
      const seededId = await createModelo(MODELO_DIARISTA_PADRAO, 'system');
      return [{ id: seededId, ...MODELO_DIARISTA_PADRAO }];
    }
    return result;
  } catch (err) {
    console.error('Erro ao listar modelos:', err);
    return [];
  }
}

export async function getModeloById(id: string): Promise<ModeloContrato | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ModeloContrato;
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar modelo:', err);
    return null;
  }
}

export async function createModelo(data: Omit<ModeloContrato, 'id'>, uid: string): Promise<string> {
  const docData = sanitizeFirestoreData({
    ...data,
    createdBy: uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
}

export async function updateModelo(id: string, data: Partial<ModeloContrato>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const payload = sanitizeFirestoreData({
    ...data,
    updatedAt: new Date().toISOString()
  });
  await updateDoc(docRef, payload);
}

export async function deleteModelo(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function toggleFavoritoModelo(id: string, current: boolean): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    isFavorito: !current,
    updatedAt: new Date().toISOString()
  });
}
