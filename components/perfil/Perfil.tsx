"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sairAction } from "@/app/entrar/actions";
import { lembretes as armLembretes } from "@/lib/armazenamento";
import { useDemo } from "@/lib/demo";
import { apagarFotos } from "@/lib/fotos-corpo";
import { RESPOSTAS_PADRAO, useRespostasSalvas } from "@/lib/quiz";
import { fmtHora, PassosInstalar } from "../acesso/PrimeiroAcesso";
import { useAvisoRapido } from "../AvisoRapido";
import { Logo, Selo } from "../marca";
import { RodapeAbas } from "../RodapeAbas";
import { useAlunoExibido } from "@/lib/conta";

// Aluno de exemplo até existir login.
const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Folha = null | "instalar" | "excluir";

export function Perfil() {
  const ALUNO = useAlunoExibido();
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [respostas] = useRespostasSalvas();
  const [lemb] = armLembretes.usar();
  const [folha, setFolha] = useState<Folha>(null);
  const [so, setSo] = useState<"ios" | "android">("ios");
  const pausada = demo.estado === "pausada";
  const programa = demo.estado === "programa";
  const r = { ...RESPOSTAS_PADRAO, ...(respostas ?? {}) };

  const assinatura = pausada
    ? { selo: "PAUSADA", titulo: "Assinatura anual", nota: "Cartão recusado em 02 out. Seu histórico está guardado.", cta: "Reativar", ir: "/reativar" }
    : programa
      ? { selo: "PROGRAMA", titulo: "Programa Glúteo", nota: "Assine e libere o protocolo inteiro e todos os programas. 50% no primeiro mês.", cta: "Ver assinatura", ir: "/oferta" }
      : { selo: "ATIVA", titulo: "Assinatura anual", nota: "Renova em 12 mar 2027. Inclui todos os programas.", cta: null, ir: null };

  const equipamentos = r.equip === "Academia completa" ? "Academia completa" : (respostas?.equipamentos ?? []).join(", ") || r.equip;
  const grupos: { titulo: string; linhas: { k: string; v: string; acao: () => void }[] }[] = [
    {
      titulo: "TREINO",
      linhas: [
        { k: "Dados pessoais", v: `${r.sexo} · ${r.idade} · ${r.nivel}`, acao: () => router.push(`/perfil/dados${demo.qs}`) },
        { k: "Equipamentos", v: r.equip === "Academia completa" ? "Academia completa" : `${r.local} · ${equipamentos}`, acao: () => router.push(`/perfil/equipamentos${demo.qs}`) },
        { k: "Lembretes", v: lemb.ativo ? `${fmtHora(lemb.horario)} · ${lemb.dias.map((d) => NOMES_DIAS[d]).join(", ")}` : "Desligados", acao: () => router.push(`/perfil/lembretes${demo.qs}`) },
      ],
    },
    {
      titulo: "AJUDA",
      linhas: [
        { k: "Perguntas frequentes", v: "Treino, pagamento e acesso", acao: () => router.push(`/perfil/faq${demo.qs}`) },
        { k: "Termos e privacidade", v: "Termo de responsabilidade e dados de saúde", acao: () => router.push(`/perfil/termos${demo.qs}`) },
        { k: "Instalar o app", v: "Passo a passo para iPhone e Android", acao: () => setFolha("instalar") },
      ],
    },
  ];

  const seta = (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
      <path d="M2 2L8 8L2 14" fill="none" stroke="#111" strokeWidth="2" />
    </svg>
  );

  return (
    <main className="app" style={{ background: "var(--bg-soft)" }}>
      <div className="topo-seguro" />
      <div className="rolagem" style={{ padding: "20px 20px 32px" }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0 20px" }}>
          <div className="numero-grande" style={{ width: 64, height: 64, border: "2px solid #111", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flex: "none" }}>
            {ALUNO.iniciais}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 32, fontWeight: 850, fontStretch: "70%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>{ALUNO.nome}</span>
            <span className="texto-apoio">{ALUNO.email}</span>
          </div>
        </div>

        <div style={{ background: "#fff", border: pausada ? "var(--border-strong)" : "1px solid #111", padding: 14, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="rotulo">ASSINATURA</span>
            <Selo>{assinatura.selo}</Selo>
          </div>
          <span style={{ fontSize: 22, fontWeight: 850, fontStretch: "74%", textTransform: "uppercase", lineHeight: 1 }}>{assinatura.titulo}</span>
          <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.4 }}>{assinatura.nota}</span>
          {assinatura.cta && assinatura.ir && (
            <button type="button" className="botao botao--destaque" onClick={() => router.push(`${assinatura.ir}${demo.qs}`)}>
              {assinatura.cta}
            </button>
          )}
        </div>

        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="rotulo" style={{ marginBottom: 4 }}>
              {g.titulo}
            </div>
            <div style={{ background: "#fff", padding: "0 14px", marginBottom: 24 }}>
              {g.linhas.map((l, i) => (
                <button
                  type="button"
                  key={l.k}
                  onClick={l.acao}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "8px 0", background: "none", border: "none", borderBottom: i === g.linhas.length - 1 ? "none" : "1px solid var(--line)", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{l.k}</span>
                    <span className="texto-apoio">{l.v}</span>
                  </span>
                  {seta}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <button type="button" onClick={() => void sairAction()} style={{ height: 44, padding: 0, background: "none", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Sair
          </button>
          <button
            type="button"
            onClick={() => setFolha("excluir")}
            style={{ height: 44, padding: 0, background: "none", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Excluir conta
          </button>
        </div>
      </div>
      <RodapeAbas />

      {folha && (
        <>
          <div className="folha-fundo" onClick={() => setFolha(null)} />
          <div className="folha" role="dialog" aria-modal="true" style={{ maxHeight: "90%", overflowY: "auto" }}>
            {folha === "instalar" && (
              <>
                <div style={{ fontSize: 26, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>Instalar o app</div>
                <PassosInstalar so={so} onSo={setSo} />
                <button type="button" className="botao botao--primario" onClick={() => setFolha(null)}>
                  Fechar
                </button>
              </>
            )}
            {folha === "excluir" && (
              <>
                <div style={{ fontSize: 26, fontWeight: 850, fontStretch: "72%", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 0.95 }}>Excluir conta</div>
                <div className="aviso" style={{ flexDirection: "row", gap: 12, padding: 14 }}>
                  <span className="aviso__icone">!</span>
                  <p style={{ fontSize: 15, lineHeight: 1.45 }}>Apaga seu histórico, cargas, fotos do corpo e medidas. Não dá para desfazer. A assinatura é cancelada junto.</p>
                </div>
                <button
                  type="button"
                  className="botao botao--primario"
                  onClick={async () => {
                    // Hoje apaga o que está neste aparelho. Com o backend, apaga também do servidor
                    // e cancela a assinatura na Eduzz (LGPD: em até 15 dias).
                    try {
                      Object.keys(localStorage)
                        .filter((k) => k.startsWith("maisqtreino:"))
                        .forEach((k) => localStorage.removeItem(k));
                    } catch {}
                    await apagarFotos().catch(() => undefined);
                    router.push("/entrar");
                  }}
                >
                  Excluir minha conta
                </button>
                <button type="button" className="botao botao--secundario" onClick={() => setFolha(null)}>
                  Voltar
                </button>
              </>
            )}
          </div>
        </>
      )}
      {aviso.elemento}
    </main>
  );
}
