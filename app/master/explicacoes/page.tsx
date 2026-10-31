import { Suspense } from "react";
import { ExplicacoesMaster } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <ExplicacoesMaster />
    </Suspense>
  );
}
