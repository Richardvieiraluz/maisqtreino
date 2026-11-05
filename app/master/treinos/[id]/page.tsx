import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorPronto } from "@/components/master/TreinosProntos";
import { lerPronto, programasDisponiveis } from "@/lib/dados/treinos-prontos";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { ehIdPronto } from "@/lib/treinos-prontos";

// "Montar rascunho com a IA" roda dentro da Server Action desta página (até uns 2 minutos).
export const maxDuration = 300;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "novo" && !ehIdPronto(id)) notFound();
  const ligado = supabaseConfigurado();
  const [treino, programas] = ligado ? await Promise.all([id === "novo" ? null : lerPronto(id), programasDisponiveis()]) : [null, []];
  if (ligado && id !== "novo" && !treino) notFound();
  return (
    <Suspense>
      <EditorPronto treino={treino} programas={programas} />
    </Suspense>
  );
}
