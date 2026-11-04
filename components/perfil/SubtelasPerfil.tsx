"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { consentimento as armConsentimento, lembretes as armLembretes, prontidao as armProntidao } from "@/lib/armazenamento";
import { useDemo } from "@/lib/demo";
import { listarFotos } from "@/lib/fotos-corpo";
import { RESPOSTAS_PADRAO, useRespostasSalvas } from "@/lib/quiz";
import { SeletorLembrete } from "../acesso/PrimeiroAcesso";
import { useAvisoRapido } from "../AvisoRapido";
import { Check, Selo } from "../marca";
import { BotaoVoltar } from "../quiz/pecas";
import { useAlunoExibido } from "@/lib/conta";
import { baixarMeusDadosAction, revogarDadosSaudeAction } from "@/lib/acoes/lgpd";

export type Subtela = "dados" | "equipamentos" | "lembretes" | "faq" | "termos";
export const SUBTELAS: Record<Subtela, string> = {
  dados: "Dados pessoais",
  equipamentos: "Equipamentos",
  lembretes: "Lembretes",
  faq: "Perguntas frequentes",
  termos: "Termos e privacidade",
};

const ITENS = ["Halter", "Elástico", "Banco", "Mini band", "Kettlebell", "Barra", "TRX", "Bola suíça", "Caneleira", "Colchonete"];
const FAQ: [string, string][] = [
  ["Preciso de academia?", "Não. O protocolo é montado com o que você marcou no quiz: casa, condomínio ou academia."],
  ["E se eu não conseguir fazer um exercício?", "No menu ⋯ de cada exercício, troque por uma versão mais fácil. O resto do treino segue igual."],
  ["Perdi um dia. E agora?", "Nada se perde. O protocolo não anda sozinho: você continua do treino em que parou."],
  ["Como mudo o local ou os equipamentos?", "Em Perfil, Equipamentos, ou em Meu plano, \"Mudei de local ou de equipamento\"."],
  ["Como cancelo a assinatura?", "A assinatura é gerenciada pela Eduzz. O link para cancelar está no e-mail da compra."],
  ["Quem vê minhas fotos do corpo?", "Só você. As fotos não aparecem para ninguém, nem no painel do Richard."],
];

const linhaFinal = (i: number, n: number) => (i === n - 1 ? "var(--border-strong)" : "1px solid var(--line)");

function Interruptor({ ligado }: { ligado: boolean }) {
  return (
    <span aria-hidden style={{ flex: "none", width: 52, height: 30, border: "2px solid #111", background: ligado ? "#111" : "#fff", position: "relative" }}>
      <span style={{ position: "absolute", top: 2, left: ligado ? 24 : 2, width: 22, height: 22, background: "#fff", border: ligado ? "none" : "2px solid #111" }} />
    </span>
  );
}

