"use client";

import { Mic, RotateCcw, Save, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration } from "@/features/audio/format";
import { useObjectUrl } from "@/hooks/use-object-url";

type RecorderState = "idle" | "recording" | "ready";

type RecordPanelProps = {
  onSave: (blob: Blob, title: string) => Promise<unknown>;
};

export function RecordPanel({ onSave }: RecordPanelProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [title, setTitle] = useState("Voice note");
  const [recording, setRecording] = useState<Blob | undefined>();
  const [saving, setSaving] = useState(false);
  const recordingUrl = useObjectUrl(recording);

  useEffect(() => {
    if (state !== "recording") {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);

    return () => window.clearInterval(interval);
  }, [state]);

  useEffect(() => () => stopStream(), []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        setRecording(new Blob(chunksRef.current, { type: mimeType }));
        setState("ready");
        stopStream();
      };

      recorder.start();
      setState("recording");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start recording.",
      );
      stopStream();
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }

  async function saveRecording() {
    if (!recording) {
      return;
    }

    setSaving(true);
    try {
      await onSave(recording, title);
      setRecording(undefined);
      setState("idle");
      setElapsedMs(0);
    } finally {
      setSaving(false);
    }
  }

  function discardRecording() {
    setRecording(undefined);
    setState("idle");
    setElapsedMs(0);
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  return (
    <div className="flex min-h-52 flex-col justify-between gap-4 rounded-md border border-white/10 bg-white/[0.035] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex size-12 items-center justify-center rounded-md bg-rose-300/15 text-rose-200">
            <Mic className="size-5" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-medium">Record audio</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Capture vocals, ideas, or rough hooks directly into the library.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm">
          {formatDuration(elapsedMs)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="recording-title">Title</Label>
          <Input
            id="recording-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {state === "recording" ? (
            <Button variant="destructive" className="gap-2" onClick={stopRecording}>
              <Square className="size-4" />
              Stop
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="gap-2"
              disabled={saving}
              onClick={startRecording}
            >
              <Mic className="size-4" />
              Record
            </Button>
          )}
          <Button
            className="gap-2"
            disabled={!recording || saving || state === "recording"}
            onClick={saveRecording}
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </div>
      {recordingUrl ? (
        <div className="grid gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <audio controls className="w-full" src={recordingUrl} />
          <Button
            variant="ghost"
            className="gap-2"
            disabled={saving}
            onClick={discardRecording}
          >
            <RotateCcw className="size-4" />
            Discard
          </Button>
        </div>
      ) : null}
    </div>
  );
}
