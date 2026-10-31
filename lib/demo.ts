"use client";

// Controles de demonstração pela URL, para revisar as telas em cada estado
// enquanto não existe login nem banco. Ex.: /?estado=programa&sexo=masculino
//   estado   = assinante | programa | pausada   (padrão: assinante)
//   sexo     = feminino | masculino              (padrão: o do quiz, ou feminino)
//   dia      = descanso                          (Início em dia de descanso)
//   descanso = tela | faixa                      (padrão: tela)
// Some quando o estado real do aluno vier do banco.

import { useSearchParams } from "next/navigation";
import type { Sexo } from "./midia";
import { useRespostasSalvas } from "./quiz";
import type { EstadoAcesso } from "./tipos";

export interface Demo {
  estado: EstadoAcesso;
  sexo: Sexo;
  diaDescanso: boolean;
  descanso: "tela" | "faixa";
  /** Query string para repassar aos links internos. */
  qs: string;
}

export function useDemo(): Demo {
  const p = useSearchParams();
  const estado = (["assinante", "programa", "pausada"] as const).find((v) => v === p.get("estado")) ?? "assinante";
  const [respostas] = useRespostasSalvas();
  // URL manda; sem ela, vale o sexo respondido no quiz.
  const sexoUrl = p.get("sexo");
  const sexo: Sexo = (sexoUrl ?? respostas?.sexo?.toLowerCase()) === "masculino" ? "masculino" : "feminino";
  const qs = p.toString();
  return {
    estado,
    sexo,
    diaDescanso: p.get("dia") === "descanso",
    descanso: p.get("descanso") === "faixa" ? "faixa" : "tela",
    qs: qs ? `?${qs}` : "",
  };
}
