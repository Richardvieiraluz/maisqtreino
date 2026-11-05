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
export function SessaoTreino({ treino, protocoloTreinoId, treinoId, sequencia: seqReal }: { treino: TreinoSessao; protocoloTreinoId?: string; treinoId?: string; sequencia?: number }) {
  const seq = seqReal ?? ALUNO_EXEMPLO.sequenciaDias + 1;
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const { s, despachar, volume, exerciciosFeitos, minutos } = useSessao(treino);
  const voltarAoInicio = () => router.push(`/${demo.qs}`);
  const gravado = useRef(false);
  // Saiu no meio do treino depois de marcar dor: grava o treino como interrompido, para a dor
  // ajustar os próximos (o exercício sai). Sem dor, sair não grava nada.
  const sair = () => {
    if ((protocoloTreinoId || treinoId) && Object.keys(s.dores).length && !gravado.current) {
      gravado.current = true;
      void registrarSessaoAction({
        protocoloTreinoId,
        treinoId,
        duracaoSeg: Math.round((Date.now() - s.inicio) / 1000),
        avaliacao: null,
        teveDor: true,
        series: seriesFeitas(treino, s),
        trocas: trocasFeitas(treino, s),
        interrompida: true,
      });
    }
    voltarAoInicio();
  };

  // Treino do protocolo concluído (chegou ao resumo): grava a sessão uma vez e anda a fila.
  useEffect(() => {
    if (s.tela !== "resumo" || !(protocoloTreinoId || treinoId) || gravado.current) return;
    gravado.current = true;
    void registrarSessaoAction({
      protocoloTreinoId,
      treinoId,
      duracaoSeg: Math.round(((s.fim ?? Date.now()) - s.inicio) / 1000),
      avaliacao: s.avaliacao,
      teveDor: s.teveDor,
      series: seriesFeitas(treino, s),
      trocas: trocasFeitas(treino, s),
    }).then((r) => {
      if (r.ok) avisarFila();
      else aviso.mostrar("Não deu para salvar este treino. Confira sua conexão.");
    });
  }, [s.tela, protocoloTreinoId, treinoId]);

  let tela;
  if (s.tela === "execucao") {
    tela = (
      <Execucao
        treino={treino}
        s={s}
        despachar={despachar}
        sexo={demo.sexo}
        descansoEmFaixa={demo.descanso === "faixa"}
        onFechar={sair}
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
