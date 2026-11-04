import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Inicio } from "@/components/inicio/Inicio";
import { getSessao } from "@/lib/auth";
import { proximoTreino } from "@/lib/dados/treinos";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sessao = await getSessao();
  // Master que abre o app cai no Master. Para ver o app como aluno: /?estado=assinante (ou programa, pausada).
  if (sessao?.papel === "master" && !Object.keys(await searchParams).length) redirect("/master");
  // Aluno sem nenhuma compra vigente nem histórico de assinatura: vai para a oferta.
  if (sessao?.papel === "aluno" && sessao.estado === "sem_acesso") redirect("/oferta");
  const proximo = sessao?.papel === "aluno" ? await proximoTreino(sessao.id) : undefined;
  return (
    <Suspense>
      <Inicio proximo={proximo} />
    </Suspense>
  );
}
