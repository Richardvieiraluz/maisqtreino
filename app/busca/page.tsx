import { Suspense } from "react";
import { Busca } from "@/components/busca/Busca";

export default function Page() {
  return (
    <Suspense>
      <Busca />
    </Suspense>
  );
}
