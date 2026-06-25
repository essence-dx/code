"use client"

import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

import {
  normalizeImageCorrection,
  normalizeImageOpacity,
} from "../image-corrections"

type ImageCorrectionKey =
  | "imageOpacity"
  | "imageBrightness"
  | "imageContrast"
  | "imageSaturation"

type ImageCorrectionControlsProps = {
  opacity: number
  brightness: number
  contrast: number
  saturation: number
  onChange: (patch: Partial<Record<ImageCorrectionKey, number>>) => void
}

const controls: Array<{
  key: ImageCorrectionKey
  label: string
  valueKey: "opacity" | "brightness" | "contrast" | "saturation"
  max: number
}> = [
  { key: "imageOpacity", label: "Opacity", valueKey: "opacity", max: 100 },
  { key: "imageBrightness", label: "Brightness", valueKey: "brightness", max: 200 },
  { key: "imageContrast", label: "Contrast", valueKey: "contrast", max: 200 },
  { key: "imageSaturation", label: "Saturation", valueKey: "saturation", max: 200 },
]

function sliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value
}

export function ImageCorrectionControls({
  opacity,
  brightness,
  contrast,
  saturation,
  onChange,
}: ImageCorrectionControlsProps) {
  const values = { opacity, brightness, contrast, saturation }

  return (
    <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">
          Adjustments
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reset image corrections"
          title="Reset image corrections"
          onClick={() =>
            onChange({
              imageBrightness: 100,
              imageContrast: 100,
              imageOpacity: 100,
              imageSaturation: 100,
            })
          }
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      {controls.map((control) => {
        const value =
          control.key === "imageOpacity"
            ? normalizeImageOpacity(values[control.valueKey])
            : normalizeImageCorrection(values[control.valueKey])
        const normalize =
          control.key === "imageOpacity"
            ? normalizeImageOpacity
            : normalizeImageCorrection

        return (
          <label
            key={control.key}
            className="grid gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <span className="flex items-center justify-between gap-2">
              {control.label}
              <Input
                className="h-7 w-16 text-right"
                type="number"
                min={0}
                max={control.max}
                step={5}
                value={value}
                onChange={(event) =>
                  onChange({
                    [control.key]: normalize(Number(event.currentTarget.value)),
                  })
                }
              />
            </span>
            <Slider
              min={0}
              max={control.max}
              step={5}
              value={[value]}
              onValueChange={(nextValue) =>
                onChange({
                  [control.key]: normalize(sliderValue(nextValue)),
                })
              }
            />
          </label>
        )
      })}
    </div>
  )
}
