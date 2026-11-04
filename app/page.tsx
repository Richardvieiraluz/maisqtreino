import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Inicio } from "@/components/inicio/Inicio";
import { getSessao } from "@/lib/auth";
import { evolucaoDoAluno } from "@/lib/dados/evolucao";
import { lerVitrine } from "@/lib/dados/master-conteudo";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { proximoTreino } from "@/lib/dados/treinos";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sessao = await getSessao();
  // Master que abre o app cai no Master. Para ver o app como aluno: /?estado=assinante (ou programa, pausada).
  if (sessao?.papel === "master" && !Object.keys(await searchParams).length) redirect("/master");
  // Aluno sem nenhuma compra vigente nem histórico de assinatura: vai para a oferta.
  if (sessao?.papel === "aluno" && sessao.estado === "sem_acesso") redirect("/oferta");
  const aluno = sessao?.papel === "aluno";
  const [proximo, evolucao, vitrine] = await Promise.all([
    aluno ? proximoTreino(sessao.id) : undefined,
    aluno ? evolucaoDoAluno(sessao.id) : undefined,
    supabaseConfigurado() ? lerVitrine() : null,
  ]);
  return (
    <Suspense>
      <Inicio proximo={proximo} sequencia={evolucao?.sequencia} vitrine={vitrine} />
    </Suspense>
  );
}