export function SubtelaPerfil({ tela }: { tela: Subtela }) {
  const ALUNO = useAlunoExibido();
  const demo = useDemo();
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [respostas, salvarRespostas] = useRespostasSalvas();
  const [lemb, setLemb] = armLembretes.usar();
  const [consent, setConsent] = armConsentimento.usar();
  const [prontidao] = armProntidao.usar();
  const r = { ...RESPOSTAS_PADRAO, ...(respostas ?? {}) };

  // Equipamentos (rascunho até salvar)
  const locais = ["Em casa", "Academia", "Condomínio"];
  const [local, setLocal] = useState(r.local);
  const [itens, setItens] = useState<string[]>(respostas?.equipamentos?.length ? respostas.equipamentos : ["Halter", "Elástico", "Banco", "Mini band"]);
  // Lembretes (rascunho até salvar)
  const [rasc, setRasc] = useState(lemb);
  const [faqAberta, setFaqAberta] = useState(0);
  const [revogar, setRevogar] = useState(false);

  let corpo: ReactNode = null;
  let salvar: (() => void) | null = null;

  if (tela === "dados") {
    const dados: [string, string][] = [
      ["Nome", ALUNO.nome],
      ["E-mail", ALUNO.email],
      ["Sexo", r.sexo],
      ["Idade", r.idade],
      ["Objetivo", r.objetivo],
      ["Nível", r.nivel],
    ];
    corpo = (
      <>
        {dados.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "12px 0", borderBottom: linhaFinal(i, dados.length) }}>
            <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{k}</span>
            <span style={{ fontSize: 18, fontWeight: 850, fontStretch: "76%", textAlign: "right" }}>{v}</span>
          </div>
        ))}
        <p className="texto-apoio" style={{ marginTop: 10 }}>
          O e-mail é o da compra na Eduzz. Para trocar, fale pelo mesmo e-mail.
        </p>
        <div className="ajuste" style={{ marginTop: 24 }}>
          <b>Mudou de nível ou de objetivo?</b> Refaça o quiz. O protocolo é remontado a partir do próximo treino, e o que você já fez continua salvo.
        </div>
        <button type="button" className="botao botao--secundario" style={{ marginTop: 14 }} onClick={() => router.push(`/quiz${demo.qs}`)}>
          Refazer o quiz
        </button>
      </>
    );
  }

  if (tela === "equipamentos") {
    salvar = () => {
      salvarRespostas({ ...(respostas ?? {}), local, equip: "Lista", equipamentos: itens });
      aviso.mostrar("Equipamentos salvos. Os próximos treinos já usam o que você tem.");
    };
    corpo = (
      <>
        <div className="rotulo" style={{ marginBottom: 8 }}>
          ONDE VOCÊ TREINA
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
          {locais.map((l) => (
            <button
              type="button"
              key={l}
              aria-pressed={local === l}
              onClick={() => setLocal(l)}
              style={{ height: 48, background: "#fff", border: local === l ? "3px solid #111" : "1px solid #111", fontWeight: 800, fontSize: 13, letterSpacing: ".04em", cursor: "pointer", textTransform: "uppercase" }}
            >
              {l === "Em casa" ? "Casa" : l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "22px 0 8px" }}>
          <span className="rotulo">O QUE VOCÊ TEM</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em" }}>{itens.length} MARCADOS</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {ITENS.map((l) => {
            const sel = itens.includes(l);
            return (
              <button
                type="button"
                key={l}
                role="checkbox"
                aria-checked={sel}
                onClick={() => setItens(sel ? itens.filter((x) => x !== l) : [...itens, l])}
                style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: sel ? 6 : 8, background: "#fff", border: sel ? "3px solid #111" : "1px solid #111", cursor: "pointer" }}
              >
                <span style={{ width: 44, height: 44, flex: "none", background: "var(--bg-soft)", border: "1px solid var(--line)" }} />
                <span style={{ flex: 1, fontSize: 16, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{l}</span>
                {sel && (
                  <span style={{ position: "absolute", right: 6, top: 6 }}>
                    <Check tamanho={22} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button type="button" className="botao botao--secundario" style={{ height: 48, marginTop: 12, fontSize: 13, letterSpacing: ".06em" }} onClick={() => router.push(`/quiz${demo.qs}`)}>
          Atualizar por foto
        </button>
        <div className="ajuste" style={{ marginTop: 20 }}>
          <b>O que muda:</b> só os exercícios. Nível, progresso e cargas continuam.
        </div>
      </>
    );
  }

  if (tela === "lembretes") {
    salvar = async () => {
      let ativo = rasc.ativo;
      if (ativo && typeof Notification !== "undefined" && Notification.permission !== "granted") {
        ativo = (await Notification.requestPermission().catch(() => "denied")) === "granted";
      }
      setLemb({ ...rasc, ativo });
      aviso.mostrar(ativo || !rasc.ativo ? "Lembretes salvos." : "Permita as notificações do app para receber os lembretes.");
    };
    const toggles: [keyof typeof rasc, string, string][] = [
      ["ativo", "Lembrete de treino", "Nos dias e no horário abaixo"],
      ["medidas", "Medidas", "A cada 4 semanas, de manhã"],
      ["fotos", "Fotos do corpo", "Junto com as medidas"],
    ];
    corpo = (
      <>
        {toggles.map(([k, t, v]) => {
          const on = !!rasc[k];
          return (
            <button
              type="button"
              key={k}
              role="switch"
              aria-checked={on}
              onClick={() => setRasc({ ...rasc, [k]: !on })}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 68, padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{t}</span>
                <span className="texto-apoio">{v}</span>
              </span>
              <Interruptor ligado={on} />
            </button>
          );
        })}
        {rasc.ativo && (
          <div style={{ marginTop: 22 }}>
            <SeletorLembrete horario={rasc.horario} dias={rasc.dias} onHorario={(h) => setRasc({ ...rasc, horario: h })} onDias={(d) => setRasc({ ...rasc, dias: d })} />
          </div>
        )}
        <div className="aviso" style={{ marginTop: 22, flexDirection: "row", gap: 12, padding: 14 }}>
          <span className="aviso__icone">!</span>
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>Os lembretes só chegam com o app instalado na tela inicial.</p>
        </div>
      </>
    );
  }

  if (tela === "faq") {
    corpo = FAQ.map(([pergunta, resposta], i) => {
      const aberta = faqAberta === i;
      return (
        <div key={pergunta} style={{ borderBottom: linhaFinal(i, FAQ.length) }}>
          <button
            type="button"
            aria-expanded={aberta}
            onClick={() => setFaqAberta(aberta ? -1 : i)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "10px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ flex: 1, fontSize: 18, fontWeight: 850, fontStretch: "78%", lineHeight: 1.1 }}>{pergunta}</span>
            <span aria-hidden style={{ flex: "none", width: 28, height: 28, border: "2px solid #111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>
              {aberta ? "−" : "+"}
            </span>
          </button>
          {aberta && <p style={{ fontSize: 15, lineHeight: 1.5, padding: "0 40px 16px 0" }}>{resposta}</p>}
        </div>
      );
    });
  }

  if (tela === "termos") {
    const aceito = prontidao.respondido ? "ACEITO" : "PENDENTE";
    const termos: [string, string, string][] = [
      ["Termo de responsabilidade", aceito, "Você declara que respondeu o questionário de prontidão com verdade e que vai parar o treino se sentir dor forte."],
      ["Dados de saúde", consent.dadosSaudeRevogado ? "REVOGADO" : aceito, "Usamos idade, dores, limitações, medidas e fotos só para montar e ajustar o seu treino. Nada é vendido ou compartilhado."],
    ];
    corpo = (
      <>
        {termos.map(([t, selo, texto], i) => (
          <div key={t} style={{ padding: "14px 0", borderBottom: linhaFinal(i, termos.length), display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 850, fontStretch: "76%", textTransform: "uppercase", lineHeight: 1 }}>{t}</span>
              <Selo pequeno>{selo}</Selo>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.45 }}>{texto}</p>
            <button
              type="button"
              onClick={() => aviso.mostrar("O texto completo entra com a versão revisada pelo advogado.")}
              style={{ alignSelf: "flex-start", height: 40, padding: 0, background: "none", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Ler o texto completo
            </button>
          </div>
        ))}
        <div className="rotulo" style={{ margin: "24px 0 8px" }}>
          SEUS DADOS (LGPD)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="botao botao--secundario"
            style={{ fontSize: 13, letterSpacing: ".06em" }}
            onClick={async () => {
              // Dados do servidor (conta, quiz, treinos feitos) + o que fica só neste aparelho.
              const r = await baixarMeusDadosAction();
              if (!r.ok) return aviso.mostrar(r.error);
              const local: Record<string, unknown> = {};
              try {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("maisqtreino:"))
                  .forEach((k) => (local[k.replace("maisqtreino:", "")] = JSON.parse(localStorage.getItem(k) ?? "null")));
              } catch {}
              const fotos = await listarFotos();
              local.fotosDoCorpo = fotos.map((f) => ({ data: f.data, angulo: f.angulo }));
              const blob = new Blob([JSON.stringify({ servidor: r.dados ?? {}, somenteNesteAparelho: local }, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "maisqtreino-meus-dados.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            }}
          >
            Baixar meus dados
          </button>
          <button type="button" className="botao botao--secundario" style={{ fontSize: 13, letterSpacing: ".06em" }} onClick={() => setRevogar(!revogar)} disabled={consent.dadosSaudeRevogado}>
            {consent.dadosSaudeRevogado ? "Uso dos dados de saúde revogado" : "Revogar uso dos dados de saúde"}
          </button>
        </div>
        {revogar && !consent.dadosSaudeRevogado && (
          <div className="aviso" style={{ marginTop: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span className="aviso__icone">!</span>
              <p style={{ fontSize: 15, lineHeight: 1.45 }}>Sem os dados de saúde, o protocolo não consegue ajustar os treinos às suas dores e limitações. Seu acesso continua, mas o plano fica pausado.</p>
            </div>
            <button
              type="button"
              className="botao botao--primario"
              style={{ height: 48, fontSize: 13, letterSpacing: ".06em" }}
              onClick={async () => {
                const r = await revogarDadosSaudeAction();
                if (!r.ok) return aviso.mostrar(r.error);
                setConsent({ dadosSaudeRevogado: true });
                setRevogar(false);
                aviso.mostrar("Uso dos dados de saúde revogado. O plano fica pausado.");
              }}
            >
              Revogar mesmo assim
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={() => router.push(`/perfil${demo.qs}`)} />
        <span className="rotulo">PERFIL</span>
      </div>
      <div className="rolagem" style={{ padding: "4px 20px 24px" }}>
        <h1 className="titulo-tela" style={{ marginBottom: 16 }}>
          {SUBTELAS[tela]}
        </h1>
        {corpo}
      </div>
      {salvar && (
        <div style={{ flex: "none", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)" }}>
          <button type="button" className="botao botao--primario" onClick={salvar}>
            Salvar
          </button>
        </div>
      )}
      {aviso.elemento}
    </main>
  );
}
