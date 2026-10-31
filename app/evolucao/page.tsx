import { Suspense } from "react";
import { AbaEmBreve } from "@/components/abas/AbaEmBreve";

export default function Page() {
  return (
    <Suspense>
      <AbaEmBreve titulo="Evolução" nota="Mapa muscular da semana, gráficos, fotos e medidas. Entra na próxima etapa do desenvolvimento." />
    </Suspense>
  );
}
