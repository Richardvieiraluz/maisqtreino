import { Suspense } from "react";
import { AlunosMaster } from "@/components/master/TelasMaster";
import { carregarBaseMaster, listarProdutos } from "@/lib/dados/master";
import { listaDeAlunos } from "@/lib/master-calculos";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page() {
  const real = supabaseConfigurado();
  const [base, produtos] = real ? await Promise.all([carregarBaseMaster(), listarProdutos()]) : [null, undefined];
  return (
    <Suspense>
      <AlunosMaster alunos={base ? listaDeAlunos(base) : undefined} produtos={produtos} />
    </Suspense>
  );
}
