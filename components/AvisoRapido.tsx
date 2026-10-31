"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Aviso curto no rodapé da tela (2,6 s), igual ao do protótipo. */
export function useAvisoRapido() {
  const [texto, setTexto] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((msg: string) => {
    if (t.current) clearTimeout(t.current);
    setTexto(msg);
    t.current = setTimeout(() => setTexto(null), 2600);
  }, []);

  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);

  const elemento = texto ? (
    <div className="aviso-rapido" role="status">
      {texto}
    </div>
  ) : null;

  return { mostrar, elemento };
}
