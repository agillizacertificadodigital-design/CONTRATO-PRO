export function formatarCPF(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatarCNPJ(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatarCEP(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function formatarMoeda(val: number | string): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarDataBR(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDataPorExtenso(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return '';
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function valorPorExtenso(val: number): string {
  if (!val || val <= 0) return 'zero reais';

  // Simplified extensional converter for common contractual values
  const inteiro = Math.floor(val);
  const centavos = Math.round((val - inteiro) * 100);

  let texto = `${inteiro} reais`;
  if (centavos > 0) {
    texto += ` e ${centavos} centavos`;
  }
  return texto;
}

export function validarCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(clean.substring(10, 11));
}

export function validarCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14 || /^(\d)\1{13}$/.test(clean)) return false;
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

export function qualificarParte(p?: any): string {
  if (!p) return '[DADOS DA PARTE NÃO PREENCHIDOS]';

  if (p.tipoPessoa === 'PJ') {
    let q = `${p.razaoSocial || p.nome || '[RAZÃO SOCIAL]'}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${p.cnpj || '[CNPJ]'}, com sede na ${p.endereco || '[ENDEREÇO]'}, nº ${p.numero || 's/n'}, ${p.bairro || '[BAIRRO]'}, CEP ${p.cep || '[CEP]'}, na cidade de ${p.cidade || '[CIDADE]'}/${p.estado || '[UF]'}`;
    if (p.representanteLegal?.nome) {
      q += `, neste ato representada por seu ${p.representanteLegal.cargo || 'Representante Legal'}, Sr.(a) ${p.representanteLegal.nome}, inscrito(a) no CPF sob o nº ${p.representanteLegal.cpf || '[CPF]'}`;
    }
    return q;
  } else {
    return `${p.nome || '[NOME COMPLETO]'}, ${p.nacionalidade || 'brasileiro(a)'}, ${p.estadoCivil || 'solteiro(a)'}, ${p.profissao || 'autônomo(a)'}, portador(a) do RG nº ${p.rg || '[RG]'} ${p.orgaoExpedidor ? '(' + p.orgaoExpedidor + ')' : ''}, inscrito(a) no CPF sob o nº ${p.cpf || '[CPF]'}, residente e domiciliado(a) na ${p.endereco || '[ENDEREÇO]'}, nº ${p.numero || 's/n'}, ${p.complemento ? p.complemento + ', ' : ''}${p.bairro || '[BAIRRO]'}, CEP ${p.cep || '[CEP]'}, ${p.cidade || '[CIDADE]'}/${p.estado || '[UF]'}`;
  }
}
