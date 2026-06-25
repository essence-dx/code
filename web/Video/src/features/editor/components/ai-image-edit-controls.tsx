"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AiImageEditMode, AiImageOutpaintPreset } from "@/lib/ai/schemas";

const editModes: Array<{ id: AiImageEditMode; label: string }> = [
  { id: "cleanup", label: "Cleanup" },
  { id: "inpaint", label: "Inpaint" },
  { id: "outpaint", label: "Outpaint" },
  { id: "background-removal", label: "BG remove" },
  { id: "translate", label: "Translate" },
];

const outpaintPresets: Array<{ id: AiImageOutpaintPreset; label: string }> = [
  { id: "project", label: "Project" },
  { id: "square", label: "Square" },
  { id: "vertical", label: "Vertical" },
  { id: "wide", label: "Wide" },
];

export function AiImageEditControls({
  targetName,
  maskCount,
  mode,
  outpaintPreset,
  targetLanguage,
  onModeChange,
  onOutpaintPresetChange,
  onTargetLanguageChange,
}: {
  targetName?: string;
  maskCount: number;
  mode: AiImageEditMode;
  outpaintPreset: AiImageOutpaintPreset;
  targetLanguage: string;
  onModeChange: (mode: AiImageEditMode) => void;
  onOutpaintPresetChange: (preset: AiImageOutpaintPreset) => void;
  onTargetLanguageChange: (language: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
      <div className="truncate">{targetName ? `Editing ${targetName}` : "Select an image layer to edit."}</div>
      <div className="grid grid-cols-3 gap-1">
        {editModes.map((item) => (
          <Button key={item.id} size="sm" variant={mode === item.id ? "secondary" : "outline"} onClick={() => onModeChange(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      {mode === "inpaint" ? (
        <div className={maskCount > 0 ? "text-muted-foreground" : "text-destructive"}>{maskCount} object mask{maskCount === 1 ? "" : "s"} selected</div>
      ) : null}
      {mode === "outpaint" ? (
        <div className="grid grid-cols-4 gap-1">
          {outpaintPresets.map((item) => (
            <Button key={item.id} size="sm" variant={outpaintPreset === item.id ? "secondary" : "outline"} onClick={() => onOutpaintPresetChange(item.id)}>
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
      {mode === "translate" ? (
        <Input
          className="h-8 text-xs"
          value={targetLanguage}
          maxLength={80}
          onChange={(event) => onTargetLanguageChange(event.target.value)}
          placeholder="Target language"
        />
      ) : null}
    </div>
  );
}
