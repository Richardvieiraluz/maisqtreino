import { Suspense } from "react";
import { FunilMaster } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <FunilMaster />
    </Suspense>
  );
}
