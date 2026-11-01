import { Suspense } from "react";
import { FunilMaster } from "@/components/master/TelasMaster";
import { carregarBaseMaster } from "@/lib/dados/master";
import { funil } from "@/lib/master-calculos";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const dados = supabaseConfigurado() ? funil(await carregarBaseMaster()) : undefined;
  return (
    <Suspense>
      <FunilMaster dados={dados} />
    </Suspense>
  );
}
