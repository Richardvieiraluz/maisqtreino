import { Suspense } from "react";
import { QuemParou } from "@/components/master/TelasMaster";

export default function Page() {
  return (
    <Suspense>
      <QuemParou />
    </Suspense>
  );
}
