import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubtelaPerfil, type Subtela } from "@/components/perfil/SubtelasPerfil";

// A lista fica aqui: constantes de um módulo "use client" não chegam ao servidor como valor.
const TELAS: Subtela[] = ["dados", "equipamentos", "lembretes", "faq", "termos"];

export function generateStaticParams() {
  return TELAS.map((sub) => ({ sub }));
}

export default async function Page({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  if (!TELAS.includes(sub as Subtela)) notFound();
  return (
    <Suspense>
      <SubtelaPerfil tela={sub as Subtela} />
    </Suspense>
  );
}
