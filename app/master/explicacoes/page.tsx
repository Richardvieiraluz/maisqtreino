import { Suspense } from "react";
import { ExplicacoesMaster } from "@/components/master/TelasMaster";
import { explicacoesMaster } from "@/lib/dados/master-conteudo";
import { supabaseConfigurado } from "@/lib/supabase/env";

// "Gerar mais 8" chama a IA dentro da Server Action desta página.
export const maxDuration = 300;

export default async function Page() {
  const dados = supabaseConfigurado() ? await explicacoesMaster() : undefined;
  return (
    <Suspense>
      <ExplicacoesMaster dados={dados} />
    </Suspense>
  );
}
