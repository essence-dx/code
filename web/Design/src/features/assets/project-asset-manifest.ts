import {
  collectElementDataUrlAssets,
  createDataUrlAssetId,
  estimateDataUrlSizeBytes,
  isCacheableDataUrl,
} from "@/features/assets/data-url-assets";
import {
  getMaxAssetBytes,
  maxAssetDataUrlLength,
} from "@/features/assets/asset-constraints";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
} from "@/features/editor/types";

export const projectAssetManifestVersion = 1;
export const maxProjectAssetManifestEntries = 120;
export const maxProjectAssetManifestBytes = 32_000_000;

export type ProjectAssetReference = {
  pageId: string;
  pageName: string;
  elementId: string;
  elementType: DesignElement["type"];
  fieldName: string;
};

export type ProjectAssetManifestEntry = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  referenceCount: number;
  references: ProjectAssetReference[];
};

export type ProjectAssetManifestSkippedReason =
  | "asset-too-large"
  | "data-url-too-large"
  | "entry-limit"
  | "manifest-too-large";

export type ProjectAssetManifestSkippedReference = ProjectAssetReference & {
  mimeType: string;
  sizeBytes: number;
  reason: ProjectAssetManifestSkippedReason;
};

export type ProjectAssetManifest = {
  version: typeof projectAssetManifestVersion;
  updatedAt: string;
  entryCount: number;
  totalBytes: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
  maxEntries: number;
  entries: ProjectAssetManifestEntry[];
  skippedReferences: ProjectAssetManifestSkippedReference[];
};

export type ProjectAssetPayload = {
  assetId: string;
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  reference: ProjectAssetReference;
};

export function createProjectAssetManifest(
  document: DesignDocument,
  options: { now?: string } = {},
): ProjectAssetManifest {
  const entries = new Map<string, ProjectAssetManifestEntry>();
  const skippedReferences: ProjectAssetManifestSkippedReference[] = [];
  let totalBytes = 0;

  for (const page of document.pages) {
    for (const element of page.elements) {
      for (const asset of collectElementDataUrlAssets(element)) {
        const reference = createAssetReference({ page, element, asset });
        const id = createDataUrlAssetId(asset.dataUrl);
        const sizeBytes = estimateDataUrlSizeBytes(asset.dataUrl);
        const maxEntryBytes = getMaxAssetBytes(asset.mimeType);
        const existingEntry = entries.get(id);

        if (existingEntry) {
          appendReference(existingEntry, reference);
          continue;
        }

        if (asset.dataUrl.length > maxAssetDataUrlLength) {
          skippedReferences.push({
            ...reference,
            mimeType: asset.mimeType,
            sizeBytes,
            reason: "data-url-too-large",
          });
          continue;
        }

        if (sizeBytes > maxEntryBytes) {
          skippedReferences.push({
            ...reference,
            mimeType: asset.mimeType,
            sizeBytes,
            reason: "asset-too-large",
          });
          continue;
        }

        if (entries.size >= maxProjectAssetManifestEntries) {
          skippedReferences.push({
            ...reference,
            mimeType: asset.mimeType,
            sizeBytes,
            reason: "entry-limit",
          });
          continue;
        }

        if (totalBytes + sizeBytes > maxProjectAssetManifestBytes) {
          skippedReferences.push({
            ...reference,
            mimeType: asset.mimeType,
            sizeBytes,
            reason: "manifest-too-large",
          });
          continue;
        }

        entries.set(id, {
          id,
          mimeType: asset.mimeType,
          sizeBytes,
          referenceCount: 1,
          references: [reference],
        });
        totalBytes += sizeBytes;
      }
    }
  }

  return {
    version: projectAssetManifestVersion,
    updatedAt: options.now ?? new Date().toISOString(),
    entryCount: entries.size,
    totalBytes,
    maxEntryBytes: Math.max(
      ...Array.from(entries.values(), (entry) => getMaxAssetBytes(entry.mimeType)),
      0,
    ),
    maxTotalBytes: maxProjectAssetManifestBytes,
    maxEntries: maxProjectAssetManifestEntries,
    entries: Array.from(entries.values()),
    skippedReferences,
  };
}

export function applyProjectAssetManifest(
  document: DesignDocument,
  options: { now?: string } = {},
): DesignDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      projectAssetManifest: createProjectAssetManifest(document, options),
    },
  };
}

export function createProjectAssetPath(input: {
  projectId: string;
  assetId: string;
}) {
  return `/api/projects/${encodeURIComponent(input.projectId)}/assets/${encodeURIComponent(
    input.assetId,
  )}`;
}

