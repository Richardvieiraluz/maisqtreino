import { Suspense } from "react";
import { PainelMaster } from "@/components/master/TelasMaster";
import { carregarBaseMaster } from "@/lib/dados/master";
import { painel } from "@/lib/master-calculos";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const dados = supabaseConfigurado() ? painel(await carregarBaseMaster()) : undefined;
  return (
    <Suspense>
      <PainelMaster dados={dados} />
    </Suspense>
  );
}
