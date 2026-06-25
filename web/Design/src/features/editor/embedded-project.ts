import { createStarterDocument } from "@/features/editor/document-factory";
import type {
  DesignDocument,
  DesignElement,
  ProjectDetail,
} from "@/features/editor/types";

const EMBEDDED_PROJECT_TIMESTAMP = "2026-06-11T00:00:00.000Z";
const EMBEDDED_PAGE_ID = "embedded-editor-page";

export function createEmbeddedEditorProject(): ProjectDetail {
  const document = createDeterministicEmbeddedDocument();

  return {
    id: "embedded-canva-project",
    name: "DX Studio Canvas",
    width: document.width,
    height: document.height,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    updatedAt: EMBEDDED_PROJECT_TIMESTAMP,
    createdAt: EMBEDDED_PROJECT_TIMESTAMP,
    document,
  };
}

function createDeterministicEmbeddedDocument(): DesignDocument {
  const document = createStarterDocument({
    width: 1440,
    height: 900,
    presetId: "presentation",
    name: "Editor preview",
  });

  return {
    ...document,
    activePageId: EMBEDDED_PAGE_ID,
    pages: document.pages.map((page, pageIndex) => ({
      ...page,
      id:
        pageIndex === 0
          ? EMBEDDED_PAGE_ID
          : `embedded-editor-page-${pageIndex + 1}`,
      elements: page.elements.map((element, elementIndex) =>
        withDeterministicElementId(element, elementIndex),
      ),
    })),
  };
}

function withDeterministicElementId(
  element: DesignElement,
  elementIndex: number,
): DesignElement {
  return {
    ...element,
    id: `embedded-editor-element-${elementIndex + 1}`,
  } as DesignElement;
}
