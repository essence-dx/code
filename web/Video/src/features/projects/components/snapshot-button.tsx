"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import { createLocalProjectSnapshot } from "@/lib/projects/local-project-store";

type SnapshotStatus = "idle" | "saving" | "saved" | "error";

export function SnapshotButton({ project, mediaAssets }: { project: EditorProject; mediaAssets: MediaAsset[] }) {
  const [status, setStatus] = useState<SnapshotStatus>("idle");
  const [message, setMessage] = useState("Create checkpoint");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  async function createSnapshot() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus("saving");
    setMessage("Creating checkpoint...");

    try {
      await createLocalProjectSnapshot(project, mediaAssets);
      setStatus("saved");
      setMessage("Checkpoint created");
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
        setMessage("Create checkpoint");
      }, 1600);
    } catch {
      setStatus("error");
      setMessage("Checkpoint failed. Try again.");
    }
  }

  const Icon = status === "saving" ? Loader2 : status === "saved" ? CheckCircle2 : status === "error" ? AlertCircle : History;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="outline" onClick={createSnapshot} disabled={status === "saving"} aria-label={message}>
          <Icon className={`size-4 ${status === "saving" ? "animate-spin" : ""}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}
