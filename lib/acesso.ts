// Estado do aluno a partir do que ele comprou (tabela acessos). Função pura, sem banco.
export type EstadoAluno = "assinante" | "programa" | "pausada" | "sem_acesso";

export interface LinhaAcesso {
  produto_id: string;
  tipo: "assinatura" | "programa";
  status: "ativo" | "pausado" | "cancelado" | "reembolsado";
  valido_ate: string | null;
}

const vigente = (a: LinhaAcesso, agora: number) => a.status === "ativo" && (!a.valido_ate || Date.parse(a.valido_ate) > agora);

/**
 * Assinatura vigente → assinante (tudo liberado).
 * Senão, programa vigente → programa (só o que comprou + 1ª semana do protocolo).
 * Senão, assinatura que já existiu (pausada, cancelada ou vencida) → pausada (só histórico).
 * Senão → sem_acesso (vai para a oferta).
 */
export function estadoDosAcessos(acessos: LinhaAcesso[], agora = Date.now()): { estado: EstadoAluno; programas: string[] } {
  const programas = acessos.filter((a) => a.tipo === "programa" && vigente(a, agora)).map((a) => a.produto_id);
  if (acessos.some((a) => a.tipo === "assinatura" && vigente(a, agora))) return { estado: "assinante", programas };
  if (programas.length) return { estado: "programa", programas };
  if (acessos.some((a) => a.tipo === "assinatura" && a.status !== "reembolsado")) return { estado: "pausada", programas };
  return { estado: "sem_acesso", programas };
}
