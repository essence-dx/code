import type { ProjectSummary } from "@/features/editor/types";
import type {
  VendorProductFamily,
  VendorProductionFinishingNote,
  VendorProofView,
} from "@/features/print-production/vendor-production-handoff-types";

export const vendorBleedInches = 0.125;
export const vendorSafeMarginInches = 0.1875;

export function classifyVendorProductFamily(
  project: ProjectSummary,
): VendorProductFamily {
  const name = project.name.toLowerCase();
  const aspectRatio = project.width / Math.max(1, project.height);

  if (/(pack|box|sleeve|carton|dieline)/.test(name)) return "package-flat";
  if (/(poster|flyer|banner)/.test(name) || aspectRatio < 0.78) {
    return "poster";
  }
  if (/(sticker|badge|seal)/.test(name)) return "sticker";
  if (/(card|coupon|ticket)/.test(name) || aspectRatio > 1.55) {
    return "card";
  }
  if (project.width <= 900 && project.height <= 900) return "sticker";

  return "label";
}

export function getVendorTrimSize(
  project: ProjectSummary,
  productFamily: VendorProductFamily,
) {
  const landscape = project.width >= project.height;

  if (productFamily === "card") {
    return landscape ? { width: 3.5, height: 2 } : { width: 2, height: 3.5 };
  }

  if (productFamily === "poster") {
    return landscape ? { width: 11, height: 8.5 } : { width: 8.5, height: 11 };
  }

  if (productFamily === "sticker") {
    return { width: 3, height: 3 };
  }

  if (productFamily === "package-flat") {
    return landscape ? { width: 9, height: 6 } : { width: 6, height: 9 };
  }

  return landscape ? { width: 4, height: 3 } : { width: 3, height: 4 };
}

export function createVendorCutPath(productFamily: VendorProductFamily) {
  if (productFamily === "package-flat") return "trim, score, fold, glue-tab";
  if (productFamily === "sticker") return "kiss-cut contour";
  if (productFamily === "label") return "rectangular label die";
  if (productFamily === "poster") return "straight trim";

  return "straight trim with optional rounded corners";
}

export function getVendorRequiredProofViews(
  productFamily: VendorProductFamily,
): VendorProofView[] {
  if (productFamily === "card") {
    return ["trim", "safe-area", "bleed", "front", "back"];
  }

  if (productFamily === "package-flat") {
    return ["trim", "safe-area", "bleed", "panel-map", "glue-tab"];
  }

  if (productFamily === "label") {
    return ["trim", "safe-area", "bleed", "roll-repeat"];
  }

  if (productFamily === "poster") {
    return ["trim", "safe-area", "bleed", "wall-scale"];
  }

  return ["trim", "safe-area", "bleed", "cutline"];
}

export function createVendorFinishingNotes(
  productFamily: VendorProductFamily,
): VendorProductionFinishingNote[] {
  const common: VendorProductionFinishingNote[] = [
    {
      id: "stock",
      label: "Stock",
      detail: getStockNote(productFamily),
      required: true,
    },
    {
      id: "coating",
      label: "Coating",
      detail:
        productFamily === "poster"
          ? "Matte or satin finish; avoid gloss for high-text wall reads."
          : "Matte laminate for touch handling and safer color proofing.",
      required: true,
    },
    {
      id: "color",
      label: "Color",
      detail:
        "Vendor should convert proof RGB to press CMYK using house profile.",
      required: true,
    },
  ];

  if (productFamily === "package-flat") {
    return [
      ...common,
      {
        id: "fold-score",
        label: "Fold and score",
        detail: "Score fold lines before trim; keep glue tab clear of varnish.",
        required: true,
      },
      {
        id: "packout",
        label: "Pack-out",
        detail: "Ship flat, grouped by SKU, with first-off proof retained.",
        required: false,
      },
    ];
  }

  return [
    ...common,
    {
      id: "cut",
      label: "Cut",
      detail: getCutNote(productFamily),
      required: true,
    },
  ];
}

export function getVendorProductFamilyCode(productFamily: VendorProductFamily) {
  if (productFamily === "package-flat") return "PKG";
  if (productFamily === "sticker") return "STK";
  if (productFamily === "poster") return "PST";
  if (productFamily === "label") return "LBL";

  return "CRD";
}

function getStockNote(productFamily: VendorProductFamily) {
  if (productFamily === "poster") return "170-220 gsm poster stock.";
  if (productFamily === "sticker")
    return "Water-resistant vinyl sticker stock.";
  if (productFamily === "package-flat") {
    return "300-350 gsm folding carton board.";
  }
  if (productFamily === "label") {
    return "Coated label stock with compatible adhesive.";
  }

  return "14-16 pt card stock.";
}

function getCutNote(productFamily: VendorProductFamily) {
  if (productFamily === "sticker") return "Kiss-cut on supplied contour.";
  if (productFamily === "label") {
    return "Die-cut to label trim; confirm roll direction.";
  }
  if (productFamily === "poster") {
    return "Straight trim; pack flat or rolled by size.";
  }

  return "Straight trim; round corners only if vendor confirms radius.";
}
