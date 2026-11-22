export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

export function filtroEmailExato(email: string) {
  const emailLiteral = normalizarEmail(email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return "^" + emailLiteral + "$";
}
