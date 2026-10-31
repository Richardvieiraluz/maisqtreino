import { Suspense } from "react";
import { VitrineMaster } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <VitrineMaster />
    </Suspense>
  );
}
