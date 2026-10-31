import { Suspense } from "react";
import { AbaEmBreve } from "@/components/abas/AbaEmBreve";

export default function Page() {
  return (
    <Suspense>
      <AbaEmBreve titulo="Perfil" nota="Dados, equipamentos, lembretes e assinatura. Entra na próxima etapa do desenvolvimento." />
    </Suspense>
  );
}
