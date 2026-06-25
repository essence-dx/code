import { nanoid } from "nanoid";

import { resolveAnchoredConnectors } from "@/features/editor/connector-anchors";
import { normalizePageDimension } from "@/features/editor/page-dimensions";
import { getDesignPreset } from "@/features/editor/presets";
import type {
  AudienceInteraction,
  DesignDocument,
  DesignDocumentMetadata,
  DesignElement,
  DesignPage,
  DesignPresetId,
  PageTransition,
} from "@/features/editor/types";

export function getActivePage(document: DesignDocument) {
  return (
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0]
  );
}

export function updateActivePage(
  document: DesignDocument,
  updater: (page: DesignPage) => DesignPage,
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === document.activePageId ? updater(page) : page,
    ),
  };
}

export function setActivePage(
  document: DesignDocument,
  pageId: string,
): DesignDocument {
  if (!document.pages.some((page) => page.id === pageId)) return document;

  return {
    ...document,
    activePageId: pageId,
  };
}

export function updateDocumentMetadata(
  document: DesignDocument,
  updates: Partial<DesignDocumentMetadata>,
): DesignDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      ...updates,
    },
  };
}

export function addPage(
  document: DesignDocument,
  page?: DesignPage,
): DesignDocument {
  const nextPage =
    page ??
    ({
      id: nanoid(),
      name: `Page ${document.pages.length + 1}`,
      background: "#ffffff",
      notes: "",
      elements: [],
    } satisfies DesignPage);

  return {
    ...document,
    pages: [...document.pages, nextPage],
    activePageId: nextPage.id,
  };
}

export function addPages(
  document: DesignDocument,
  pages: DesignPage[],
): DesignDocument {
  if (pages.length === 0) return document;

  return {
    ...document,
    pages: [...document.pages, ...pages],
    activePageId: pages[0].id,
  };
}

export function duplicatePage(
  document: DesignDocument,
  pageId: string,
): DesignDocument {
  const sourcePage = document.pages.find((page) => page.id === pageId);

  if (!sourcePage) return document;

  return addPage(document, {
    ...sourcePage,
    id: nanoid(),
    name: `${sourcePage.name} copy`,
    elements: sourcePage.elements.map((element) => ({
      ...element,
      id: nanoid(),
    })) as DesignElement[],
  });
}

export function removePage(
  document: DesignDocument,
  pageId: string,
): DesignDocument {
  if (document.pages.length <= 1) return document;

  const nextPages = document.pages.filter((page) => page.id !== pageId);
  const activePageId =
    document.activePageId === pageId ? nextPages[0].id : document.activePageId;

  return {
    ...document,
    pages: nextPages,
    activePageId,
  };
}

export function renamePage(
  document: DesignDocument,
  pageId: string,
  name: string,
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, name } : page,
    ),
  };
}

export function updatePageNotes(
  document: DesignDocument,
  pageId: string,
  notes: string,
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, notes } : page,
    ),
  };
}

export function updatePageWebsiteSeo(
  document: DesignDocument,
  pageId: string,
  seo: { title?: string; description?: string },
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            websiteSeoTitle:
              seo.title === undefined ? page.websiteSeoTitle : seo.title,
            websiteSeoDescription:
              seo.description === undefined
                ? page.websiteSeoDescription
                : seo.description,
          }
        : page,
    ),
  };
}

export function updatePageWebsiteNavigation(
  document: DesignDocument,
  pageId: string,
  navigation: { label?: string; group?: string; hidden?: boolean },
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            websiteNavLabel:
              navigation.label === undefined
                ? page.websiteNavLabel
                : navigation.label,
            websiteNavGroup:
              navigation.group === undefined
                ? page.websiteNavGroup
                : navigation.group,
            websiteHideFromNavigation:
              navigation.hidden === undefined
                ? page.websiteHideFromNavigation
                : navigation.hidden,
          }
        : page,
    ),
  };
}

export function updatePageTransition(
  document: DesignDocument,
  pageId: string,
  transition: PageTransition,
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, transition } : page,
    ),
  };
}

export function updatePageSize(
  document: DesignDocument,
  pageId: string,
  size: { width?: number; height?: number },
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            format: "custom",
            width:
              size.width === undefined
                ? page.width
                : normalizePageDimension(size.width),
            height:
              size.height === undefined
                ? page.height
                : normalizePageDimension(size.height),
          }
        : page,
    ),
  };
}

export function updatePageFormat(
  document: DesignDocument,
  pageId: string,
  format: DesignPresetId,
): DesignDocument {
  if (format === "custom") {
    return {
      ...document,
      pages: document.pages.map((page) =>
        page.id === pageId ? { ...page, format } : page,
      ),
    };
  }

  const preset = getDesignPreset(format);

  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            format: preset.id,
            width: preset.width,
            height: preset.height,
          }
        : page,
    ),
  };
}

