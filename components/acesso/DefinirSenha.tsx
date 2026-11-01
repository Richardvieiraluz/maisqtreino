"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { definirSenhaAction, type LinkDoEmail } from "@/app/entrar/actions";
import { useAvisoRapido } from "../AvisoRapido";
import { Logo } from "../marca";

/** Lê o link do e-mail: ?token_hash=&type= (modelo próprio), ?code= (esqueci a senha padrão)
 *  ou #access_token=&refresh_token=&type= (convite padrão). Devolve também se é convite. */
function lerLink(params: URLSearchParams, hash: string): { link: LinkDoEmail | null; convite: boolean; erro: boolean } {
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const tipo = params.get("type") ?? h.get("type") ?? "";
  const convite = tipo === "invite" || tipo === "signup";
  const erro = !!(h.get("error") || params.get("error"));
  const token_hash = params.get("token_hash");
  if (token_hash) return { link: { modo: "token", token_hash, tipo }, convite, erro };
  const codigo = params.get("code");
  if (codigo) return { link: { modo: "codigo", codigo }, convite, erro };
  const access_token = h.get("access_token"), refresh_token = h.get("refresh_token");
  if (access_token && refresh_token) return { link: { modo: "sessao", access_token, refresh_token }, convite, erro };
  return { link: null, convite, erro };
}

/** Link do e-mail: convite do primeiro acesso ou senha nova. */
export function DefinirSenha() {
  const router = useRouter();
  const aviso = useAvisoRapido();
  // O # só existe no navegador: lido depois de montar.
  const [lido, setLido] = useState<ReturnType<typeof lerLink> | null>(null);
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // Lê uma vez só: depois os tokens saem da barra de endereço (e do histórico).
    setLido((atual) => atual ?? lerLink(new URLSearchParams(window.location.search), window.location.hash));
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const tela: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))" };
  const titulo: React.CSSProperties = { margin: "72px 0 12px", fontSize: 48, fontStretch: "68%", lineHeight: 0.9 };

  if (!lido) return <main className="app" />;

  if (!lido.link)
    return (
      <main className="app">
        <div className="topo-seguro" />
        <div style={tela}>
          <Logo />
          <h1 className="titulo-tela" style={titulo}>
            Link <span className="destaque">{lido.erro ? "vencido" : "incompleto"}</span>
          </h1>
          <p className="texto">{lido.erro ? "Esse link expirou ou já foi usado. Peça um novo, ele chega em instantes." : "Abra o link direto do e-mail, sem copiar só uma parte. Se ele venceu, peça outro."}</p>
          <button type="button" className="botao botao--primario" style={{ marginTop: "auto" }} onClick={() => router.push("/entrar/esqueci")}>
            Pedir link novo
          </button>
        </div>
      </main>
    );

  const { link, convite } = lido;
  const pronta = senha.length >= 8 && !enviando;

  return (
    <main className="app">
      <div className="topo-seguro" />
      <form
        style={tela}
        onSubmit={async (e) => {
          e.preventDefault();
          if (senha.length < 8) return aviso.mostrar("A senha precisa de pelo menos 8 caracteres.");
          if (enviando) return;
          setEnviando(true);
          const r = await definirSenhaAction(link, senha).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
          setEnviando(false);
          if (!r.ok) return aviso.mostrar(r.error);
          router.replace(r.destino === "boasVindas" ? "/entrar?etapa=boasVindas" : r.destino);
        }}
      >
        <Logo />
        <h1 className="titulo-tela" style={titulo}>
          {convite ? "Crie sua " : "Sua senha "}
          <span className="destaque">{convite ? "senha" : "nova"}</span>
        </h1>
        <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 28 }}>
          {convite ? "É com ela e com o e-mail da compra que você entra no app." : "Depois de salvar, você já entra no app."}
        </p>
        <label htmlFor="senha-nova" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: "var(--ink-2)", marginBottom: 6 }}>
          SENHA (8 OU MAIS CARACTERES)
        </label>
        <div style={{ display: "flex", border: "1px solid #111", height: 52 }}>
          <input
            id="senha-nova"
            type={ver ? "text" : "password"}
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ flex: 1, minWidth: 0, border: "none", padding: "0 14px", fontSize: 16, color: "#111", background: "transparent" }}
          />
          <button type="button" onClick={() => setVer(!ver)} style={{ flex: "none", padding: "0 14px", background: "none", border: "none", borderLeft: "1px solid #111", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {ver ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <button type="submit" className="botao botao--primario" style={{ marginTop: "auto", background: pronta ? "#111" : "var(--track)" }}>
          {enviando ? "Salvando" : "Salvar e entrar"}
        </button>
      </form>
      {aviso.elemento}
    </main>
  );
}
