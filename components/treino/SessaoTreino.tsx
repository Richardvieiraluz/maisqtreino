"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { registrarSessaoAction } from "@/lib/acoes/conta";
import { avisarFila } from "@/lib/geracao";
import { ALUNO_EXEMPLO } from "@/lib/dados-exemplo";
import { useDemo } from "@/lib/demo";
import { seriesFeitas, trocasFeitas, useSessao } from "@/lib/sessao";
import type { TreinoSessao } from "@/lib/tipos";
import { useAvisoRapido } from "../AvisoRapido";
import { Execucao } from "./Execucao";
import { Avaliacao, Resumo } from "./FimDoTreino";

/** Fluxo do treino em tela cheia: execução → avaliação → resumo. */
export function SessaoTreino({ treino, protocoloTreinoId, sequencia: seqReal }: { treino: TreinoSessao; protocoloTreinoId?: string; sequencia?: number }) {
  const seq = seqReal ?? ALUNO_EXEMPLO.sequenciaDias + 1;
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const { s, despachar, volume, exerciciosFeitos, minutos } = useSessao(treino);
  const voltarAoInicio = () => router.push(`/${demo.qs}`);

  // Treino do protocolo concluído (chegou ao resumo): grava a sessão uma vez e anda a fila.
  const gravado = useRef(false);
  useEffect(() => {
    if (s.tela !== "resumo" || !protocoloTreinoId || gravado.current) return;
    gravado.current = true;
    void registrarSessaoAction({
      protocoloTreinoId,
      duracaoSeg: Math.round(((s.fim ?? Date.now()) - s.inicio) / 1000),
      avaliacao: s.avaliacao,
      teveDor: s.teveDor,
      series: seriesFeitas(treino, s),
      trocas: trocasFeitas(treino, s),
    }).then((r) => {
      if (r.ok) avisarFila();
      else aviso.mostrar("Não deu para salvar este treino. Confira sua conexão.");
    });
  }, [s.tela, protocoloTreinoId]);

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
        sequencia={seq}
        onStories={() => router.push(`/stories?min=${minutos}&seq=${seq}`)}
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
