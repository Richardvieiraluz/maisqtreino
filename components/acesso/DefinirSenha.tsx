"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { definirSenhaAction } from "@/app/entrar/actions";
import { useAvisoRapido } from "../AvisoRapido";
import { Logo } from "../marca";

/** Link do e-mail: convite do primeiro acesso (type=invite) ou senha nova (type=recovery). */
export function DefinirSenha() {
  const router = useRouter();
  const params = useSearchParams();
  const aviso = useAvisoRapido();
  const token = params.get("token_hash") ?? "";
  const tipo = params.get("type") ?? "";
  const convite = tipo === "invite";
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const pronta = senha.length >= 8 && !enviando;

  const tela: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))" };
  const titulo: React.CSSProperties = { margin: "72px 0 12px", fontSize: 48, fontStretch: "68%", lineHeight: 0.9 };

  if (!token || !tipo)
    return (
      <main className="app">
        <div className="topo-seguro" />
        <div style={tela}>
          <Logo />
          <h1 className="titulo-tela" style={titulo}>
            Link <span className="destaque">incompleto</span>
          </h1>
          <p className="texto">Abra o link direto do e-mail, sem copiar só uma parte. Se ele venceu, peça outro.</p>
          <button type="button" className="botao botao--primario" style={{ marginTop: "auto" }} onClick={() => router.push("/entrar/esqueci")}>
            Pedir link novo
          </button>
        </div>
      </main>
    );

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
          const r = await definirSenhaAction(token, tipo, senha).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
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
