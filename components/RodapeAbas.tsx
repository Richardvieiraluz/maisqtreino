"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo } from "@/lib/demo";

const ABAS = [
  { href: "/", rotulo: "Início" },
  { href: "/plano", rotulo: "Meu plano" },
  { href: "/evolucao", rotulo: "Evolução" },
  { href: "/perfil", rotulo: "Perfil" },
];

export function RodapeAbas() {
  const caminho = usePathname();
  const { qs } = useDemo();
  return (
    <nav className="abas" aria-label="Navegação principal">
      {ABAS.map((a) => {
        const ativa = a.href === "/" ? caminho === "/" : caminho.startsWith(a.href);
        return (
          <Link key={a.href} href={a.href + qs} aria-current={ativa ? "page" : undefined}>
            <span>{a.rotulo}</span>
            <i />
          </Link>
        );
      })}
    </nav>
  );
}
