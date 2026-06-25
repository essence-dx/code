import type { DesignElement } from "@/features/editor/types";

export function getElementAccessibilityLabel(element: DesignElement) {
  const parts = [getLayerLabel(element)];

  if (element.locked) {
    parts.push("locked");
  }

  if (element.groupId) {
    parts.push("grouped");
  }

  return parts.join(", ");
}

function getLayerLabel(element: DesignElement) {
  switch (element.type) {
    case "text":
      return withPreview("Text layer", element.content);
    case "document":
      return withPreview("Document layer", element.title);
    case "sticky-note":
      return withPreview("Sticky note layer", element.content);
    case "image":
      return withPreview("Image layer", element.alt);
    case "draw":
      return withPreview("Draw layer", element.name);
    case "path":
      return withPreview("Bezier path layer", element.name);
    case "video":
      return withPreview("Video layer", element.title);
    case "audio":
      return withPreview("Audio layer", element.title);
    case "pdf":
      return withPreview("PDF layer", element.title);
    case "svg":
      return withPreview("SVG layer", element.name);
    case "lottie":
      return withPreview("Lottie layer", element.name);
    case "qr":
      return withPreview("QR code layer", element.qrValue);
    case "form":
      return withPreview("Form layer", element.label);
    case "embed":
      return withPreview("Embed layer", element.title || element.url);
    case "timer":
      return withPreview("Timer layer", element.label);
    case "connector":
      return withPreview("Connector layer", element.label);
    case "shape":
      return `${element.shape} shape layer`;
    case "table":
      return `${element.rows} by ${element.columns} table layer`;
    case "chart":
      return `${element.chartType} chart layer`;
  }
}

function withPreview(label: string, value: string) {
  const preview = value.trim().replace(/\s+/g, " ");

  if (!preview) {
    return label;
  }

  return `${label}: ${preview.slice(0, 80)}`;
}
