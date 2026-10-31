import { Suspense } from "react";
import { Inicio } from "@/components/inicio/Inicio";

export default function Page() {
  return (
    <Suspense>
      <Inicio />
    </Suspense>
  );
}
