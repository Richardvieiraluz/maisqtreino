import { Suspense } from "react";
import { Stories } from "@/components/stories/Stories";

export default function Page() {
  return (
    <Suspense>
      <Stories />
    </Suspense>
  );
}