export function createProjectAssetUrl(input: {
  projectId: string;
  assetId: string;
  assetBaseUrl?: string;
}) {
  const path = createProjectAssetPath(input);
  const baseUrl = input.assetBaseUrl?.replace(/\/$/, "");

  return baseUrl ? `${baseUrl}${path}` : path;
}

export function createProjectAssetUrlForDataUrl(input: {
  projectId: string;
  dataUrl: string;
  assetBaseUrl?: string;
}) {
  return createProjectAssetUrl({
    projectId: input.projectId,
    assetId: createDataUrlAssetId(input.dataUrl),
    assetBaseUrl: input.assetBaseUrl,
  });
}

export function findProjectAssetById(
  document: DesignDocument,
  assetId: string,
): ProjectAssetPayload | null {
  const manifestEntry = document.metadata?.projectAssetManifest?.entries.find(
    (entry) => entry.id === assetId,
  );

  if (manifestEntry) {
    for (const reference of manifestEntry.references) {
      const payload = findReferencedAsset(document, assetId, reference);

      if (payload) return payload;
    }
  }

  for (const page of document.pages) {
    for (const element of page.elements) {
      for (const asset of collectElementDataUrlAssets(element)) {
        if (createDataUrlAssetId(asset.dataUrl) !== assetId) continue;

        return {
          assetId,
          dataUrl: asset.dataUrl,
          mimeType: asset.mimeType,
          sizeBytes: estimateDataUrlSizeBytes(asset.dataUrl),
          reference: createAssetReference({ page, element, asset }),
        };
      }
    }
  }

  return null;
}

export function rewriteDocumentDataUrlsToHostedUrls(input: {
  document: DesignDocument;
  projectId: string;
  assetBaseUrl?: string;
}) {
  return {
    ...input.document,
    metadata: {
      ...input.document.metadata,
      projectAssetManifest: createProjectAssetManifest(input.document),
    },
    pages: input.document.pages.map((page) => ({
      ...page,
      elements: page.elements.map((element) =>
        rewriteElementDataUrlsToHostedUrls({
          element,
          projectId: input.projectId,
          assetBaseUrl: input.assetBaseUrl,
        }),
      ),
    })),
  };
}

function findReferencedAsset(
  document: DesignDocument,
  assetId: string,
  reference: ProjectAssetReference,
): ProjectAssetPayload | null {
  const page = document.pages.find((item) => item.id === reference.pageId);
  const element = page?.elements.find((item) => item.id === reference.elementId);

  if (!page || !element) return null;

  const asset = collectElementDataUrlAssets(element).find(
    (item) =>
      item.fieldName === reference.fieldName &&
      createDataUrlAssetId(item.dataUrl) === assetId,
  );

  if (!asset) return null;

  return {
    assetId,
    dataUrl: asset.dataUrl,
    mimeType: asset.mimeType,
    sizeBytes: estimateDataUrlSizeBytes(asset.dataUrl),
    reference,
  };
}

function rewriteElementDataUrlsToHostedUrls(input: {
  element: DesignElement;
  projectId: string;
  assetBaseUrl?: string;
}): DesignElement {
  const toHostedUrl = (value: string | undefined) =>
    isCacheableDataUrl(value)
      ? createProjectAssetUrlForDataUrl({
          projectId: input.projectId,
          dataUrl: value,
          assetBaseUrl: input.assetBaseUrl,
        })
      : value;

  switch (input.element.type) {
    case "image":
      return {
        ...input.element,
        src: toHostedUrl(input.element.src) ?? input.element.src,
        backgroundCutoutOriginalSrc: toHostedUrl(
          input.element.backgroundCutoutOriginalSrc,
        ),
        objectRetouchOriginalSrc: toHostedUrl(
          input.element.objectRetouchOriginalSrc,
        ),
      };
    case "video":
    case "audio":
    case "pdf":
      return {
        ...input.element,
        src: toHostedUrl(input.element.src) ?? input.element.src,
      };
    default:
      return input.element;
  }
}

function createAssetReference({
  page,
  element,
  asset,
}: {
  page: DesignPage;
  element: DesignElement;
  asset: { fieldName: string };
}): ProjectAssetReference {
  return {
    pageId: page.id,
    pageName: page.name,
    elementId: element.id,
    elementType: element.type,
    fieldName: asset.fieldName,
  };
}

function appendReference(
  entry: ProjectAssetManifestEntry,
  reference: ProjectAssetReference,
) {
  if (
    entry.references.some(
      (item) =>
        item.pageId === reference.pageId &&
        item.elementId === reference.elementId &&
        item.fieldName === reference.fieldName,
    )
  ) {
    return;
  }

  entry.references.push(reference);
  entry.referenceCount = entry.references.length;
}
