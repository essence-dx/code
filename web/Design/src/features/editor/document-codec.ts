import type { DesignDocument } from "@/features/editor/types";

export function parseDesignDocument(value: unknown): DesignDocument {
  if (isDesignDocument(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;

    if (isDesignDocument(parsed)) {
      return parsed;
    }
  }

  throw new Error("Invalid design document");
}

export function stringifyDesignDocument(document: DesignDocument) {
  return JSON.stringify(document);
}

function isDesignDocument(value: unknown): value is DesignDocument {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<DesignDocument>;

  return (
    candidate.version === 1 &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    Array.isArray(candidate.pages) &&
    typeof candidate.activePageId === "string"
  );
}
