import { Suspense } from "react";
import { AbaEmBreve } from "@/components/abas/AbaEmBreve";

export default function Page() {
  return (
    <Suspense>
      <AbaEmBreve titulo="Meu plano" nota="Protocolo de 24 treinos e programas comprados. Entra na próxima etapa do desenvolvimento." />
    </Suspense>
  );
}
