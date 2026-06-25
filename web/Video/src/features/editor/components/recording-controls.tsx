"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, MonitorUp, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { recordingTimelinePresets, type RecordingMode, type RecordingTimelinePreset } from "@/lib/editor/recording-layouts";
import { createRecordingCapture, type RecordingCapture } from "@/lib/media/recording-capture";
import { saveBrowserMedia } from "@/lib/media/browser-media-store";
import type { MediaAsset } from "@/lib/editor/types";

export type RecordingResultSettings = {
  timelinePreset: RecordingTimelinePreset;
  notes: string;
};

type RecordingControlsProps = {
  onRecorded: (asset: MediaAsset, mode: RecordingMode, settings: RecordingResultSettings) => void;
};

export function RecordingControls({ onRecorded }: RecordingControlsProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cleanupRef = useRef<RecordingCapture["cleanup"] | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardNextStopRef = useRef(false);
  const countdownCancelledRef = useRef(false);
  const [mode, setMode] = useState<RecordingMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [timelinePreset, setTimelinePreset] = useState<RecordingTimelinePreset>("save-only");
  const [teleprompterText, setTeleprompterText] = useState("");
  const isBusy = Boolean(mode) || isSaving || countdownRemaining !== null;

  useEffect(
    () => () => {
      cleanupRecording({ resetPausedState: false });
    },
    [],
  );

  async function startRecording(nextMode: RecordingMode) {
    setError(null);
    countdownCancelledRef.current = false;

    if (countdownSeconds > 0) {
      setCountdownRemaining(countdownSeconds);
      const countdownCompleted = await runCountdown(
        countdownSeconds,
        setCountdownRemaining,
        () => countdownCancelledRef.current,
      );
      setCountdownRemaining(null);

      if (!countdownCompleted) {
        setError("Recording countdown canceled.");
        return;
      }
    }

    await beginRecording(nextMode);
  }

  function cancelCountdown() {
    countdownCancelledRef.current = true;
    setCountdownRemaining(null);
  }

  async function beginRecording(nextMode: RecordingMode) {
    let capture: RecordingCapture | null = null;

    try {
      if (!navigator.mediaDevices) {
        setError("Recording is not available in this browser.");
        return;
      }

      capture = await createRecordingCapture(nextMode, timelinePreset);

      chunksRef.current = [];
      cleanupRef.current = capture.cleanup;
      const recordingStream = capture.stream;
      const mimeType = preferredMimeType(nextMode);
      const recorder = mimeType ? new MediaRecorder(recordingStream, { mimeType }) : new MediaRecorder(recordingStream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("Recording stopped unexpectedly.");
      };
      recorder.onstop = () => {
        void finishRecording(nextMode, recorder);
      };
      recorder.start();
      recorderRef.current = recorder;
      discardNextStopRef.current = false;
      setIsPaused(false);
      setMode(nextMode);
    } catch (recordingError) {
      capture?.cleanup();
      recorderRef.current = null;
      cleanupRef.current = null;
      chunksRef.current = [];
      setIsPaused(false);
      setError(recordingFailureMessage(nextMode, recordingError));
      setMode(null);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    cleanupRecording();
    setMode(null);
  }

  function pauseRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    setIsPaused(true);
  }

  function resumeRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    recorder.resume();
    setIsPaused(false);
  }

  function discardRecording() {
    discardNextStopRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    cleanupRecording();
    setMode(null);
    setError("Recording discarded.");
  }

  async function finishRecording(nextMode: RecordingMode, recorder: MediaRecorder) {
    if (discardNextStopRef.current) {
      discardNextStopRef.current = false;
      cleanupRecording();
      setMode(null);
      setIsPaused(false);
      setError("Recording discarded.");
      return;
    }

    setIsSaving(true);

    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      if (blob.size === 0) {
        setError("Recording did not capture media.");
        return;
      }

      const file = new File([blob], recordingFilename(nextMode, blob.type), { type: blob.type });
      onRecorded(await saveBrowserMedia(file), nextMode, {
        timelinePreset,
        notes: teleprompterText.trim(),
      });
      setError(null);
    } catch {
      setError("Recording could not be saved. Try again.");
    } finally {
      cleanupRecording();
      setMode(null);
      setIsPaused(false);
      setIsSaving(false);
    }
  }

  function cleanupRecording(options: { resetPausedState?: boolean } = {}) {
    recorderRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    chunksRef.current = [];
    if (options.resetPausedState ?? true) {
      setIsPaused(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="grid grid-cols-3 gap-2">
        {[0, 3, 5].map((seconds) => (
          <Button
            key={seconds}
            size="sm"
            variant={countdownSeconds === seconds ? "secondary" : "outline"}
            disabled={isBusy}
            onClick={() => setCountdownSeconds(seconds)}
          >
            {seconds === 0 ? "No count" : `${seconds}s`}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {recordingTimelinePresets.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant={timelinePreset === preset.id ? "secondary" : "outline"}
            disabled={isBusy}
            className="px-1 text-xs"
            onClick={() => setTimelinePreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Textarea
        value={teleprompterText}
        onChange={(event) => setTeleprompterText(event.target.value)}
        placeholder="Teleprompter notes"
        disabled={isSaving}
        className="min-h-20 resize-none text-xs"
      />
      {countdownRemaining !== null ? (
        <div className="grid gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-center">
          <span className="text-2xl font-semibold tabular-nums">{countdownRemaining}</span>
          <Button size="sm" variant="outline" onClick={cancelCountdown}>
            Cancel
          </Button>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => startRecording("screen")}>
          <MonitorUp className="size-4" />
          Screen
        </Button>
        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => startRecording("camera")}>
          <Camera className="size-4" />
          Camera
        </Button>
        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => startRecording("voiceover")}>
          <Mic className="size-4" />
          Voice
        </Button>
        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => startRecording("screen-camera")}>
          <Camera className="size-4" />
          Studio
        </Button>
      </div>
      {mode ? (
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" onClick={isPaused ? resumeRecording : pauseRecording} disabled={isSaving}>
            {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="outline" onClick={discardRecording} disabled={isSaving}>
            <RotateCcw className="size-4" />
            Retake
          </Button>
          <Button size="sm" variant="destructive" onClick={stopRecording} disabled={isSaving}>
            <Square className="size-4" />
            {isSaving ? "Saving" : "Save"}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function preferredMimeType(mode: RecordingMode) {
  const options =
    mode === "voiceover"
      ? ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
      : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((type) => MediaRecorder.isTypeSupported(type));
}

function recordingFilename(mode: RecordingMode, mimeType: string) {
  const extension = mimeType.includes("ogg") ? "ogg" : "webm";
  return `${mode}-recording-${Date.now()}.${extension}`;
}

async function runCountdown(seconds: number, onTick: (remaining: number | null) => void, isCanceled: () => boolean) {
  for (let remaining = seconds; remaining > 0; remaining -= 1) {
    if (isCanceled()) return false;
    onTick(remaining);
    await delay(1000);
    if (isCanceled()) return false;
  }

  return true;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function recordingFailureMessage(mode: RecordingMode, error: unknown) {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    if (mode === "screen") return "Screen recording permission was not granted.";
    if (mode === "camera") return "Camera permission was not granted.";
    if (mode === "screen-camera") return "Screen and camera recording permission was not granted.";
    return "Microphone permission was not granted.";
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    if (mode === "screen") return "No screen source is available to record.";
    if (mode === "camera") return "No camera or microphone is available.";
    if (mode === "screen-camera") return "No screen source, camera, or microphone is available.";
    return "No microphone is available.";
  }

  return "Recording could not start.";
}
