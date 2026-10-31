"use client";

import { AREAS, REGIOES, type Area } from "@/lib/quiz";
import type { Sexo } from "@/lib/midia";

/** Boneco de frente e costas com áreas de toque. Região selecionada fica vermelha
 *  (é o mapa muscular, único lugar onde o vermelho aparece). */
export function MapaRegioes({ sexo, selecionadas, onAlternar }: { sexo: Sexo; selecionadas: string[]; onAlternar: (r: string) => void }) {
  const base = `/assets/bonecos/${sexo}/boneco-base.svg`;
  const lado = (titulo: string, areas: Area[], deslocX: number) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        style={{
          position: "relative",
          width: 160,
          height: 330,
          background: `#fff url(${base}) ${deslocX}px -10px / 416px 348px no-repeat`,
          border: "1px solid var(--line)",
        }}
      >
        {areas.map(([chave, x, y, w, h, rotulo]) => {
          const sel = selecionadas.includes(chave);
          return (
            <button
              type="button"
              key={rotulo}
              aria-label={rotulo}
              aria-pressed={sel}
              title={rotulo}
              onClick={() => onAlternar(chave)}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: w,
                height: h,
                background: sel ? "rgba(200,32,42,.82)" : "transparent",
                border: sel ? "2px solid #C8202A" : "1px dashed rgba(17,17,17,.45)",
                cursor: "pointer",
                padding: 0,
              }}
            />
          );
        })}
      </div>
      <span className="rotulo">{titulo}</span>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        {lado("FRENTE", AREAS[sexo].frente, -23)}
        {lado("COSTAS", AREAS[sexo].costas, -231)}
      </div>
      <div className="ajuste" style={{ marginTop: 16 }}>
        <b>Foco:</b> {selecionadas.length ? selecionadas.map((k) => REGIOES[k]).join(", ") + "." : "nenhuma região marcada."}
      </div>
    </>
  );
}
