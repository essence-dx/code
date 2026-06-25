import { Suspense } from "react";
import { EditorWorkspace } from "@/features/editor/components/editor-workspace";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <EditorWorkspace embedded />
    </Suspense>
  );
}
