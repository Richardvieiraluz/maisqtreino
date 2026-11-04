import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SessaoTreino } from "@/components/treino/SessaoTreino";
import { getSessao } from "@/lib/auth";
import { treinoParaSessao } from "@/lib/dados/treinos";
import { TREINO_HOJE } from "@/lib/dados-exemplo";

// protocolo-NN: treino do protocolo do aluno (gerado pela IA). O treino de exemplo continua para a
// demonstração e para o Master.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = id.match(/^protocolo-(\d{1,2})$/);
  const sessao = await getSessao();
  if (m && sessao) {
    const r = await treinoParaSessao(sessao.id, Number(m[1]));
    if (!r) notFound();
    return (
      <Suspense>
        <SessaoTreino treino={r.treino} protocoloTreinoId={r.protocoloTreinoId} />
      </Suspense>
    );
  }
  if (id !== TREINO_HOJE.id || (sessao && sessao.papel !== "master")) notFound();
  return (
    <Suspense>
      <SessaoTreino treino={TREINO_HOJE} />
    </Suspense>
  );
}
