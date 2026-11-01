"use client";

// Controles de demonstração pela URL, para revisar as telas em cada estado
// enquanto não existe login nem banco. Ex.: /?estado=programa&sexo=masculino
//   estado   = assinante | programa | pausada   (padrão: assinante)
//   sexo     = feminino | masculino              (padrão: o do quiz, ou feminino)
//   dia      = descanso                          (Início em dia de descanso)
//   descanso = tela | faixa                      (padrão: tela)
// Logado como aluno, o estado vem da compra real (o ?estado= da URL é ignorado). O Master
// continua podendo usar ?estado= para ver o app como cada tipo de aluno.

import { useSearchParams } from "next/navigation";
import type { Sexo } from "./midia";
import { useConta } from "./conta";
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
  const conta = useConta();
  const daUrl = (["assinante", "programa", "pausada"] as const).find((v) => v === p.get("estado"));
  // Aluno sem compra vigente vê tudo com cadeado, como a assinatura pausada.
  const real: EstadoAcesso | undefined = conta && conta.papel === "aluno" ? (conta.estado === "sem_acesso" ? "pausada" : conta.estado) : undefined;
  const estado: EstadoAcesso = real ?? daUrl ?? "assinante";
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
