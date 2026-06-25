import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type DocumentStats = {
  pageCount: number;
  layerCount: number;
  componentCount: number;
  variableCount: number;
  commentCount: number;
  unresolvedCommentCount: number;
  prototypeHotspotCount: number;
  prototypeStartPages: Array<{
    id: string;
    name: string;
  }>;
  brokenPrototypeHotspots: Array<{
    pageName: string;
    layerName: string;
    targetPageId: string;
  }>;
  activePagePrototypeHotspots: Array<{
    id: string;
    name: string;
    targetPageName: string;
    targetExists: boolean;
    trigger: string;
    action: string;
    transition: string;
    durationMs: number;
    preserveScroll: boolean;
    scrollBehavior: string;
    overlayPosition: string;
    deviceFrame: string;
    smartAnimate: boolean;
  }>;
  activePage: DesignPage;
  activePageBounds: {
    width: number;
    height: number;
  };
  layerTypeCounts: Array<{
    type: DesignLayer["type"];
    count: number;
  }>;
};

export function getDocumentStats(document: DesignDocument): DocumentStats {
  const activePage =
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0] ??
    createFallbackPage();
  const layers = activePage.layers;
  const comments = document.pages.flatMap((page) => page.comments ?? []);
  const pagesById = new Map(document.pages.map((page) => [page.id, page]));

  return {
    pageCount: document.pages.length,
    layerCount: layers.length,
    componentCount: Object.keys(document.components ?? {}).length,
    variableCount: Object.keys(
      document.variableDefinitions ?? document.variables ?? {},
    ).length,
    commentCount: comments.length,
    unresolvedCommentCount: comments.filter((comment) => !comment.resolved)
      .length,
    prototypeHotspotCount: document.pages.reduce(
      (count, page) =>
        count + page.layers.filter((layer) => layer.prototype).length,
      0,
    ),
    prototypeStartPages: document.pages
      .filter((page) => page.prototypeStart)
      .map((page) => ({ id: page.id, name: page.name })),
    brokenPrototypeHotspots: document.pages.flatMap((page) =>
      page.layers
        .filter(
          (layer) =>
            layer.prototype?.targetPageId &&
            !pagesById.has(layer.prototype.targetPageId),
        )
        .map((layer) => ({
          pageName: page.name,
          layerName: layer.name,
          targetPageId: layer.prototype?.targetPageId ?? "",
        })),
    ),
    activePagePrototypeHotspots: layers
      .filter((layer) => layer.prototype)
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        targetPageName:
          pagesById.get(layer.prototype?.targetPageId ?? "")?.name ??
          "Unknown page",
        targetExists: pagesById.has(layer.prototype?.targetPageId ?? ""),
        trigger: layer.prototype?.trigger ?? "click",
        action: layer.prototype?.action ?? "navigate",
        transition: layer.prototype?.transition ?? "instant",
        durationMs: layer.prototype?.durationMs ?? 0,
        preserveScroll: layer.prototype?.preserveScroll ?? false,
        scrollBehavior:
          layer.prototype?.scrollBehavior ??
          (layer.prototype?.preserveScroll ? "preserve" : "reset"),
        overlayPosition: layer.prototype?.overlayPosition ?? "center",
        deviceFrame: layer.prototype?.deviceFrame ?? "none",
        smartAnimate: layer.prototype?.smartAnimate ?? false,
      })),
    activePage,
    activePageBounds: getLayerBounds(layers),
    layerTypeCounts: getLayerTypeCounts(layers),
  };
}

function getLayerTypeCounts(layers: DesignLayer[]) {
  const counts = new Map<DesignLayer["type"], number>();

  layers.forEach((layer) => {
    counts.set(layer.type, (counts.get(layer.type) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
}

function getLayerBounds(layers: DesignLayer[]) {
  if (layers.length === 0) {
    return { width: 0, height: 0 };
  }

  const minX = Math.min(...layers.map((layer) => layer.x));
  const minY = Math.min(...layers.map((layer) => layer.y));
  const maxX = Math.max(...layers.map((layer) => layer.x + layer.width));
  const maxY = Math.max(...layers.map((layer) => layer.y + layer.height));

  return {
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };
}

function createFallbackPage(): DesignPage {
  return {
    id: "missing",
    name: "Missing page",
    background: "#0f172a",
    layers: [],
  };
}
