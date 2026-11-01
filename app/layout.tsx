import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";
import { getSessao } from "@/lib/auth";
import { ProvedorConta, type DadosConta } from "@/lib/conta";
import type { RespostasQuiz } from "@/lib/quiz";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "+Q Treino",
  description: "Treinos prontos, montados por mim, com valor acessível.",
  applicationName: "+Q Treino",
  appleWebApp: { capable: true, title: "+Q Treino", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

/** Conta logada para as telas (null no modo demonstração ou sem login). */
async function carregarConta(): Promise<DadosConta | null> {
  const sessao = await getSessao();
  if (!sessao) return null;
  const { data } = await createAdminClient()
    .from("respostas_quiz")
    .select("respostas")
    .eq("aluno_id", sessao.id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    id: sessao.id,
    nome: sessao.nome,
    email: sessao.email,
    papel: sessao.papel,
    estado: sessao.estado,
    programas: sessao.programas,
    quiz: (data?.respostas as RespostasQuiz | undefined) ?? null,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const conta = await carregarConta();
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorConta conta={conta}>{children}</ProvedorConta>
      </body>
    </html>
  );
}
