import { Suspense } from "react";
import { ProtocolosMaster } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <ProtocolosMaster />
    </Suspense>
  );
}
