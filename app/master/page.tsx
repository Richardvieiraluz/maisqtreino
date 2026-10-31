import { Suspense } from "react";
import { PainelMaster } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <PainelMaster />
    </Suspense>
  );
}
