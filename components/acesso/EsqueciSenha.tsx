"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAvisoRapido } from "../AvisoRapido";
import { BotaoVoltar } from "../quiz/pecas";

const REENVIO_S = 59;

/** Esqueci a senha: link de 1 hora por e-mail, com reenvio a cada 59 s.
 *  O envio real entra com o Supabase Auth. */
export function EsqueciSenha() {
  const router = useRouter();
  const aviso = useAvisoRapido();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [espera, setEspera] = useState(0);
  const valido = /.+@.+\..+/.test(email);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const voltar = () => router.push("/entrar");
  const tela: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))" };
  const titulo: React.CSSProperties = { marginBottom: 12, fontSize: 48, fontStretch: "68%", lineHeight: 0.9 };

  return (
    <main className="app">
      <div className="topo-seguro" />
      <div style={{ flex: "none", display: "flex", alignItems: "center", height: 48, padding: "8px 20px 0" }}>
        <BotaoVoltar onClick={voltar} />
      </div>
      {!enviado ? (
        <form
          style={tela}
          onSubmit={(e) => {
            e.preventDefault();
            if (!valido) return aviso.mostrar("Digite o e-mail da compra.");
            setEnviado(true);
            setEspera(REENVIO_S);
          }}
        >
          <h1 className="titulo-tela" style={titulo}>
            Criar uma senha <span className="destaque">nova</span>
          </h1>
          <p className="texto" style={{ color: "var(--ink-2)", marginBottom: 24 }}>
            Use o e-mail da compra. Mandamos um link que vale por 1 hora.
          </p>
          <label htmlFor="email-rec" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: "var(--ink-2)", marginBottom: 6 }}>
            E-MAIL
          </label>
          <input id="email-rec" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" style={{ height: 52, border: "1px solid #111", padding: "0 14px", fontSize: 16, color: "#111" }} />
          <button type="submit" className="botao botao--primario" style={{ marginTop: "auto", background: valido ? "#111" : "var(--track)" }}>
            Enviar link
          </button>
        </form>
      ) : (
        <div style={tela}>
          <h1 className="titulo-tela" style={titulo}>
            Confira seu <span className="destaque">e-mail</span>
          </h1>
          <p className="texto">
            Mandamos o link para <b style={{ fontWeight: 800 }}>{email}</b>. Abra no celular para criar a senha e entrar direto no app.
          </p>
          <div className="ajuste" style={{ marginTop: 20 }}>
            <b>Não chegou?</b> Olhe a caixa de spam e as promoções. O remetente é o mesmo da compra.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            <button
              type="button"
              className="botao"
              disabled={espera > 0}
              style={{ background: "#fff", border: `2px solid ${espera > 0 ? "var(--line)" : "#111"}`, color: espera > 0 ? "var(--ink-2)" : "#111" }}
              onClick={() => {
                setEspera(REENVIO_S);
                aviso.mostrar("Link reenviado.");
              }}
            >
              {espera > 0 ? `Reenviar em 0:${String(espera).padStart(2, "0")}` : "Reenviar link"}
            </button>
            <button type="button" className="botao botao--primario" onClick={voltar}>
              Voltar ao login
            </button>
          </div>
        </div>
      )}
      {aviso.elemento}
    </main>
  );
}
