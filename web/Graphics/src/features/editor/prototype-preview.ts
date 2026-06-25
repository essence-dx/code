import { exportPageToSvgFrame } from "@/features/editor/exporters/svg-exporter";
import type { DesignDocument, DesignLayer } from "@/features/editor/types";

export type PrototypePreviewModel = {
  startPageId: string;
  pages: PrototypePreviewPage[];
};

export type PrototypePreviewPage = {
  id: string;
  name: string;
  prototypeStart: boolean;
  svg: string;
  width: number;
  height: number;
  hotspots: PrototypePreviewHotspot[];
};

export type PrototypePreviewHotspot = {
  id: string;
  name: string;
  targetPageId: string;
  targetPageName: string;
  targetExists: boolean;
  trigger: string;
  action: string;
  transition: string;
  durationMs: number;
  preserveScroll: boolean;
  scrollBehavior: string;
  overlayPosition: string;
  closeOnOutside: boolean;
  deviceFrame: string;
  smartAnimate: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getPrototypePreviewModel(
  document: DesignDocument,
): PrototypePreviewModel {
  const pagesById = new Map(document.pages.map((page) => [page.id, page]));
  const startPage =
    document.pages.find((page) => page.prototypeStart) ??
    pagesById.get(document.activePageId) ??
    document.pages[0];

  return {
    startPageId: startPage?.id ?? "missing",
    pages: document.pages.map((page) => {
      const frame = exportPageToSvgFrame(page);

      return {
        id: page.id,
        name: page.name,
        prototypeStart: page.prototypeStart ?? false,
        svg: frame.svg,
        width: frame.bounds.width,
        height: frame.bounds.height,
        hotspots: page.layers
          .filter(isPrototypeHotspot)
          .map((layer) => {
            const targetPage = pagesById.get(layer.prototype.targetPageId);

            return {
              id: layer.id,
              name: layer.name,
              targetPageId: layer.prototype.targetPageId,
              targetPageName: targetPage?.name ?? "Unknown page",
              targetExists: Boolean(targetPage),
              trigger: layer.prototype.trigger,
              action: layer.prototype.action ?? "navigate",
              transition: layer.prototype.transition,
              durationMs: layer.prototype.durationMs,
              preserveScroll: layer.prototype.preserveScroll ?? false,
              scrollBehavior:
                layer.prototype.scrollBehavior ??
                (layer.prototype.preserveScroll ? "preserve" : "reset"),
              overlayPosition: layer.prototype.overlayPosition ?? "center",
              closeOnOutside: layer.prototype.closeOnOutside ?? true,
              deviceFrame: layer.prototype.deviceFrame ?? "none",
              smartAnimate: layer.prototype.smartAnimate ?? false,
              left: toPercent(layer.x - frame.bounds.x, frame.bounds.width),
              top: toPercent(layer.y - frame.bounds.y, frame.bounds.height),
              width: toPercent(layer.width, frame.bounds.width),
              height: toPercent(layer.height, frame.bounds.height),
            };
          }),
      };
    }),
  };
}

function isPrototypeHotspot(
  layer: DesignLayer,
): layer is DesignLayer & {
  prototype: NonNullable<DesignLayer["prototype"]>;
} {
  return Boolean(layer.visible && layer.prototype?.targetPageId);
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}
