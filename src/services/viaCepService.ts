export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface CnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  ddd_telefone_1: string;
  email: string;
}

export async function buscarCep(cep: string): Promise<ViaCepResponse | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  // 1. Try server endpoint proxy first
  try {
    const res = await fetch(`/api/cep/${cleanCep}`);
    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) return data;
    }
  } catch (e) {
    console.warn('Falha no proxy CEP, tentando chamada direta ao ViaCEP...');
  }

  // 2. Client-side fallback
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch (err) {
    console.warn('Erro ao buscar CEP:', err);
    return null;
  }
}

export async function buscarCnpj(cnpj: string): Promise<CnpjResponse | null> {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return null;

  // 1. Try server endpoint proxy first
  try {
    const res = await fetch(`/api/cnpj/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.razao_social) return data;
    }
  } catch (e) {
    console.warn('Falha no proxy CNPJ, tentando chamada direta...');
  }

  // 2. Direct client fallback to BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.razao_social) return data;
    }
  } catch (err) {
    console.warn('Erro ao buscar CNPJ via BrasilAPI direta:', err);
  }

  // 3. Direct client fallback to MinhaReceita
  try {
    const res = await fetch(`https://minhareceita.org/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.razao_social) return data;
    }
  } catch (err) {
    console.warn('Erro ao buscar CNPJ via MinhaReceita direta:', err);
  }

  return null;
}
