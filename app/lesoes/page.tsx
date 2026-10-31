import { Suspense } from "react";
import { TrilhaLesoes } from "@/components/lesoes/TrilhaLesoes";

export default function Page() {
  return (
    <Suspense>
      <TrilhaLesoes />
    </Suspense>
  );
}
