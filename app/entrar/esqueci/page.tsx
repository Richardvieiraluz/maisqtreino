import { Suspense } from "react";
import { EsqueciSenha } from "@/components/acesso/EsqueciSenha";

export default function Page() {
  return (
    <Suspense>
      <EsqueciSenha />
    </Suspense>
  );
}