export function updatePageAudienceInteraction(
  document: DesignDocument,
  pageId: string,
  audienceInteraction: AudienceInteraction | undefined,
): DesignDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, audienceInteraction } : page,
    ),
  };
}

export function reorderPage(
  document: DesignDocument,
  pageId: string,
  direction: "up" | "down",
): DesignDocument {
  const index = document.pages.findIndex((page) => page.id === pageId);

  if (index < 0) return document;

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= document.pages.length) return document;

  const nextPages = [...document.pages];
  const [page] = nextPages.splice(index, 1);
  nextPages.splice(targetIndex, 0, page);

  return {
    ...document,
    pages: nextPages,
  };
}

export function addElement(
  document: DesignDocument,
  element: DesignElement,
): DesignDocument {
  return addElements(document, [element]);
}

export function addElements(
  document: DesignDocument,
  elements: DesignElement[],
): DesignDocument {
  return updateActivePage(document, (page) => ({
    ...page,
    elements: resolveAnchoredConnectors([...page.elements, ...elements]),
  }));
}

export function updateElement(
  document: DesignDocument,
  elementId: string,
  updates: Partial<DesignElement>,
): DesignDocument {
  return updateActivePage(document, (page) => ({
    ...page,
    elements: resolveAnchoredConnectors(
      page.elements.map((element) =>
        element.id === elementId
          ? ({ ...element, ...updates } as DesignElement)
          : element,
      ),
      new Set([elementId]),
    ),
  }));
}

export function removeElement(
  document: DesignDocument,
  elementId: string,
): DesignDocument {
  return removeElements(document, [elementId]);
}

export function removeElements(
  document: DesignDocument,
  elementIds: string[],
): DesignDocument {
  const idSet = new Set(elementIds);

  return updateActivePage(document, (page) => ({
    ...page,
    elements: page.elements.filter((element) => {
      if (idSet.has(element.id)) return false;

      return !(
        element.type === "connector" &&
        ((element.startElementId && idSet.has(element.startElementId)) ||
          (element.endElementId && idSet.has(element.endElementId)))
      );
    }),
  }));
}

export function duplicateElement(
  document: DesignDocument,
  elementId: string,
): DesignDocument {
  return duplicateElements(document, [elementId]);
}

export function duplicateElements(
  document: DesignDocument,
  elementIds: string[],
): DesignDocument {
  const activePage = getActivePage(document);
  const idSet = new Set(elementIds);
  const duplicates = cloneElements(
    activePage.elements.filter((element) => idSet.has(element.id)),
  );

  if (duplicates.length === 0) return document;

  return addElements(document, duplicates);
}

export function cloneElement(element: DesignElement): DesignElement {
  return cloneElements([element])[0];
}

export function cloneElements(elements: DesignElement[]): DesignElement[] {
  const groupIds = new Map<string, string>();
  const elementIds = new Map(elements.map((element) => [element.id, nanoid()]));

  return elements.map((element) => {
    const groupId = element.groupId
      ? getClonedGroupId(groupIds, element.groupId)
      : undefined;
    const nextId = elementIds.get(element.id) ?? nanoid();

    return {
      ...element,
      id: nextId,
      x: element.x + 32,
      y: element.y + 32,
      groupId,
      ...(element.type === "connector"
        ? {
            startElementId: getClonedElementId(
              elementIds,
              element.startElementId,
            ),
            endElementId: getClonedElementId(elementIds, element.endElementId),
          }
        : {}),
    } as DesignElement;
  });
}

export function groupElements(
  document: DesignDocument,
  elementIds: string[],
): DesignDocument {
  const idSet = new Set(elementIds);
  const groupId = nanoid();

  return updateActivePage(document, (page) => {
    const groupableCount = page.elements.filter(
      (element) => idSet.has(element.id) && !element.locked,
    ).length;

    if (groupableCount < 2) return page;

    return {
      ...page,
      elements: page.elements.map((element) =>
        idSet.has(element.id) && !element.locked
          ? ({ ...element, groupId } as DesignElement)
          : element,
      ),
    };
  });
}

export function ungroupElements(
  document: DesignDocument,
  elementIds: string[],
): DesignDocument {
  const idSet = new Set(elementIds);

  return updateActivePage(document, (page) => {
    const groupIds = new Set(
      page.elements
        .filter((element) => idSet.has(element.id) && element.groupId)
        .map((element) => element.groupId as string),
    );

    if (groupIds.size === 0) return page;

    return {
      ...page,
      elements: page.elements.map((element) =>
        element.groupId && groupIds.has(element.groupId)
          ? ({ ...element, groupId: undefined } as DesignElement)
          : element,
      ),
    };
  });
}

