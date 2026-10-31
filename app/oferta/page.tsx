import { Suspense } from "react";
import { Oferta } from "@/components/assinatura/Oferta";

export default function Page() {
  return (
    <Suspense>
      <Oferta />
    </Suspense>
  );
}
