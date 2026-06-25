"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { saveLocalProject } from "@/lib/projects/local-project-store";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function LocalSaveButton({ project, mediaAssets }: { project: EditorProject; mediaAssets: MediaAsset[] }) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("Save locally");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  async function save() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus("saving");
    setMessage("Saving...");

    try {
      await saveLocalProject(project, mediaAssets);
      setStatus("saved");
      setMessage("Saved locally");
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
        setMessage("Save locally");
      }, 1600);
    } catch {
      setStatus("error");
      setMessage("Local save failed. Try again.");
    }
  }

  const Icon = status === "saving" ? Loader2 : status === "saved" ? CheckCircle2 : status === "error" ? AlertCircle : Save;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="outline" onClick={save} disabled={status === "saving"} aria-label={message}>
          <Icon className={`size-4 ${status === "saving" ? "animate-spin" : ""}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}
