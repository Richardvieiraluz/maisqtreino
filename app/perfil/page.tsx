import { Suspense } from "react";
import { Perfil } from "@/components/perfil/Perfil";

export default function Page() {
  return (
    <Suspense>
      <Perfil />
    </Suspense>
  );
}
