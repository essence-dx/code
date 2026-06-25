import type { DesignPresetId } from "@/features/editor/types";

export type PrintProofProductKind =
  | "card"
  | "label"
  | "poster"
  | "sticker"
  | "packaging";

export type PrintProofProduct = {
  id: PrintProofProductKind;
  label: string;
  description: string;
};

export const printProofProducts = [
  {
    id: "card",
    label: "Card",
    description: "Stacked horizontal cards with trim and safe-zone cues.",
  },
  {
    id: "label",
    label: "Label",
    description: "Roll-style label repeats for sheet and sticker printers.",
  },
  {
    id: "poster",
    label: "Poster",
    description: "Wall proof with a frame, shadow, and live artwork scale.",
  },
  {
    id: "sticker",
    label: "Sticker",
    description: "Cut-shape sheet proof for round and rounded stickers.",
  },
  {
    id: "packaging",
    label: "Packaging",
    description: "Flat dieline proof with front, side, flap, and glue panels.",
  },
] satisfies PrintProofProduct[];

export function getPrintProofProduct(kind: PrintProofProductKind) {
  return (
    printProofProducts.find((product) => product.id === kind) ??
    printProofProducts[0]
  );
}

export function getPrintProofFit({
  width,
  height,
  maxWidth,
  maxHeight,
}: {
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
}) {
  const normalizedWidth = Math.max(1, width);
  const normalizedHeight = Math.max(1, height);
  const scale = Math.min(
    maxWidth / normalizedWidth,
    maxHeight / normalizedHeight,
  );

  return {
    scale,
    width: Math.round(normalizedWidth * scale),
    height: Math.round(normalizedHeight * scale),
  };
}

export function getRecommendedPrintProofKind({
  format,
  width,
  height,
}: {
  format?: DesignPresetId;
  width: number;
  height: number;
}): PrintProofProductKind {
  const aspectRatio = width / Math.max(1, height);

  if (format === "business-card") return "card";
  if (format === "poster" || format === "flyer" || format === "banner") {
    return "poster";
  }
  if (format === "print-product") return "packaging";
  if (aspectRatio > 1.55) return "card";
  if (aspectRatio < 0.78) return "poster";
  if (width <= 900 && height <= 900) return "sticker";

  return "label";
}
