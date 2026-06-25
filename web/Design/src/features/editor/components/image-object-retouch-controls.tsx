"use client";

import { Brush, Copy, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdjustmentSlider,
  Field,
} from "@/features/editor/components/property-fields";
import {
  createObjectRetouchDataUrl,
  defaultObjectRetouchBrushSize,
  defaultObjectRetouchSoftness,
  defaultObjectRetouchSourceX,
  defaultObjectRetouchSourceY,
  defaultObjectRetouchTargetX,
  defaultObjectRetouchTargetY,
  defaultObjectRetouchTool,
  getImageObjectRetouchSettings,
  normalizeObjectRetouchTool,
  normalizeRetouchBrushSize,
  normalizeRetouchCoordinate,
  normalizeRetouchSoftness,
} from "@/features/editor/image-object-retouch";
import type {
  DesignElement,
  ImageElement,
  ObjectRetouchTool,
} from "@/features/editor/types";

const retouchTools = [
  {
    value: "erase",
    label: "Erase",
    icon: Brush,
  },
  {
    value: "clone",
    label: "Clone",
    icon: Copy,
  },
  {
    value: "heal",
    label: "Heal",
    icon: Sparkles,
  },
] satisfies Array<{
  value: ObjectRetouchTool;
  label: string;
  icon: typeof Brush;
}>;

export function ImageObjectRetouchControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const settings = getImageObjectRetouchSettings(element);
  const hasOriginal = Boolean(element.objectRetouchOriginalSrc);
  const usesSource = settings.tool === "clone" || settings.tool === "heal";

  function updateSettings(updates: Partial<ImageElement>) {
    setMessage(null);
    onUpdateElement(updates as Partial<DesignElement>);
  }

  async function applyRetouch() {
    setIsProcessing(true);
    setMessage(null);

    try {
      const originalSrc = element.objectRetouchOriginalSrc ?? element.src;
      const src = await createObjectRetouchDataUrl({
        src: element.src,
        ...settings,
      });

      onUpdateElement({
        src,
        objectRetouchOriginalSrc: originalSrc,
        objectRetouchApplied: true,
        objectRetouchTool: settings.tool,
        objectRetouchTargetX: settings.targetX,
        objectRetouchTargetY: settings.targetY,
        objectRetouchSourceX: settings.sourceX,
        objectRetouchSourceY: settings.sourceY,
        objectRetouchBrushSize: settings.brushSize,
        objectRetouchSoftness: settings.softness,
      } as Partial<DesignElement>);
      setMessage("Retouch applied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retouch failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  function restoreRetouchOriginal() {
    if (!element.objectRetouchOriginalSrc) return;

    onUpdateElement({
      src: element.objectRetouchOriginalSrc,
      objectRetouchOriginalSrc: undefined,
      objectRetouchApplied: false,
      objectRetouchTool: defaultObjectRetouchTool,
      objectRetouchTargetX: defaultObjectRetouchTargetX,
      objectRetouchTargetY: defaultObjectRetouchTargetY,
      objectRetouchSourceX: defaultObjectRetouchSourceX,
      objectRetouchSourceY: defaultObjectRetouchSourceY,
      objectRetouchBrushSize: defaultObjectRetouchBrushSize,
      objectRetouchSoftness: defaultObjectRetouchSoftness,
    } as Partial<DesignElement>);
    setMessage("Retouch restored.");
  }

  return (
    <Field label="Object retouch">
      <div className="space-y-4">
        <Field label="Tool">
          <Select
            value={settings.tool}
            onValueChange={(objectRetouchTool) =>
              updateSettings({
                objectRetouchTool: normalizeObjectRetouchTool(
                  objectRetouchTool,
                ),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {retouchTools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <SelectItem key={tool.value} value={tool.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {tool.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </Field>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Target {settings.targetX}% / {settings.targetY}%
          {usesSource
            ? ` / Source ${settings.sourceX}% / ${settings.sourceY}%`
            : ""}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AdjustmentSlider
            label="Target X"
            value={settings.targetX}
            min={0}
            max={100}
            suffix="%"
            onChange={(objectRetouchTargetX) =>
              updateSettings({
                objectRetouchTargetX: normalizeRetouchCoordinate(
                  objectRetouchTargetX,
                ),
              })
            }
          />
          <AdjustmentSlider
            label="Target Y"
            value={settings.targetY}
            min={0}
            max={100}
            suffix="%"
            onChange={(objectRetouchTargetY) =>
              updateSettings({
                objectRetouchTargetY: normalizeRetouchCoordinate(
                  objectRetouchTargetY,
                ),
              })
            }
          />
        </div>

        {usesSource ? (
          <div className="grid grid-cols-2 gap-3">
            <AdjustmentSlider
              label="Source X"
              value={settings.sourceX}
              min={0}
              max={100}
              suffix="%"
              onChange={(objectRetouchSourceX) =>
                updateSettings({
                  objectRetouchSourceX: normalizeRetouchCoordinate(
                    objectRetouchSourceX,
                  ),
                })
              }
            />
            <AdjustmentSlider
              label="Source Y"
              value={settings.sourceY}
              min={0}
              max={100}
              suffix="%"
              onChange={(objectRetouchSourceY) =>
                updateSettings({
                  objectRetouchSourceY: normalizeRetouchCoordinate(
                    objectRetouchSourceY,
                  ),
                })
              }
            />
          </div>
        ) : null}

        <AdjustmentSlider
          label="Brush"
          value={settings.brushSize}
          min={1}
          max={100}
          suffix="%"
          onChange={(objectRetouchBrushSize) =>
            updateSettings({
              objectRetouchBrushSize: normalizeRetouchBrushSize(
                objectRetouchBrushSize,
              ),
            })
          }
        />
        <AdjustmentSlider
          label="Softness"
          value={settings.softness}
          min={0}
          max={100}
          suffix="%"
          onChange={(objectRetouchSoftness) =>
            updateSettings({
              objectRetouchSoftness: normalizeRetouchSoftness(
                objectRetouchSoftness,
              ),
            })
          }
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={applyRetouch}
            disabled={isProcessing}
          >
            <Brush className="h-4 w-4" />
            {isProcessing ? "Applying" : "Apply retouch"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restoreRetouchOriginal}
            disabled={!hasOriginal || isProcessing}
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
        </div>

        {message ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {message}
          </p>
        ) : null}
      </div>
    </Field>
  );
}
