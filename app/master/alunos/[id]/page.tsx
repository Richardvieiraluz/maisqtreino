import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FichaAluno } from "@/components/master/TelasMaster";
import { fichaAluno, listarProdutos } from "@/lib/dados/master";
import { supabaseConfigurado } from "@/lib/supabase/env";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigurado())
    return (
      <Suspense>
        <FichaAluno id={id} />
      </Suspense>
    );
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [ficha, produtos] = await Promise.all([fichaAluno(id), listarProdutos()]);
  if (!ficha) notFound();
  return (
    <Suspense>
      <FichaAluno id={id} ficha={ficha} produtos={produtos} />
    </Suspense>
  );
}
