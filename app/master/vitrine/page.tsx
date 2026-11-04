import { Suspense } from "react";
import { VitrineMaster } from "@/components/master/TelasMaster";
import { lerVitrine } from "@/lib/dados/master-conteudo";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const salva = supabaseConfigurado() ? await lerVitrine() : undefined;
  return (
    <Suspense>
      <VitrineMaster salva={salva} />
    </Suspense>
  );
}
