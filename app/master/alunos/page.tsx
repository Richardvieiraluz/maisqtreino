import { Suspense } from "react";
import { AlunosMaster } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <AlunosMaster />
    </Suspense>
  );
}
