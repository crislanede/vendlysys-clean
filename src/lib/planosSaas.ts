/** Catálogo de permissões comerciais. A fiscalização definitiva deve ocorrer no banco. */
export type PlanoSaas = "basico" | "profissional" | "premium" | "vitalicio";
export type RecursoSaas = "agenda" | "clientes" | "financeiro_completo" | "anamnese" | "comissoes" | "pagamento_online" | "lembretes_automaticos" | "dashboard_avancado" | "exportacao_relatorios";
type ConfiguracaoPlano = { limiteProfissionais: number; comercial: boolean; recursos: readonly RecursoSaas[] };
const basicos = ["agenda", "clientes"] as const;
const profissional = [...basicos, "financeiro_completo", "anamnese", "comissoes", "pagamento_online", "exportacao_relatorios"] as const;
const premium = [...profissional, "lembretes_automaticos", "dashboard_avancado"] as const;
export const PLANOS_SAAS: Record<PlanoSaas, ConfiguracaoPlano> = {
  basico: { limiteProfissionais: 1, comercial: true, recursos: basicos },
  profissional: { limiteProfissionais: 5, comercial: true, recursos: profissional },
  premium: { limiteProfissionais: 15, comercial: true, recursos: premium },
  vitalicio: { limiteProfissionais: 15, comercial: false, recursos: premium },
};
export function obterPlanoSaas(plano: string | null | undefined): ConfiguracaoPlano | null {
  if (!plano || !(plano in PLANOS_SAAS)) return null;
  return PLANOS_SAAS[plano as PlanoSaas];
}
export function temRecurso(plano: string | null | undefined, recurso: RecursoSaas): boolean {
  return obterPlanoSaas(plano)?.recursos.includes(recurso) ?? false;
}
export function podeAtivarProfissional(plano: string | null | undefined, ativos: number): boolean {
  const config = obterPlanoSaas(plano);
  return config !== null && ativos < config.limiteProfissionais;
}
