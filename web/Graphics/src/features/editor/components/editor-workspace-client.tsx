"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorWorkspace } from "@/features/editor/components/editor-workspace";
import type { EditorWorkspaceProps } from "@/features/editor/components/editor-workspace";

export function EditorWorkspaceClient(props: EditorWorkspaceProps) {
  useEffect(() => {
    document.body.dataset.editorClientReady = "true";

    return () => {
      delete document.body.dataset.editorClientReady;
    };
  }, []);

  return (
    <TooltipProvider delayDuration={250}>
      <EditorWorkspace {...props} />
    </TooltipProvider>
  );
}
