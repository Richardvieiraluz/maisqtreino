import { Suspense } from "react";
import { ListaProntos } from "@/components/master/TreinosProntos";
import { listarProntos, programasDisponiveis } from "@/lib/dados/treinos-prontos";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const ligado = supabaseConfigurado();
  const [treinos, programas] = ligado ? await Promise.all([listarProntos(), programasDisponiveis()]) : [undefined, undefined];
  return (
    <Suspense>
      <ListaProntos treinos={treinos} programas={programas} />
    </Suspense>
  );
}
