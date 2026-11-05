import { Suspense } from "react";
import { VerTudo } from "@/components/busca/Busca";
import { getSessao } from "@/lib/auth";
import { vitrineDoAluno } from "@/lib/dados/treinos-prontos";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  // Banco ligado: treinos prontos publicados. Demonstração: o exemplo.
  const sessao = await getSessao();
  const real = supabaseConfigurado() && sessao ? (await vitrineDoAluno(sessao)).lista : undefined;
  return (
    <Suspense>
      <VerTudo real={real} />
    </Suspense>
  );
}
