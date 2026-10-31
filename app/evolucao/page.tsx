import { Suspense } from "react";
import { Evolucao } from "@/components/evolucao/Evolucao";

export default function Page() {
  return (
    <Suspense>
      <Evolucao />
    </Suspense>
  );
}
