"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getLayerAnnotationReport,
  getLayerCodeConnectReport,
  getLayerCodeConnectSnippet,
  getLayerComposeCode,
  getLayerCssCode,
  getLayerDevLinkReport,
  getLayerHandoffCode,
  getLayerHtmlCode,
  getLayerJsxCode,
  getLayerMeasurementReport,
  getLayerPrototypeReport,
  getLayerSvgAssetCode,
  getLayerSwiftUICode,
  getLayerVariableReport,
} from "@/features/editor/layer-codegen";
import { LayerAssetExportSection } from "@/features/editor/components/layer-asset-export-section";
import { LayerHandoffChecklistSection } from "@/features/editor/components/layer-handoff-checklist-section";
import type {
  DesignComment,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

type CodeTarget =
  | "asset"
  | "codeConnect"
  | "compose"
  | "handoff"
  | "css"
  | "html"
  | "jsx"
  | "swiftui";

type LayerCodeSectionProps = {
  layer: DesignLayer;
  layers: DesignLayer[];
  pages: DesignPage[];
  variables: Record<string, string>;
  comments: DesignComment[];
};

export function LayerCodeSection({
  layer,
  layers,
  pages,
  variables,
  comments,
}: LayerCodeSectionProps) {
  const [copiedTarget, setCopiedTarget] = useState<CodeTarget | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const annotations = useMemo(
    () => getLayerAnnotationReport(layer, comments),
    [layer, comments],
  );
  const measurements = useMemo(
    () => getLayerMeasurementReport(layer, layers),
    [layer, layers],
  );
  const codeConnect = useMemo(() => getLayerCodeConnectReport(layer), [layer]);
  const codeConnectSnippet = useMemo(
    () => getLayerCodeConnectSnippet(layer),
    [layer],
  );
  const prototype = useMemo(
    () => getLayerPrototypeReport(layer, pages),
    [layer, pages],
  );
  const devLinks = useMemo(() => getLayerDevLinkReport(layer), [layer]);
  const variableMatches = useMemo(
    () => getLayerVariableReport(layer, variables),
    [layer, variables],
  );
  const svgAssetCode = useMemo(() => getLayerSvgAssetCode(layer), [layer]);
  const handoffCode = useMemo(
    () => getLayerHandoffCode(layer, variables, comments, layers, pages),
    [layer, variables, comments, layers, pages],
  );
  const cssCode = useMemo(() => getLayerCssCode(layer), [layer]);
  const htmlCode = useMemo(() => getLayerHtmlCode(layer), [layer]);
  const jsxCode = useMemo(() => getLayerJsxCode(layer), [layer]);
  const swiftUICode = useMemo(() => getLayerSwiftUICode(layer), [layer]);
  const composeCode = useMemo(() => getLayerComposeCode(layer), [layer]);

  async function copyCode(target: CodeTarget, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(null), 1400);
  }

  function downloadSvg() {
    const blob = new Blob([svgAssetCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${getAssetFileName(layer)}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 1400);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dev Mode
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7"
            onClick={downloadSvg}
          >
            {downloaded ? (
              <Check className="size-3.5" />
            ) : (
              <Download className="size-3.5" />
            )}
            {downloaded ? "Saved" : "SVG"}
          </Button>
          <CopyButton
            copied={copiedTarget === "asset"}
            label="Asset"
            onClick={() => void copyCode("asset", svgAssetCode)}
          />
          <CopyButton
            copied={copiedTarget === "codeConnect"}
            label="Map"
            onClick={() => void copyCode("codeConnect", codeConnectSnippet)}
          />
          <CopyButton
            copied={copiedTarget === "handoff"}
            label="JSON"
            onClick={() => void copyCode("handoff", handoffCode)}
          />
          <CopyButton
            copied={copiedTarget === "html"}
            label="HTML"
            onClick={() => void copyCode("html", htmlCode)}
          />
          <CopyButton
            copied={copiedTarget === "jsx"}
            label="JSX"
            onClick={() => void copyCode("jsx", jsxCode)}
          />
          <CopyButton
            copied={copiedTarget === "swiftui"}
            label="iOS"
            onClick={() => void copyCode("swiftui", swiftUICode)}
          />
          <CopyButton
            copied={copiedTarget === "compose"}
            label="Android"
            onClick={() => void copyCode("compose", composeCode)}
          />
          <CopyButton
            copied={copiedTarget === "css"}
            label="CSS"
            onClick={() => void copyCode("css", cssCode)}
          />
        </div>
      </div>
      <div className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
        {layer.readyForDev ? "Ready for dev" : "Not marked ready for dev"}
      </div>
      <LayerHandoffChecklistSection
        layer={layer}
        pages={pages}
        variables={variables}
        comments={comments}
      />
      <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Prototype
          </div>
          <div className="text-muted-foreground">
            {prototype ? "Linked" : "No link"}
          </div>
        </div>
        {prototype ? (
          <div className="space-y-1.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-muted-foreground">Target</span>
              <span className="truncate font-medium text-foreground">
                {prototype.targetPageName}
              </span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-muted-foreground">Trigger</span>
              <span className="font-mono text-foreground">
                {prototype.trigger}
              </span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-muted-foreground">Transition</span>
              <span className="font-mono text-foreground">
                {prototype.transition} / {prototype.durationMs}ms
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            Add a prototype target in Properties
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background/50 p-3 text-xs">
        <AssetMetric label="X" value={String(measurements.bounds.x)} />
        <AssetMetric label="Y" value={String(measurements.bounds.y)} />
        <AssetMetric label="Width" value={String(measurements.bounds.width)} />
        <AssetMetric label="Height" value={String(measurements.bounds.height)} />
        <AssetMetric
          label="Center"
          value={`${measurements.bounds.centerX}, ${measurements.bounds.centerY}`}
        />
        <AssetMetric
          label="Bottom right"
          value={`${measurements.bounds.right}, ${measurements.bounds.bottom}`}
        />
        {measurements.nearestSpacing.length > 0 ? (
          <div className="col-span-2 space-y-1.5">
            {measurements.nearestSpacing.map((item) => (
              <div
                key={`${item.side}-${item.layerId}`}
                className="flex min-w-0 items-center justify-between gap-2"
              >
                <span className="truncate text-muted-foreground">
                  {item.side} to {item.layerName}
                </span>
                <span className="font-mono text-foreground">
                  {item.distance}px
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-2 text-muted-foreground">
            No neighboring layer spacing on matching axes
          </div>
        )}
      </div>
      <LayerAssetExportSection
        layer={layer}
        layers={layers}
        pages={pages}
        variables={variables}
        comments={comments}
      />
      <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Code Connect
          </div>
          <div className="text-muted-foreground">
            {codeConnect ? "Mapped" : "Unmapped"}
          </div>
        </div>
        {codeConnect ? (
          <div className="space-y-1.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-muted-foreground">Component</span>
              <span className="truncate font-mono text-foreground">
                {codeConnect.componentName}
              </span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-muted-foreground">Import</span>
              <span className="truncate font-mono text-foreground">
                {codeConnect.importPath}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            Add a component name and import path in Properties
          </div>
        )}
      </div>
      <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Variables
        </div>
        {variableMatches.length > 0 ? (
          <div className="space-y-1.5">
            {variableMatches.map((match) => (
              <div
                key={`${match.property}-${match.token}`}
                className="flex min-w-0 items-center justify-between gap-2"
              >
                <span className="truncate text-muted-foreground">
                  {match.property}
                </span>
                <span className="truncate font-mono text-foreground">
                  {match.token}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">
            No matching document variables
          </div>
        )}
      </div>
      <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Dev resources
          </div>
          <div className="text-muted-foreground">{devLinks.length}</div>
        </div>
        {devLinks.length > 0 ? (
          <div className="space-y-1.5">
            {devLinks.map((link) => (
              <a
                key={`${link.kind}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-foreground hover:bg-muted"
              >
                <span className="truncate font-medium">{link.label}</span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">
            No Storybook, GitHub, Jira, VS Code, or docs links attached
          </div>
        )}
      </div>
      <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Annotations
          </div>
          <div className="text-muted-foreground">{annotations.length}</div>
        </div>
        {annotations.length > 0 ? (
          <div className="space-y-2">
            {annotations.map((annotation) => (
              <div key={annotation.id} className="space-y-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {annotation.status === "open" ? "Open" : "Resolved"}
                  </span>
                  <span className="text-muted-foreground">
                    {annotation.relativeX}, {annotation.relativeY}
                  </span>
                </div>
                <div className="line-clamp-2 text-muted-foreground">
                  {annotation.text}
                </div>
                {annotation.replies > 0 ? (
                  <div className="text-muted-foreground">
                    {annotation.replies} replies
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">
            No comment pins inside this layer
          </div>
        )}
      </div>
      <CodeField label="SVG Asset" value={svgAssetCode} rows={6} />
      <CodeField label="Inspect JSON" value={handoffCode} rows={8} />
      <CodeField label="Code Connect" value={codeConnectSnippet} rows={8} />
      <CodeField label="HTML" value={htmlCode} rows={3} />
      <CodeField label="JSX" value={jsxCode} rows={4} />
      <CodeField label="SwiftUI" value={swiftUICode} rows={8} />
      <CodeField label="Jetpack Compose" value={composeCode} rows={8} />
      <CodeField label="CSS" value={cssCode} rows={10} />
    </section>
  );
}

function AssetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function CopyButton({
  copied,
  label,
  onClick,
}: {
  copied: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-7"
      onClick={onClick}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function getAssetFileName(layer: DesignLayer) {
  return (
    layer.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "design-layer"
  );
}

function CodeField({
  label,
  value,
  rows,
}: {
  label: string;
  value: string;
  rows: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <Textarea
        readOnly
        value={value}
        rows={rows}
        className="font-mono text-xs"
      />
    </div>
  );
}
