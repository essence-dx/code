"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  templateThemeVariants,
  type TemplateThemeVariantId,
} from "../template-theme-variants"

type TemplateThemeStripProps = {
  selectedVariantId: TemplateThemeVariantId
  onSelectVariant: (variantId: TemplateThemeVariantId) => void
}

export function TemplateThemeStrip({
  selectedVariantId,
  onSelectVariant,
}: TemplateThemeStripProps) {
  return (
    <div className="grid gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        Theme preview
      </div>
      <div className="grid grid-cols-5 gap-2">
        {templateThemeVariants.map((variant) => {
          const selected = variant.id === selectedVariantId

          return (
            <button
              key={variant.id}
              type="button"
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-md border p-1.5 text-left shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected && "ring-2 ring-ring ring-offset-2",
              )}
              aria-label={`Preview ${variant.label} theme`}
              title={variant.description}
              onClick={() => onSelectVariant(variant.id)}
              style={{
                backgroundColor: variant.background,
                borderColor: variant.border,
              }}
            >
              <span
                className="block h-1.5 w-8 rounded-full"
                style={{ backgroundColor: variant.text }}
              />
              <span className="mt-2 grid grid-cols-2 gap-1">
                <span
                  className="h-4 rounded-sm"
                  style={{ backgroundColor: variant.accent }}
                />
                <span
                  className="h-4 rounded-sm"
                  style={{ backgroundColor: variant.border }}
                />
              </span>
              <span
                className="mt-1 block truncate text-[10px] font-medium"
                style={{ color: variant.text }}
              >
                {variant.fontLabel}
              </span>
              {selected ? (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-background/90 text-foreground shadow-sm">
                  <Check className="size-3" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
