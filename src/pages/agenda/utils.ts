import type { AlertaAnamneseItem } from "../../lib/anamneseAlerta";

export type Cliente = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
};

export type Servico = {
  id: string;
  nome: string;
  valor?: number | null;
  preco?: number | null;
  promocao_ativa?: boolean | string | null;
  preco_promocional?: number | string | null;
  descricao?: string | null;
  duracao?: number | null;
  duracao_padrao_minutos?: number | null;
  percentual_residencial?: number | null;
};

export type Profissional = {
  id: string;
  nome: string;
};

export type Agendamento = {
  id: string;
  cliente_id?: string | null;
  profissional_id?: string | null;
  servico_id?: string | null;
  cliente?: string | null;
  profissional?: string | null;
  servico?: string | null;
  data: string;
  horario: string;
  status?: string | null;
  observacoes?: string | null;
  no_show?: boolean | null;
  valor?: number | null;
  valor_pago?: number | null;
  forma_pagamento?: string | null;
  status_pagamento?: string | null;
  finalizado_em?: string | null;
  telefone?: string | null;
  token?: string | null;
  token_cliente?: string | null;
  alertasAnamnese?: AlertaAnamneseItem[];
  duracao_minutos?: number | null;
  atendimento_residencial?: boolean | null;
  percentual_residencial?: number | null;
  created_at?: string | null;
};

export type PacoteDisponivel = {
  saldo_id: string;
  cliente_pacote_id: string;
  pacote_id: string | null;
  pacote_nome: string;
  servico_id: string;
  quantidade_total: number;
  quantidade_usada: number;
  restante: number;
  data_fim: string | null;
};

export type FotoAtendimento = {
  id: string;
  agendamento_id: string;
  empresa_id: string;
  cliente_id?: string | null;
  url_foto?: string | null;
  caminho?: string | null;
  tipo?: "geral" | "antes" | "depois" | string | null;
  descricao?: string | null;
  created_at?: string | null;
  signedUrl?: string;
};