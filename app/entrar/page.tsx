import { Suspense } from "react";
import { PrimeiroAcesso } from "@/components/acesso/PrimeiroAcesso";

export default function Page() {
  return (
    <Suspense>
      <PrimeiroAcesso />
    </Suspense>
  );
}
