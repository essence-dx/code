import { getPageDimensions } from "@/features/editor/page-dimensions";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  DesignPresetId,
} from "@/features/editor/types";

export type PrintPreflightStatus = "pass" | "warning" | "fail";

export type PrintPreflightCheckId =
  | "dpi"
  | "safe-area"
  | "bleed"
  | "background"
  | "export";

export type PrintPreflightCheck = {
  id: PrintPreflightCheckId;
  label: string;
  status: PrintPreflightStatus;
  detail: string;
  issueCount?: number;
};

export type PrintPreflightReport = {
  status: PrintPreflightStatus;
  score: number;
  estimatedDpi: number;
  safeInset: number;
  bleedInset: number;
  checks: PrintPreflightCheck[];
};

type PrintPhysicalSpec = {
  widthIn: number;
  heightIn: number;
  label: string;
};

const targetDpi = 300;
const minimumDpi = 150;

const physicalSpecs: Partial<Record<DesignPresetId, PrintPhysicalSpec>> = {
  "business-card": {
    widthIn: 3.5,
    heightIn: 2,
    label: "standard business card",
  },
  flyer: {
    widthIn: 8.5,
    heightIn: 11,
    label: "letter flyer",
  },
  poster: {
    widthIn: 6,
    heightIn: 7.5,
    label: "small poster",
  },
  document: {
    widthIn: 8.27,
    heightIn: 11.69,
    label: "A4 document",
  },
  resume: {
    widthIn: 8.5,
    heightIn: 11,
    label: "letter page",
  },
  "print-product": {
    widthIn: 5,
    heightIn: 7,
    label: "print product",
  },
};

export function createPrintPreflightReport({
  document,
  page,
}: {
  document: DesignDocument;
  page: DesignPage;
}): PrintPreflightReport {
  const pageSize = getPageDimensions(document, page);
  const safeInset = getSafeAreaInset(pageSize);
  const bleedInset = getBleedInset(pageSize);
  const visibleElements = page.elements.filter(isVisiblePrintElement);
  const checks = [
    createDpiCheck(page.format, pageSize),
    createSafeAreaCheck(visibleElements, pageSize, safeInset),
    createBleedCheck(page, visibleElements, pageSize, bleedInset),
    createBackgroundCheck(page),
    createExportReadinessCheck(visibleElements, pageSize),
  ] satisfies PrintPreflightCheck[];
  const score = getPreflightScore(checks);

  return {
    status: getPreflightStatus(checks),
    score,
    estimatedDpi: getEstimatedPrintDpi(page.format, pageSize),
    safeInset,
    bleedInset,
    checks,
  };
}

export function getEstimatedPrintDpi(
  format: DesignPresetId | undefined,
  pageSize: { width: number; height: number },
) {
  const spec = getPhysicalSpec(format, pageSize);

  return Math.round(
    Math.min(pageSize.width / spec.widthIn, pageSize.height / spec.heightIn),
  );
}

export function getSafeAreaInset(pageSize: { width: number; height: number }) {
  return Math.round(Math.max(18, Math.min(pageSize.width, pageSize.height) * 0.06));
}

export function getBleedInset(pageSize: { width: number; height: number }) {
  return Math.round(Math.max(12, Math.min(pageSize.width, pageSize.height) * 0.03));
}

function createDpiCheck(
  format: DesignPresetId | undefined,
  pageSize: { width: number; height: number },
): PrintPreflightCheck {
  const spec = getPhysicalSpec(format, pageSize);
  const dpi = getEstimatedPrintDpi(format, pageSize);

  if (dpi < minimumDpi) {
    return {
      id: "dpi",
      label: "Resolution",
      status: "fail",
      detail: `${dpi} DPI for ${spec.label}. Increase page pixels or choose a smaller print size.`,
    };
  }

  if (dpi < targetDpi) {
    return {
      id: "dpi",
      label: "Resolution",
      status: "warning",
      detail: `${dpi} DPI for ${spec.label}. Usable for drafts, below the 300 DPI production target.`,
    };
  }

  return {
    id: "dpi",
    label: "Resolution",
    status: "pass",
    detail: `${dpi} DPI for ${spec.label}.`,
  };
}

function createSafeAreaCheck(
  elements: DesignElement[],
  pageSize: { width: number; height: number },
  safeInset: number,
): PrintPreflightCheck {
  const riskyCount = elements.filter(
    (element) =>
      !isFullBleedElement(element, pageSize) &&
      isElementInsideSafeAreaRisk(element, pageSize, safeInset),
  ).length;

  if (riskyCount > 0) {
    return {
      id: "safe-area",
      label: "Safe area",
      status: "warning",
      detail: `${riskyCount} visible layer${riskyCount === 1 ? "" : "s"} sit inside the ${safeInset}px trim-safe margin.`,
      issueCount: riskyCount,
    };
  }

  return {
    id: "safe-area",
    label: "Safe area",
    status: "pass",
    detail: `Visible layers respect the ${safeInset}px safe margin.`,
  };
}

