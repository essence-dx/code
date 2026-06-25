"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FreezeFramePanelProps {
  onCreate: () => Promise<{ created: number; skipped: number }>;
}

export function FreezeFramePanel({ onCreate }: FreezeFramePanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  async function createFreezeFrame() {
    setIsCapturing(true);
    setMessage(null);

    try {
      const result = await onCreate();
      if (result.created > 0) {
        setMessage(`${result.created} freeze frame${result.created === 1 ? "" : "s"} added.`);
        return;
      }
      setMessage(result.skipped > 0 ? "Selected video could not be captured." : "Select a connected video layer.");
    } catch {
      setMessage("Freeze frame could not be created.");
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Camera className="size-4 text-muted-foreground" />
        Freeze frame
      </div>
      <Button className="w-full" variant="outline" onClick={createFreezeFrame} disabled={isCapturing}>
        {isCapturing ? "Capturing..." : "Capture playhead still"}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
