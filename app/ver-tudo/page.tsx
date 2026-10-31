import { Suspense } from "react";
import { VerTudo } from "@/components/busca/Busca";

export default function Page() {
  return (
    <Suspense>
      <VerTudo />
    </Suspense>
  );
}
