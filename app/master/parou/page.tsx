import { Suspense } from "react";
import { QuemParou } from "@/components/master/TelasMaster";
import { carregarBaseMaster } from "@/lib/dados/master";
import { parados } from "@/lib/master-calculos";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const dados = supabaseConfigurado() ? parados(await carregarBaseMaster()) : undefined;
  return (
    <Suspense>
      <QuemParou dados={dados} />
    </Suspense>
  );
}
