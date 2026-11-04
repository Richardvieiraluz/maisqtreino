"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { entrarAction, salvarProntidaoAction } from "@/app/entrar/actions";
import { lembretes as armLembretes, prontidao as armProntidao } from "@/lib/armazenamento";
import { TREINADOR } from "@/lib/config";
import { useDemo } from "@/lib/demo";
import { useAvisoRapido } from "../AvisoRapido";
import { Check, Logo } from "../marca";

type Etapa = "login" | "boasVindas" | "prontidao" | "instalar" | "lembrete";

const PARQ = [
  "Algum médico já disse que você tem problema no coração e só deve fazer atividade física com orientação?",
  "Você sente dor no peito quando faz atividade física?",
  "No último mês, sentiu dor no peito sem estar em atividade?",
  "Você perde o equilíbrio por tontura ou já desmaiou?",
  "Tem problema nos ossos ou articulações que pode piorar com exercício?",
  "Toma remédio para pressão ou para o coração?",
  "Existe outro motivo para você não fazer atividade física?",
];

const ACEITES = ["Li e aceito o termo de responsabilidade.", "Autorizo o uso dos meus dados de saúde para montar o treino (LGPD)."];

const PASSOS = {
  ios: [
    ["Toque em ", "Compartilhar", " na barra do Safari.", "SAFARI · COMPARTILHAR"],
    ["Role e escolha ", "Adicionar à Tela de Início", ".", "MENU · ADICIONAR"],
    ["Toque em ", "Adicionar", ", no canto superior.", "CONFIRMAR"],
  ],
  android: [
    ["Toque nos ", "três pontos", " do Chrome.", "CHROME · MENU"],
    ["Escolha ", "Instalar app", ".", "MENU · INSTALAR"],
    ["Confirme em ", "Instalar", ".", "CONFIRMAR"],
  ],
};

