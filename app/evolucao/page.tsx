import { Suspense } from "react";
import { Evolucao } from "@/components/evolucao/Evolucao";
import { getSessao } from "@/lib/auth";
import { evolucaoDoAluno } from "@/lib/dados/evolucao";

export default async function Page() {
  // Aluno logado: histórico real. Master e demonstração: o exemplo.
  const sessao = await getSessao();
  const real = sessao?.papel === "aluno" ? await evolucaoDoAluno(sessao.id) : undefined;
  return (
    <Suspense>
      <Evolucao real={real} />
    </Suspense>
  );
}
