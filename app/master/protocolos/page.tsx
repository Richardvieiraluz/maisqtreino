import { Suspense } from "react";
import { ProtocolosMaster } from "@/components/master/TelasMaster";
import { protocolosMaster } from "@/lib/dados/master-conteudo";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const dados = supabaseConfigurado() ? await protocolosMaster() : undefined;
  return (
    <Suspense>
      <ProtocolosMaster dados={dados} />
    </Suspense>
  );
}