function getClonedGroupId(groupIds: Map<string, string>, groupId: string) {
  const existingGroupId = groupIds.get(groupId);

  if (existingGroupId) return existingGroupId;

  const nextGroupId = nanoid();
  groupIds.set(groupId, nextGroupId);

  return nextGroupId;
}

function getClonedElementId(
  elementIds: Map<string, string>,
  elementId: string | undefined,
) {
  return elementId ? (elementIds.get(elementId) ?? elementId) : undefined;
}

export function createMovedElementUpdates(
  snapshots: Array<Pick<DesignElement, "id" | "x" | "y">>,
  delta: { x: number; y: number },
) {
  return snapshots.map((snapshot) => ({
    elementId: snapshot.id,
    updates: {
      x: snapshot.x + delta.x,
      y: snapshot.y + delta.y,
    } as Partial<DesignElement>,
  }));
}

export function applyElementUpdates(
  document: DesignDocument,
  updates: Array<{
    elementId: string;
    updates: Partial<DesignElement>;
  }>,
): DesignDocument {
  if (updates.length === 0) return document;

  const changedElementIds = new Set(updates.map((item) => item.elementId));
  const updateMap = new Map(updates.map((item) => [item.elementId, item.updates]));

  return updateActivePage(document, (page) => ({
    ...page,
    elements: resolveAnchoredConnectors(
      page.elements.map((element) => {
        const updates = updateMap.get(element.id);

        return updates
          ? ({ ...element, ...updates } as DesignElement)
          : element;
      }),
      changedElementIds,
    ),
  }));
}

export function nudgeElement(
  document: DesignDocument,
  elementId: string,
  delta: { x: number; y: number },
): DesignDocument {
  return nudgeElements(document, [elementId], delta);
}

export function nudgeElements(
  document: DesignDocument,
  elementIds: string[],
  delta: { x: number; y: number },
): DesignDocument {
  const idSet = new Set(elementIds);

  return updateActivePage(document, (page) => ({
    ...page,
    elements: resolveAnchoredConnectors(
      page.elements.map((element) =>
        idSet.has(element.id) && !element.locked
          ? ({
              ...element,
              x: element.x + delta.x,
              y: element.y + delta.y,
            } as DesignElement)
          : element,
      ),
      idSet,
    ),
  }));
}

export function distributeElements(
  document: DesignDocument,
  elementIds: string[],
  axis: "horizontal" | "vertical",
): DesignDocument {
  const idSet = new Set(elementIds);
  const positionKey = axis === "horizontal" ? "x" : "y";
  const sizeKey = axis === "horizontal" ? "width" : "height";

  return updateActivePage(document, (page) => {
    const selectedElements = page.elements
      .filter((element) => idSet.has(element.id) && !element.locked)
      .sort((left, right) => left[positionKey] - right[positionKey]);

    if (selectedElements.length < 3) return page;

    const first = selectedElements[0];
    const last = selectedElements[selectedElements.length - 1];
    const start = first[positionKey];
    const end = last[positionKey] + last[sizeKey];
    const totalSize = selectedElements.reduce(
      (sum, element) => sum + element[sizeKey],
      0,
    );
    const gap = (end - start - totalSize) / (selectedElements.length - 1);
    let nextPosition = start;
    const updates = new Map<string, number>();

    for (const element of selectedElements) {
      updates.set(element.id, Math.round(nextPosition));
      nextPosition += element[sizeKey] + gap;
    }

    return {
      ...page,
      elements: page.elements.map((element) => {
        const nextValue = updates.get(element.id);

        return nextValue === undefined
          ? element
          : ({
              ...element,
              [positionKey]: nextValue,
            } as DesignElement);
      }),
    };
  });
}

export function reorderElement(
  document: DesignDocument,
  elementId: string,
  direction: "forward" | "backward",
): DesignDocument {
  return updateActivePage(document, (page) => {
    const index = page.elements.findIndex(
      (element) => element.id === elementId,
    );

    if (index < 0) return page;

    const targetIndex = direction === "forward" ? index + 1 : index - 1;

    if (targetIndex < 0 || targetIndex >= page.elements.length) return page;

    const nextElements = [...page.elements];
    const [item] = nextElements.splice(index, 1);
    nextElements.splice(targetIndex, 0, item);

    return {
      ...page,
      elements: nextElements,
    };
  });
}

export function setActivePageBackground(
  document: DesignDocument,
  background: string,
): DesignDocument {
  return updateActivePage(document, (page) => ({
    ...page,
    background,
  }));
}
