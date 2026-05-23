export function displayName(p?: { nome?: string | null; nome_historico?: string | null; removido?: boolean | null } | null): string {
  if (!p) return "—";
  if (p.removido && p.nome_historico) return p.nome_historico;
  return p.nome ?? "—";
}