function createBleedCheck(
  page: DesignPage,
  elements: DesignElement[],
  pageSize: { width: number; height: number },
  bleedInset: number,
): PrintPreflightCheck {
  if (!isTransparentColor(page.background)) {
    return {
      id: "bleed",
      label: "Bleed",
      status: "pass",
      detail: "Page background covers the full trim area.",
    };
  }

  const edgeCoverage = getEdgeCoverage(elements, pageSize, bleedInset);
  const missingEdges = Object.entries(edgeCoverage)
    .filter(([, covered]) => !covered)
    .map(([edge]) => edge);

  if (missingEdges.length === 0) {
    return {
      id: "bleed",
      label: "Bleed",
      status: "pass",
      detail: "Visible artwork covers every trim edge.",
    };
  }

  return {
    id: "bleed",
    label: "Bleed",
    status: "warning",
    detail: `Transparent page has no background coverage on ${missingEdges.join(", ")} edge${missingEdges.length === 1 ? "" : "s"}.`,
    issueCount: missingEdges.length,
  };
}

function createBackgroundCheck(page: DesignPage): PrintPreflightCheck {
  if (isTransparentColor(page.background)) {
    return {
      id: "background",
      label: "Background",
      status: "warning",
      detail: "Transparent backgrounds can reveal paper or vendor preview colors.",
    };
  }

  return {
    id: "background",
    label: "Background",
    status: "pass",
    detail: "Page background is opaque for print export.",
  };
}

function createExportReadinessCheck(
  elements: DesignElement[],
  pageSize: { width: number; height: number },
): PrintPreflightCheck {
  if (pageSize.width < 64 || pageSize.height < 64) {
    return {
      id: "export",
      label: "Export readiness",
      status: "fail",
      detail: "Page dimensions are too small for print export.",
    };
  }

  if (elements.length === 0) {
    return {
      id: "export",
      label: "Export readiness",
      status: "fail",
      detail: "No visible printable layers are on this page.",
    };
  }

  const outsideCount = elements.filter((element) =>
    isMostlyOutsidePage(element, pageSize),
  ).length;

  if (outsideCount > 0) {
    return {
      id: "export",
      label: "Export readiness",
      status: "warning",
      detail: `${outsideCount} visible layer${outsideCount === 1 ? "" : "s"} are mostly outside the page.`,
      issueCount: outsideCount,
    };
  }

  return {
    id: "export",
    label: "Export readiness",
    status: "pass",
    detail: "Visible layers are inside the printable page.",
  };
}

function getPreflightScore(checks: PrintPreflightCheck[]) {
  const penalty = checks.reduce((total, check) => {
    if (check.status === "fail") return total + 28;
    if (check.status === "warning") return total + 12;
    return total;
  }, 0);

  return Math.max(0, 100 - penalty);
}

function getPreflightStatus(checks: PrintPreflightCheck[]): PrintPreflightStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warning")) return "warning";

  return "pass";
}

function getPhysicalSpec(
  format: DesignPresetId | undefined,
  pageSize: { width: number; height: number },
) {
  if (format && physicalSpecs[format]) {
    return physicalSpecs[format];
  }

  const isLandscape = pageSize.width >= pageSize.height;

  return {
    widthIn: isLandscape ? 7 : 5,
    heightIn: isLandscape ? 5 : 7,
    label: "estimated print size",
  } satisfies PrintPhysicalSpec;
}

function isVisiblePrintElement(element: DesignElement) {
  if (element.hidden || element.opacity <= 0.03) return false;
  if (element.type === "shape") {
    return (
      !isTransparentColor(element.fill) ||
      (!isTransparentColor(element.stroke) && element.strokeWidth > 0)
    );
  }
  if (element.type === "path") {
    return (
      !isTransparentColor(element.fill) ||
      (!isTransparentColor(element.stroke) && element.strokeWidth > 0)
    );
  }
  if (element.type === "draw") return element.strokeOpacity > 0.03;

  return true;
}

function isElementInsideSafeAreaRisk(
  element: DesignElement,
  pageSize: { width: number; height: number },
  safeInset: number,
) {
  return (
    element.x < safeInset ||
    element.y < safeInset ||
    element.x + element.width > pageSize.width - safeInset ||
    element.y + element.height > pageSize.height - safeInset
  );
}

function isFullBleedElement(
  element: DesignElement,
  pageSize: { width: number; height: number },
) {
  return (
    element.x <= 0 &&
    element.y <= 0 &&
    element.x + element.width >= pageSize.width &&
    element.y + element.height >= pageSize.height
  );
}

function getEdgeCoverage(
  elements: DesignElement[],
  pageSize: { width: number; height: number },
  bleedInset: number,
) {
  return elements.reduce(
    (coverage, element) => ({
      top: coverage.top || element.y <= bleedInset,
      right:
        coverage.right ||
        element.x + element.width >= pageSize.width - bleedInset,
      bottom:
        coverage.bottom ||
        element.y + element.height >= pageSize.height - bleedInset,
      left: coverage.left || element.x <= bleedInset,
    }),
    {
      top: false,
      right: false,
      bottom: false,
      left: false,
    },
  );
}

function isMostlyOutsidePage(
  element: DesignElement,
  pageSize: { width: number; height: number },
) {
  const visibleWidth =
    Math.min(pageSize.width, element.x + element.width) - Math.max(0, element.x);
  const visibleHeight =
    Math.min(pageSize.height, element.y + element.height) - Math.max(0, element.y);

  if (visibleWidth <= 0 || visibleHeight <= 0) return true;

  const visibleArea = visibleWidth * visibleHeight;
  const elementArea = Math.max(1, element.width * element.height);

  return visibleArea / elementArea < 0.35;
}

function isTransparentColor(color: string | null | undefined) {
  const normalized = color?.trim().toLowerCase();

  return (
    !normalized ||
    normalized === "transparent" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized === "#00000000" ||
    normalized === "#ffffff00"
  );
}
