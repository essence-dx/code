import { Suspense } from "react";
import { EditorShell } from "@/features/editor/components/editor-shell";

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorShell embedded />
    </Suspense>
  );
}
