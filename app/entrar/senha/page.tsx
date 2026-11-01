import { Suspense } from "react";
import { DefinirSenha } from "@/components/acesso/DefinirSenha";

export default function Page() {
  return (
    <Suspense>
      <DefinirSenha />
    </Suspense>
  );
}
