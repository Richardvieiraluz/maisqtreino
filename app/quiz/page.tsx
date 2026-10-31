import { Suspense } from "react";
import { Quiz } from "@/components/quiz/Quiz";

export default function Page() {
  return (
    <Suspense>
      <Quiz />
    </Suspense>
  );
}
