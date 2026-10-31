import { Suspense } from "react";
import { FotosCorpo } from "@/components/evolucao/FotosCorpo";

export default function Page() {
  return (
    <Suspense>
      <FotosCorpo />
    </Suspense>
  );
}
