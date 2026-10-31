// Guarda pequenos dados no aparelho (localStorage) até existir banco.
// Cada chave vira um "armazém" com hook reativo, sem erro de hidratação.

import { useSyncExternalStore } from "react";

export function criarArmazem<T>(chave: string, padrao: T) {
  const ouvintes = new Set<() => void>();
  let cache: { bruto: string | null; valor: T } = { bruto: null, valor: padrao };

  const ler = (): T => {
    let bruto: string | null = null;
    try {
      bruto = window.localStorage.getItem(chave);
    } catch {
      return cache.valor;
    }
    if (bruto === cache.bruto) return cache.valor;
    let valor = padrao;
    try {
      valor = bruto ? { ...padrao, ...(JSON.parse(bruto) as T) } : padrao;
    } catch {
      valor = padrao;
    }
    cache = { bruto, valor };
    return valor;
  };

  const salvar = (valor: T) => {
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      cache = { bruto: JSON.stringify(valor), valor };
    }
    ouvintes.forEach((f) => f());
  };

  const assinar = (f: () => void) => {
    ouvintes.add(f);
    const aoMudar = (e: StorageEvent) => e.key === chave && f();
    window.addEventListener("storage", aoMudar);
    return () => {
      ouvintes.delete(f);
      window.removeEventListener("storage", aoMudar);
    };
  };

  function usar() {
    const valor = useSyncExternalStore(assinar, ler, () => padrao);
    return [valor, salvar] as const;
  }

  return { usar, salvar, ler };
}

// ── Armazéns do app ─────────────────────────────────────────────────────────

export interface Lembretes {
  ativo: boolean;
  /** Minutos desde 00:00. */
  horario: number;
  /** 0 = domingo ... 6 = sábado. */
  dias: number[];
  /** Lembrete das medidas (a cada 4 semanas) e das fotos do corpo (junto com as medidas). */
  medidas: boolean;
  fotos: boolean;
}
export const lembretes = criarArmazem<Lembretes>("maisqtreino:lembretes", { ativo: false, horario: 420, dias: [1, 3, 5, 6], medidas: true, fotos: false });

export interface Prontidao {
  respondido: boolean;
  algumSim: boolean;
  aceitouTermo: boolean;
  aceitouDados: boolean;
}
export const prontidao = criarArmazem<Prontidao>("maisqtreino:prontidao", { respondido: false, algumSim: false, aceitouTermo: false, aceitouDados: false });

export interface RegistroMedidas {
  /** Data ISO (aaaa-mm-dd). */
  data: string;
  valores: Record<string, number>;
}
export const medidas = criarArmazem<{ registros: RegistroMedidas[] }>("maisqtreino:medidas", { registros: [] });

/** Uso dos dados de saúde revogado (LGPD): o plano fica pausado. */
export const consentimento = criarArmazem<{ dadosSaudeRevogado: boolean }>("maisqtreino:consentimento", { dadosSaudeRevogado: false });