export const DIAS_CURTOS = ["D", "S", "T", "Q", "Q", "S", "S"];
export const fmtHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const tela: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))" };
const rotuloCampo: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: "var(--ink-2)", marginBottom: 6 };
const campo: React.CSSProperties = { height: 52, border: "1px solid #111", padding: "0 14px", fontSize: 16, color: "#111", background: "#fff" };
const linkSublinhado: React.CSSProperties = { height: 44, padding: 0, background: "none", border: "none", fontSize: 15, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" };
const rodapeFixo: React.CSSProperties = { flex: "none", padding: "12px 20px calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)" };

/** Seletor de horário (±30 min) e dias da semana. Usado aqui e no Perfil. */
export function SeletorLembrete({ horario, dias, onHorario, onDias }: { horario: number; dias: number[]; onHorario: (m: number) => void; onDias: (d: number[]) => void }) {
  const btn: React.CSSProperties = { width: 52, height: 52, border: "2px solid #111", background: "#fff", fontSize: 24, fontWeight: 800, cursor: "pointer" };
  return (
    <>
      <div className="rotulo">HORÁRIO</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", padding: "6px 0 12px" }}>
        <button type="button" aria-label="Mais cedo" style={btn} onClick={() => onHorario((horario + 1410) % 1440)}>
          −
        </button>
        <span className="numero-grande" style={{ fontSize: 64 }}>
          {fmtHora(horario)}
        </span>
        <button type="button" aria-label="Mais tarde" style={btn} onClick={() => onHorario((horario + 30) % 1440)}>
          +
        </button>
      </div>
      <div className="rotulo" style={{ marginTop: 20, marginBottom: 8 }}>
        DIAS · {dias.length} POR SEMANA
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {DIAS_CURTOS.map((l, i) => {
          const on = dias.includes(i);
          return (
            <button
              type="button"
              key={i}
              aria-pressed={on}
              aria-label={["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][i]}
              onClick={() => onDias(on ? dias.filter((d) => d !== i) : [...dias, i].sort())}
              style={{ height: 48, background: on ? "#111" : "#fff", color: on ? "#fff" : "#111", border: "1px solid #111", fontWeight: 800, fontSize: 15, cursor: "pointer", padding: 0 }}
            >
              {l}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Passo a passo de instalação (também aberto pelo Perfil). */
export function PassosInstalar({ so, onSo }: { so: "ios" | "android"; onSo: (s: "ios" | "android") => void }) {
  const passos = PASSOS[so];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #111", marginBottom: 8 }}>
        {(["ios", "android"] as const).map((k) => (
          <button
            type="button"
            key={k}
            aria-pressed={so === k}
            onClick={() => onSo(k)}
            style={{ height: 44, border: "none", background: so === k ? "#111" : "#fff", color: so === k ? "#fff" : "#111", fontWeight: 800, fontSize: 13, letterSpacing: ".08em", cursor: "pointer" }}
          >
            {k === "ios" ? "IPHONE" : "ANDROID"}
          </button>
        ))}
      </div>
      {passos.map(([pre, b, pos, print], i) => (
        <div key={b} style={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) 92px", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: i === passos.length - 1 ? "var(--border-strong)" : "1px solid var(--line)" }}>
          <span className="numero-grande" style={{ fontSize: 48, lineHeight: 0.85 }}>
            {i + 1}
          </span>
          <span style={{ fontSize: 15, lineHeight: 1.4 }}>
            {pre}
            <b style={{ fontWeight: 800 }}>{b}</b>
            {pos}
          </span>
          {/* Espaço do print de cada passo (entra com as capturas reais). */}
          <div style={{ height: 120, border: "1px solid #111", background: "var(--bg-soft)", display: "flex", alignItems: "flex-end", padding: 4, fontSize: 7, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink-2)" }}>PRINT · {print}</div>
        </div>
      ))}
      {so === "ios" && (
        <div className="ajuste" style={{ marginTop: 14 }}>
          <b>Depois de instalar:</b> abra sempre pelo ícone. No iPhone, o ícone pede o seu login uma vez, porque ele não usa o login do Safari.
        </div>
      )}
    </>
  );
}

const soDoAparelho = (): "ios" | "android" =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent) ? "android" : "ios";

export function PrimeiroAcesso() {
  const demo = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const aviso = useAvisoRapido();
  // ?etapa=boasVindas: vem da tela de criar senha, com a sessão já aberta.
  const [etapa, setEtapa] = useState<Etapa>(params.get("etapa") === "boasVindas" ? "boasVindas" : "login");
  const [enviando, setEnviando] = useState(false);

  // Convite pelo e-mail padrão do Supabase: chega no site com #access_token=… (ou #error=… se venceu).
  // O # passa pelos redirecionamentos e é lido aqui; a tela de criar senha cuida do resto.
  useEffect(() => {
    const h = window.location.hash;
    if (/[#&](access_token|error)=/.test(h)) window.location.replace(`/entrar/senha${h}`);
  }, []);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [parq, setParq] = useState<Record<number, "s" | "n">>({});
  const [aceites, setAceites] = useState([false, false]);
  const [so, setSo] = useState<"ios" | "android">(soDoAparelho);
  const [lemb, setLemb] = armLembretes.usar();
  const algumSim = Object.values(parq).includes("s");
  const parqCompleto = PARQ.every((_, i) => parq[i]);
  const parqOk = parqCompleto && aceites[0] && aceites[1];
  const irQuiz = () => router.push(`/quiz${demo.qs}`);

  if (etapa === "login")
    return (
      <main className="app">
        <div className="topo-seguro" />
        <form
          style={tela}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email || !senha) return aviso.mostrar("Preencha e-mail e senha.");
            if (enviando) return;
            // Sem as chaves do Supabase (modo demonstração), a action deixa qualquer login seguir.
            setEnviando(true);
            const r = await entrarAction(email, senha).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
            setEnviando(false);
            if (!r.ok) return aviso.mostrar(r.error);
            if (r.destino === "boasVindas") setEtapa("boasVindas");
            else router.replace(r.destino);
          }}
        >
          <Logo />
          <h1 className="titulo-tela" style={{ margin: "72px 0 12px", fontSize: 48, fontStretch: "68%", lineHeight: 0.9 }}>
            Entre na sua <span className="destaque">conta</span>
          </h1>
          <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 28 }}>
            Use o e-mail da compra. O acesso chegou por lá.
          </p>
          <label htmlFor="email" style={rotuloCampo}>
            E-MAIL
          </label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" style={{ ...campo, marginBottom: 16 }} />
          <label htmlFor="senha" style={rotuloCampo}>
            SENHA
          </label>
          <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" style={campo} />
          <button type="button" style={{ ...linkSublinhado, alignSelf: "flex-start" }} onClick={() => router.push("/entrar/esqueci")}>
            Esqueci a senha
          </button>
          <button type="submit" className="botao botao--primario" style={{ marginTop: "auto", background: email && senha && !enviando ? "#111" : "var(--track)" }}>
            {enviando ? "Entrando" : "Entrar"}
          </button>
        </form>
        {aviso.elemento}
      </main>
    );

  if (etapa === "boasVindas")
    return (
      <main className="app">
        <div className="topo-seguro" />
        <div style={tela}>
          <Logo />
          <img src="/assets/fotos/richard-agachamento.png" alt={TREINADOR.nome} style={{ flex: 1, minHeight: 0, width: "100%", marginTop: 16, objectFit: "contain", objectPosition: "center bottom", background: "#fff" }} />
          <div style={{ borderTop: "var(--border-strong)" }} />
          <h1 className="titulo-capa" style={{ margin: "16px 0 10px" }}>
            Você abre e <span className="destaque">segue</span>.
          </h1>
          <p className="texto">Eu monto cada treino com o equipamento que você tem. Você só aperta Começar.</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "10px 0 20px" }}>
            <b style={{ color: "#111", fontWeight: 800 }}>{TREINADOR.nome}</b> · {TREINADOR.profissao} · {TREINADOR.cref}
          </p>
          <button type="button" className="botao botao--primario" onClick={() => setEtapa("prontidao")}>
            Começar
          </button>
        </div>
      </main>
    );

  if (etapa === "prontidao")
    return (
      <main className="app">
        <div className="topo-seguro" />
        <div className="rolagem" style={{ padding: "20px 20px 20px" }}>
          <div className="rotulo">ANTES DO PRIMEIRO TREINO</div>
          <h1 className="titulo-tela" style={{ margin: "8px 0 10px" }}>
            Sua <span className="destaque">prontidão</span>
          </h1>
          <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 12 }}>
            Sete perguntas de sim ou não. Servem para saber se você pode treinar sem liberação médica.
          </p>
          {PARQ.map((t, i) => {
            const v = parq[i];
            const b = (sel: boolean): React.CSSProperties => ({ height: 44, background: sel ? "#111" : "#fff", color: sel ? "#fff" : "#111", border: "1px solid #111", fontWeight: 800, fontSize: 13, letterSpacing: ".08em", cursor: "pointer" });
            return (
              <div key={i} role="group" aria-label={t} style={{ padding: "14px 0", borderBottom: i === PARQ.length - 1 ? "var(--border-strong)" : "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <span className="numero-grande" style={{ fontSize: 22, width: 24, flex: "none" }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 15, lineHeight: 1.4 }}>{t}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingLeft: 34 }}>
                  <button type="button" aria-pressed={v === "s"} style={b(v === "s")} onClick={() => setParq({ ...parq, [i]: "s" })}>
                    SIM
                  </button>
                  <button type="button" aria-pressed={v === "n"} style={b(v === "n")} onClick={() => setParq({ ...parq, [i]: "n" })}>
                    NÃO
                  </button>
                </div>
              </div>
            );
          })}
          {algumSim && (
            <div className="aviso" style={{ marginTop: 16, flexDirection: "row", gap: 12, padding: 14 }}>
              <span className="aviso__icone">!</span>
              <p style={{ fontSize: 15, lineHeight: 1.45 }}>Você marcou pelo menos um sim. Converse com um médico antes de começar e traga a liberação para treinar com segurança.</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 20 }}>
            {ACEITES.map((t, i) => (
              <button
                type="button"
                key={t}
                role="checkbox"
                aria-checked={aceites[i]}
                onClick={() => setAceites(aceites.map((a, j) => (j === i ? !a : a)))}
                style={{ display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", padding: "10px 0", background: "none", border: "none", cursor: "pointer" }}
              >
                {aceites[i] ? <Check tamanho={26} /> : <span style={{ flex: "none", width: 26, height: 26, borderRadius: "50%", border: "2px solid #111" }} />}
                <span style={{ fontSize: 15, lineHeight: 1.4 }}>{t}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={rodapeFixo}>
          <button
            type="button"
            className="botao botao--primario"
            style={{ background: parqOk ? "#111" : "var(--track)" }}
            onClick={async () => {
              if (!parqOk) return aviso.mostrar(parqCompleto ? "Falta aceitar o termo e o uso dos dados." : "Responda as 7 perguntas.");
              const r = await salvarProntidaoAction(parq).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
              if (!r.ok) return aviso.mostrar(r.error);
              armProntidao.salvar({ respondido: true, algumSim, aceitouTermo: true, aceitouDados: true });
              setEtapa("instalar");
            }}
          >
            Continuar
          </button>
        </div>
        {aviso.elemento}
      </main>
    );

  if (etapa === "instalar")
    return (
      <main className="app">
        <div className="topo-seguro" />
        <div className="rolagem" style={{ padding: "20px 20px 20px" }}>
          <h1 className="titulo-tela" style={{ marginBottom: 10 }}>
            Coloque o app na <span className="destaque">tela</span> inicial
          </h1>
          <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 16 }}>
            Os lembretes de treino só funcionam com o app instalado.
          </p>
          <PassosInstalar so={so} onSo={setSo} />
        </div>
        <div style={{ ...rodapeFixo, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" className="botao botao--secundario" style={{ fontSize: 13 }} onClick={() => setEtapa("lembrete")}>
            Fazer depois
          </button>
          <button type="button" className="botao botao--primario" style={{ fontSize: 13 }} onClick={() => setEtapa("lembrete")}>
            Já instalei
          </button>
        </div>
      </main>
    );

  // Lembrete
  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={tela}>
        <h1 className="titulo-tela" style={{ margin: "48px 0 10px", fontSize: 48, fontStretch: "68%", lineHeight: 0.9 }}>
          Quer um <span className="destaque">lembrete</span>?
        </h1>
        <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 28 }}>
          Um aviso por dia de treino, no horário que você escolher. Dá para mudar no Perfil.
        </p>
        <SeletorLembrete horario={lemb.horario} dias={lemb.dias} onHorario={(h) => setLemb({ ...lemb, horario: h })} onDias={(d) => setLemb({ ...lemb, dias: d })} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 24 }}>
          <button
            type="button"
            className="botao botao--primario"
            onClick={async () => {
              // Pede a permissão do sistema. O envio no horário vem com o service worker e o servidor.
              let ok = false;
              if (typeof Notification !== "undefined") {
                try {
                  ok = (await Notification.requestPermission()) === "granted";
                } catch {
                  ok = false;
                }
              }
              setLemb({ ...lemb, ativo: ok });
              irQuiz();
            }}
          >
            Ativar lembretes
          </button>
          <button type="button" style={linkSublinhado} onClick={irQuiz}>
            Agora não
          </button>
        </div>
      </div>
    </main>
  );
}
