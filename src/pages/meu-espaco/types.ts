export type CampoAnamnese = {
  id: string;
  label: string;
  tipo: string;
  obrigatorio?: boolean;
  ordem?: number;
  placeholder?: string | null;
  ajuda?: string | null;
  opcoes?: string[] | null;
};

export type ServicoCliente = {
  id: string;
  nome: string;
  duracao?: number | null;
  duracao_padrao_minutos?: number | null;
  preco?: number | string | null;
  valor?: number | string | null;
  preco_promocional?: number | string | null;
};

export type ProfissionalCliente = {
  id: string;
  nome: string;
  inicio_expediente?: string | null;
  fim_expediente?: string | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;
  intervalo_minutos?: number | string | null;
  intervalo?: number | string | null;
};