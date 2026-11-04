import { Suspense } from "react";
import { MeuPlano } from "@/components/plano/MeuPlano";
import { getSessao } from "@/lib/auth";
import { planoDoAluno } from "@/lib/dados/treinos";

export default async function Page() {
  // Aluno logado: o protocolo dele (null = ainda sem quiz). Master e demonstração: o exemplo.
  const sessao = await getSessao();
  const plano = sessao?.papel === "aluno" ? await planoDoAluno(sessao.id) : undefined;
  return (
    <Suspense>
      <MeuPlano plano={plano} />
    </Suspense>
  );
}
