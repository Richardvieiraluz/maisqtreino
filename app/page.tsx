import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Inicio } from "@/components/inicio/Inicio";
import { getSessao } from "@/lib/auth";

export default async function Page() {
  // Aluno sem nenhuma compra vigente nem histórico de assinatura: vai para a oferta.
  const sessao = await getSessao();
  if (sessao?.papel === "aluno" && sessao.estado === "sem_acesso") redirect("/oferta");
  return (
    <Suspense>
      <Inicio />
    </Suspense>
  );
}
