import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/env";

// Master só para quem tem papel 'master' no banco. No modo demonstração continua aberto.
export default async function LayoutMasterRota({ children }: { children: ReactNode }) {
  if (supabaseConfigurado()) {
    const sessao = await getSessao();
    if (!sessao) redirect("/entrar");
    if (sessao.papel !== "master") redirect("/");
  }
  return children;
}
