export type CampoAnamnese = {
  id: string;
  empresa_id?: string | null;

 label: string;
  pergunta?: string | null;
  titulo?: string | null;
  nome?: string | null;

  tipo?: string | null;
  obrigatorio?: boolean | null;
  obrigatoria?: boolean | null;
  ativo?: boolean | null;
  ordem?: number | null;

  placeholder?: string | null;
  ajuda?: string | null;
  opcoes?: string[] | null;

  [key: string]: any;
};

export type ServicoCliente = {
  id: string;
  nome: string;
  descricao?: string | null;

  valor?: number | null;
  preco?: number | null;
  preco_promocional?: number | null;
  valor_especial?: number | null;

  duracao?: number | null;
  duracao_padrao_minutos?: number | null;
  categoria_id?: string | null;
  ativo?: boolean | null;

  [key: string]: any;
};

export type ProfissionalCliente = {
  id: string;
  nome: string;
  ativo?: boolean | null;

  inicio_expediente?: string | null;
  fim_expediente?: string | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;

  [key: string]: any;
};