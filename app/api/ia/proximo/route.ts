import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth";
import { garantirFila, gerarProximo, protocoloAtivo, treinosFeitos } from "@/lib/dados/treinos";
import { iaConfigurada } from "@/lib/ia-treino/modelo";

// Gera o PRÓXIMO treino do protocolo do aluno logado (um por chamada; pode levar até uns 2 min).
// O app chama em sequência depois do quiz até a primeira semana ficar pronta, e de novo quando o
// aluno avança. Nunca passa de "treinos feitos + dias por semana": chamar à toa não gera a mais.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const sessao = await getSessao();
  if (!sessao) return NextResponse.json({ ok: false, erro: "sem sessão" }, { status: 401 });
  if (!iaConfigurada()) return NextResponse.json({ ok: false, erro: "IA não configurada" }, { status: 503 });

  // O Master pode pedir pelo aluno (?aluno=); o aluno, só para ele mesmo.
  const pedido = new URL(request.url).searchParams.get("aluno");
  const alunoId = sessao.papel === "master" && pedido && /^[0-9a-f-]{36}$/i.test(pedido) ? pedido : sessao.id;

  const p = await protocoloAtivo(alunoId);
  if (!p) return NextResponse.json({ ok: true, situacao: "sem_protocolo" });
  await garantirFila(p, await treinosFeitos(p));
  const r = await gerarProximo(p.id);
  const depois = await protocoloAtivo(alunoId);
  const treinos = depois?.treinos ?? [];
  return NextResponse.json({
    ok: true,
    ...r,
    prontos: treinos.filter((t) => t.status === "pronto").length,
    naFila: treinos.filter((t) => t.status === "pendente" || t.status === "gerando").length,
    comErro: treinos.filter((t) => t.status === "erro").length,
    total: depois?.totalTreinos ?? null,
  });
}
