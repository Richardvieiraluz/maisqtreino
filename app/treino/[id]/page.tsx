import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SessaoTreino } from "@/components/treino/SessaoTreino";
import { getSessao } from "@/lib/auth";
import { evolucaoDoAluno } from "@/lib/dados/evolucao";
import { treinoParaSessao } from "@/lib/dados/treinos";
import { TREINO_HOJE } from "@/lib/dados-exemplo";

// protocolo-NN: treino do protocolo do aluno (gerado pela IA). O treino de exemplo continua para a
// demonstração e para o Master.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = id.match(/^protocolo-(\d{1,2})$/);
  const sessao = await getSessao();
  if (m && sessao) {
    const [r, evolucao] = await Promise.all([treinoParaSessao(sessao.id, Number(m[1])), evolucaoDoAluno(sessao.id)]);
    if (!r) notFound();
    return (
      <Suspense>
        <SessaoTreino treino={r.treino} protocoloTreinoId={r.protocoloTreinoId} sequencia={evolucao.sequenciaComHoje} />
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
