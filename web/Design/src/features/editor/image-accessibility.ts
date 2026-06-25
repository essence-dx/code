export type ImageAltTextStatus = {
  message: string;
  tone: "good" | "warning";
};

const genericAltText = new Set([
  "image",
  "photo",
  "picture",
  "uploaded design asset",
  "design asset",
]);

export function getImageAltTextStatus(altText: string): ImageAltTextStatus {
  const normalizedAltText = normalizeAltText(altText);

  if (!normalizedAltText) {
    return {
      message: "Missing alt text",
      tone: "warning",
    };
  }

  if (genericAltText.has(normalizedAltText)) {
    return {
      message: "Generic alt text",
      tone: "warning",
    };
  }

  if (normalizedAltText.length < 8) {
    return {
      message: "Short alt text",
      tone: "warning",
    };
  }

  return {
    message: "Alt text ready",
    tone: "good",
  };
}

function normalizeAltText(altText: string) {
  return altText.trim().replace(/\s+/g, " ").toLowerCase();
}
