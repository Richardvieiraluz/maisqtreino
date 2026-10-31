import { Suspense } from "react";
import { Medidas } from "@/components/evolucao/Medidas";

export default function Page() {
  return (
    <Suspense>
      <Medidas />
    </Suspense>
  );
}
