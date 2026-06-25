"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getDesignTokenAndroid,
  getDesignTokenCss,
  getDesignTokenSwift,
  getDesignTokenJson,
  getDesignTokenTailwind,
  type DesignTokenExportInput,
} from "@/features/editor/design-token-export";

type ExportTarget = "json" | "css" | "tailwind" | "swift" | "android";

type DesignTokenExportSectionProps = DesignTokenExportInput;

export function DesignTokenExportSection(props: DesignTokenExportSectionProps) {
  const [copiedTarget, setCopiedTarget] = useState<ExportTarget | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ExportTarget>("css");
  const jsonTokens = useMemo(() => getDesignTokenJson(props), [props]);
  const cssTokens = useMemo(() => getDesignTokenCss(props), [props]);
  const tailwindTokens = useMemo(() => getDesignTokenTailwind(props), [props]);
  const swiftTokens = useMemo(() => getDesignTokenSwift(props), [props]);
  const androidTokens = useMemo(() => getDesignTokenAndroid(props), [props]);
  const tokenOutputs = {
    json: jsonTokens,
    css: cssTokens,
    tailwind: tailwindTokens,
    swift: swiftTokens,
    android: androidTokens,
  } satisfies Record<ExportTarget, string>;

  async function copyTokens(target: ExportTarget, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(null), 1400);
  }

  function downloadJson() {
    const blob = new Blob([jsonTokens], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "essence-design-tokens.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Token export
        </div>
        <div className="text-xs text-muted-foreground">
          {Object.keys(props.variableDefinitions).length +
            Object.keys(props.paintStyles).length +
            Object.keys(props.textStyles).length +
            Object.keys(props.effectStyles).length +
            Object.keys(props.layoutGridStyles).length +
            Object.keys(props.layoutPresetStyles).length +
            Object.keys(props.variableCollections).length}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {exportTargets.map((target) => (
          <Button
            key={target.id}
            type="button"
            variant={previewTarget === target.id ? "secondary" : "outline"}
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => {
              setPreviewTarget(target.id);
              void copyTokens(target.id, tokenOutputs[target.id]);
            }}
          >
            {copiedTarget === target.id ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {target.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1 px-2 text-xs"
          onClick={downloadJson}
        >
          <Download className="size-3.5" />
          File
        </Button>
      </div>
      <pre className="max-h-40 overflow-auto rounded-md border border-border bg-background/50 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        {tokenOutputs[previewTarget]}
      </pre>
    </div>
  );
}

const exportTargets = [
  { id: "json", label: "JSON" },
  { id: "css", label: "CSS" },
  { id: "tailwind", label: "TW" },
  { id: "swift", label: "iOS" },
  { id: "android", label: "Android" },
] as const satisfies ReadonlyArray<{ id: ExportTarget; label: string }>;
