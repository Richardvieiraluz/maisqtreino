import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetalheTreino } from "@/components/detalhe/DetalheTreino";
import { PROGRAMA_GLUTEO } from "@/lib/plano";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = /^protocolo-(\d{2})$/.exec(id);
  const valido = id === PROGRAMA_GLUTEO.id || (m && +m[1] >= 1 && +m[1] <= 24);
  if (!valido) notFound();
  return (
    <Suspense>
      <DetalheTreino id={id} />
    </Suspense>
  );
}
