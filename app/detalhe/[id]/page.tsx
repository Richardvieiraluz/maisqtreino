import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetalheTreino } from "@/components/detalhe/DetalheTreino";
import { getSessao } from "@/lib/auth";
import { detalheDoTreino } from "@/lib/dados/treinos";
import { PROGRAMA_GLUTEO } from "@/lib/plano";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = /^protocolo-(\d{2})$/.exec(id);
  const valido = id === PROGRAMA_GLUTEO.id || (m && +m[1] >= 1);
  if (!valido) notFound();
  // Aluno logado: o treino do protocolo dele. Master e demonstração: o exemplo (24 treinos).
  const sessao = await getSessao();
  const real = m && sessao?.papel === "aluno" ? await detalheDoTreino(sessao.id, +m[1]) : undefined;
  if (real === null || (m && real === undefined && +m[1] > 24)) notFound();
  return (
    <Suspense>
      <DetalheTreino id={id} real={real} />
    </Suspense>
  );
}
