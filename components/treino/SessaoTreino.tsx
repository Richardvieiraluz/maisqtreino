"use client";

import { useRouter } from "next/navigation";
import { ALUNO_EXEMPLO } from "@/lib/dados-exemplo";
import { useDemo } from "@/lib/demo";
import { useSessao } from "@/lib/sessao";
import type { TreinoSessao } from "@/lib/tipos";
import { useAvisoRapido } from "../AvisoRapido";
import { Execucao } from "./Execucao";
import { Avaliacao, Resumo } from "./FimDoTreino";

/** Fluxo do treino em tela cheia: execução → avaliação → resumo. */
export function SessaoTreino({ treino }: { treino: TreinoSessao }) {
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const { s, despachar, volume, exerciciosFeitos, minutos } = useSessao(treino);
  const voltarAoInicio = () => router.push(`/${demo.qs}`);

  let tela;
  if (s.tela === "execucao") {
    tela = (
      <Execucao
        treino={treino}
        s={s}
        despachar={despachar}
        sexo={demo.sexo}
        descansoEmFaixa={demo.descanso === "faixa"}
        onFechar={voltarAoInicio}
      />
    );
  } else if (s.tela === "avaliacao") {
    tela = <Avaliacao escolha={s.avaliacao} despachar={despachar} />;
  } else {
    tela = (
      <Resumo
        treino={treino}
        sexo={demo.sexo}
        minutos={minutos}
        exerciciosFeitos={exerciciosFeitos}
        volume={volume()}
        recordes={s.recordes}
        sequencia={ALUNO_EXEMPLO.sequenciaDias + 1}
        onStories={() => aviso.mostrar("A montagem do stories 1080 × 1920 entra na próxima etapa.")}
        onInicio={voltarAoInicio}
      />
    );
  }

  return (
    <>
      {tela}
      {aviso.elemento}
    </>
  );
}
