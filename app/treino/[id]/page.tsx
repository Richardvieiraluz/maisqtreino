import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SessaoTreino } from "@/components/treino/SessaoTreino";
import { TREINO_HOJE } from "@/lib/dados-exemplo";

// Por enquanto só o treino de exemplo. Depois, o treino vem do protocolo do aluno.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== TREINO_HOJE.id) notFound();
  return (
    <Suspense>
      <SessaoTreino treino={TREINO_HOJE} />
    </Suspense>
  );
}
