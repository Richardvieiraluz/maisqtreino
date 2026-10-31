import { bonecoDe, fotoDe, type Sexo } from "@/lib/midia";
import type { CardTreino as Card } from "@/lib/tipos";
import { Cadeado, Check, Selo } from "../marca";

export function CardTreino({
  card,
  bloqueado,
  sexo,
  onToque,
}: {
  card: Card;
  bloqueado: boolean;
  sexo: Sexo;
  onToque: () => void;
}) {
  const temProgresso = card.progresso != null && !bloqueado;
  return (
    <button type="button" className="card-treino" onClick={onToque} aria-label={bloqueado ? `${card.nome}, bloqueado` : card.nome}>
      <div className={bloqueado ? "card-treino__capa card-treino__capa--bloqueado" : "card-treino__capa"}>
        {bloqueado ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cadeado />
          </div>
        ) : (
          <img className="card-treino__foto" src={fotoDe(card.nome)} alt="Richard Vieira" />
        )}
        <img className="card-treino__mapa" src={bonecoDe(card.nome, sexo)} alt="" />
        {card.feito && !bloqueado && (
          <span className="card-treino__check">
            <Check tamanho={26} />
          </span>
        )}
      </div>
      {temProgresso && (
        <div className="card-treino__progresso">
          <span style={{ width: `${card.progresso}%` }} />
        </div>
      )}
      <span className="nome-card" style={{ color: bloqueado ? "var(--ink-2)" : "var(--ink)" }}>
        {card.nome}
      </span>
      <span className="card-treino__meta">
        <span>{card.duracao}</span>
        <Selo pequeno>{card.nivel}</Selo>
      </span>
    </button>
  );
}
