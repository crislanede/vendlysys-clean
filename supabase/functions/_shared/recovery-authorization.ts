// Pure, fail-closed company authorization rules used by MFA recovery.
export type Membership = { empresa_id: string | null; perfil: string | null };
export type OwnedCompany = { id: string };
export type CompanyScope = { allowed: true; empresaId: string } | { allowed: false };

export function resolveSingleCompanyAdmin(
  memberships: Membership[],
  owned: OwnedCompany[],
  isSaasAdmin: boolean,
): CompanyScope {
  if (isSaasAdmin) return { allowed: false };
  const companyIds = new Set<string>();
  for (const membership of memberships) {
    if (membership.empresa_id) companyIds.add(membership.empresa_id);
  }
  for (const company of owned) if (company.id) companyIds.add(company.id);
  if (companyIds.size !== 1) return { allowed: false };
  const empresaId = [...companyIds][0];
  const admin = owned.some((company) => company.id === empresaId) ||
    memberships.some((membership) => membership.empresa_id === empresaId &&
      ["admin", "administrador"].includes(membership.perfil ?? ""));
  return admin ? { allowed: true, empresaId } : { allowed: false };
}
