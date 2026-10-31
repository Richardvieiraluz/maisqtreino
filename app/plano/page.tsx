import { Suspense } from "react";
import { MeuPlano } from "@/components/plano/MeuPlano";

export default function Page() {
  return (
    <Suspense>
      <MeuPlano />
    </Suspense>
  );
}
