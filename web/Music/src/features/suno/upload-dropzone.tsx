"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type UploadDropzoneProps = {
  onFiles: (files: File[]) => void | Promise<void>;
};

export function UploadDropzone({ onFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [intake, setIntake] = useState<{
    accepted: number;
    rejected: number;
  }>({ accepted: 0, rejected: 0 });

  function handleFiles(files: File[]) {
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
    setIntake({
      accepted: audioFiles.length,
      rejected: files.length - audioFiles.length,
    });

    if (audioFiles.length) {
      void onFiles(audioFiles);
    } else {
      void onFiles(files);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-white/15 bg-white/[0.035] p-6 text-center transition",
        dragging && "border-emerald-300 bg-emerald-300/10",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <div className="flex size-12 items-center justify-center rounded-md bg-emerald-300/15 text-emerald-200">
        <Upload className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Import audio</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Drop MP3, WAV, M4A, or FLAC files for playback, editing, and lyrics.
        </p>
      </div>
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        Choose files
      </Button>
      {intake.accepted || intake.rejected ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Badge className="bg-emerald-400/15 text-emerald-200">
            accepted: {intake.accepted}
          </Badge>
          {intake.rejected ? (
            <Badge className="bg-amber-400/15 text-amber-100">
              skipped: {intake.rejected}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
