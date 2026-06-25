import { nanoid } from "nanoid";
import {
  createComponentInstance,
  createDesignComponent,
  createDesignComponentVariant,
} from "@/features/editor/component-library";
import {
  getComponentLibrarySignature,
  getComponentSignatureMap,
  normalizeLibraryMetadata,
  type ComponentLibraryManifest,
} from "@/features/editor/component-library-manifest";
import {
  defaultVariantPropertyId,
  getComponentTextPropertyNameForLayer,
  getComponentInstancePropertyValues,
  getComponentVariantPropertyNames,
  withVariantPropertyOption,
} from "@/features/editor/component-properties";
import { getComponentSlotName } from "@/features/editor/component-slots";
import type {
  DesignComment,
  DesignCommentReactionKind,
  DesignCommentResolutionHistoryEntry,
  DesignComponent,
  DesignComponentVariant,
  DesignCommentReply,
  DesignDocument,
  DesignGroup,
  DesignGuide,
  DesignLayer,
  DesignLibraryMetadata,
  DesignPage,
  EditorTool,
  LayerAlignment,
  LayerDistribution,
} from "@/features/editor/types";

export type LayerPatch = {
  layerId: string;
  patch: Partial<DesignLayer>;
};

export type DesignPagePatch = Partial<
  Pick<
    DesignPage,
    | "name"
    | "background"
    | "grid"
    | "prototypeStart"
    | "facilitation"
    | "layers"
    | "comments"
  >
>;

const GUIDE_TOGGLE_CANVAS_DISTANCE = 24;

export function getActivePage(document: DesignDocument) {
  return (
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0]
  );
}

export function createLayerFromTool(
  tool: EditorTool,
  point: { x: number; y: number },
): DesignLayer | null {
  const id = nanoid();

  if (tool === "frame") {
    return baseLayer(id, "frame", "Frame", point.x, point.y, 360, 240, {
      fill: "#f4f4f5",
      stroke: "#d4d4d8",
      cornerRadius: 10,
    });
  }

  if (tool === "rectangle") {
    return baseLayer(id, "rectangle", "Rectangle", point.x, point.y, 180, 112, {
      fill: "#5eead4",
      stroke: "#14b8a6",
      cornerRadius: 8,
    });
  }

  if (tool === "ellipse") {
    return baseLayer(id, "ellipse", "Ellipse", point.x, point.y, 132, 132, {
      fill: "#facc15",
      stroke: "#ca8a04",
      cornerRadius: 999,
    });
  }

  if (tool === "pen") {
    return {
      ...baseLayer(id, "path", "Pen path", point.x, point.y, 1, 1, {
        fill: "transparent",
        stroke: "#5eead4",
        strokeWidth: 3,
        strokeLineCap: "round",
        strokeLineJoin: "round",
      }),
      pathData: "M 0 0",
      pathViewBox: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      fillRule: "nonzero",
    };
  }

  if (tool === "pencil") {
    return {
      ...baseLayer(id, "path", "Pencil path", point.x, point.y, 1, 1, {
        fill: "transparent",
        stroke: "#f472b6",
        strokeWidth: 3,
        strokeLineCap: "round",
        strokeLineJoin: "round",
      }),
      pathData: "M 0 0",
      pathViewBox: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      fillRule: "nonzero",
    };
  }

  if (tool === "text") {
    return {
      ...baseLayer(id, "text", "Text", point.x, point.y, 220, 42, {
        fill: "transparent",
        stroke: "transparent",
        strokeWidth: 0,
      }),
      text: "Text",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 18,
      fontWeight: 500,
      lineHeight: 1.25,
      letterSpacing: 0,
      textAlign: "left",
      textColor: "#f4f4f5",
      textResizeMode: "fixed",
    };
  }

  if (tool === "sticky") {
    return {
      ...baseLayer(id, "sticky", "Sticky", point.x, point.y, 180, 150, {
        fill: "#fde68a",
        stroke: "#f59e0b",
        cornerRadius: 6,
      }),
      text: "Sticky note",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 16,
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: 0,
      textAlign: "left",
      textColor: "#422006",
      textResizeMode: "fixed",
    };
  }

  return null;
}

export function createComment(point: { x: number; y: number }): DesignComment {
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    x: Math.round(point.x),
    y: Math.round(point.y),
    text: "Comment",
    mentions: [],
    replies: [],
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createCommentReply(
  text: string,
  authorName: string,
): DesignCommentReply {
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    text,
    mentions: extractMentions(text),
    authorName,
    createdAt: now,
    updatedAt: now,
  };
}

export function createCommentReaction(
  kind: DesignCommentReactionKind,
  actorName: string,
  actorEmail?: string | null,
) {
  return {
    id: nanoid(),
    kind,
    actorName,
    actorEmail: actorEmail ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function createGuide(
  orientation: DesignGuide["orientation"],
  position: number,
): DesignGuide {
  return {
    id: nanoid(),
    orientation,
    position: Math.round(position),
    createdAt: new Date().toISOString(),
  };
}

export function addCommentToDocument(
  document: DesignDocument,
  comment: DesignComment,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: [...comments, comment],
  }));
}

export function updateCommentInDocument(
  document: DesignDocument,
  commentId: string,
  patch: Partial<Pick<DesignComment, "text" | "resolved" | "x" | "y" | "dueDate">>,
  actor?: CommentMutationActor,
): DesignDocument {
  const updatedAt = new Date().toISOString();

  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) => {
      if (comment.id !== commentId) {
        return comment;
      }

      return {
        ...comment,
        ...patch,
        mentions:
          patch.text !== undefined
            ? extractMentions(patch.text)
            : (comment.mentions ?? []),
        resolutionHistory: getNextResolutionHistory(comment, patch, actor, updatedAt),
        updatedAt,
      };
    }),
  }));
}

export function updateCommentsInDocument(
  document: DesignDocument,
  commentIds: string[],
  patch: Partial<
    Pick<
      DesignComment,
      "resolved" | "assigneeName" | "assigneeEmail" | "dueDate"
    >
  >,
  actor?: CommentMutationActor,
): DesignDocument {
  const commentIdSet = new Set(commentIds);
  const updatedAt = new Date().toISOString();

  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      comments: (page.comments ?? []).map((comment) =>
        commentIdSet.has(comment.id)
          ? {
              ...comment,
              ...patch,
              resolutionHistory: getNextResolutionHistory(
                comment,
                patch,
                actor,
                updatedAt,
              ),
              updatedAt,
            }
          : comment,
      ),
    })),
  };
}

export function toggleCommentReactionInDocument(
  document: DesignDocument,
  commentId: string,
  kind: DesignCommentReactionKind,
  actorName: string,
  actorEmail?: string | null,
): DesignDocument {
  const reaction = createCommentReaction(kind, actorName, actorEmail);

  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) => {
      if (comment.id !== commentId) {
        return comment;
      }

      const existingReactions = comment.reactions ?? [];
      const matchingReaction = existingReactions.find(
        (item) =>
          item.kind === kind &&
          sameReactionActor(item.actorName, item.actorEmail, actorName, actorEmail),
      );

      return {
        ...comment,
        reactions: matchingReaction
          ? existingReactions.filter((item) => item.id !== matchingReaction.id)
          : [...existingReactions, reaction],
        updatedAt: new Date().toISOString(),
      };
    }),
  }));
}

export function assignCommentInDocument(
  document: DesignDocument,
  commentId: string,
  assigneeName: string,
  assigneeEmail?: string | null,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) =>
      comment.id === commentId
        ? {
            ...comment,
            assigneeName,
            assigneeEmail: assigneeEmail ?? null,
            updatedAt: new Date().toISOString(),
          }
        : comment,
    ),
  }));
}

type CommentMutationActor = {
  actorName: string;
  actorEmail?: string | null;
};

function getNextResolutionHistory(
  comment: DesignComment,
  patch: Partial<Pick<DesignComment, "resolved">>,
  actor: CommentMutationActor | undefined,
  createdAt: string,
) {
  if (patch.resolved === undefined || patch.resolved === comment.resolved) {
    return comment.resolutionHistory ?? [];
  }

  return appendResolutionHistory(comment, {
    id: nanoid(),
    status: patch.resolved ? "resolved" : "reopened",
    actorName: actor?.actorName ?? "Reviewer",
    actorEmail: actor?.actorEmail ?? null,
    createdAt,
  });
}

function appendResolutionHistory(
  comment: DesignComment,
  entry: DesignCommentResolutionHistoryEntry,
) {
  return [entry, ...(comment.resolutionHistory ?? [])].slice(0, 20);
}

export function clearCommentAssignmentInDocument(
  document: DesignDocument,
  commentId: string,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) =>
      comment.id === commentId
        ? {
            ...comment,
            assigneeName: undefined,
            assigneeEmail: undefined,
            updatedAt: new Date().toISOString(),
          }
        : comment,
    ),
  }));
}

export function removeCommentFromDocument(
  document: DesignDocument,
  commentId: string,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: comments.filter((comment) => comment.id !== commentId),
  }));
}

export function addCommentReplyToDocument(
  document: DesignDocument,
  commentId: string,
  reply: DesignCommentReply,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) =>
      comment.id === commentId
        ? {
            ...comment,
            replies: [...(comment.replies ?? []), reply],
            updatedAt: new Date().toISOString(),
          }
        : comment,
    ),
  }));
}

export function updateCommentReplyInDocument(
  document: DesignDocument,
  commentId: string,
  replyId: string,
  text: string,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) =>
      comment.id === commentId
        ? {
            ...comment,
            replies: (comment.replies ?? []).map((reply) =>
              reply.id === replyId
                ? {
                    ...reply,
                    text,
                    mentions: extractMentions(text),
                    updatedAt: new Date().toISOString(),
                  }
                : reply,
            ),
            updatedAt: new Date().toISOString(),
          }
        : comment,
    ),
  }));
}

export function removeCommentReplyFromDocument(
  document: DesignDocument,
  commentId: string,
  replyId: string,
): DesignDocument {
  return mapActivePage(document, (_, comments) => ({
    comments: comments.map((comment) =>
      comment.id === commentId
        ? {
            ...comment,
            replies: (comment.replies ?? []).filter(
              (reply) => reply.id !== replyId,
            ),
            updatedAt: new Date().toISOString(),
          }
        : comment,
    ),
  }));
}

export function addGuideToDocument(
  document: DesignDocument,
  guide: DesignGuide,
): DesignDocument {
  return mapActivePage(document, (_layers, _comments, _groups, guides) => ({
    guides: getGuidesAfterToggle(guides, guide),
  }));
}

export function updateGuideInDocument(
  document: DesignDocument,
  guideId: string,
  position: number,
): DesignDocument {
  return mapActivePage(document, (_layers, _comments, _groups, guides) => ({
    guides: guides.map((guide) =>
      guide.id === guideId ? { ...guide, position: Math.round(position) } : guide,
    ),
  }));
}

export function removeGuideFromDocument(
  document: DesignDocument,
  guideId: string,
): DesignDocument {
  return mapActivePage(document, (_layers, _comments, _groups, guides) => ({
    guides: guides.filter((guide) => guide.id !== guideId),
  }));
}

function getGuidesAfterToggle(guides: DesignGuide[], guide: DesignGuide) {
  const matchingGuide = guides
    .filter((item) => item.orientation === guide.orientation)
    .map((item) => ({
      guide: item,
      distance: Math.abs(item.position - guide.position),
    }))
    .filter((entry) => entry.distance <= GUIDE_TOGGLE_CANVAS_DISTANCE)
    .sort((first, second) => first.distance - second.distance)[0]?.guide;

  if (matchingGuide) {
    return guides.filter((item) => item.id !== matchingGuide.id);
  }

  return [...guides, guide];
}

export function updateLayerInDocument(
  document: DesignDocument,
  layerId: string,
  patch: Partial<DesignLayer>,
): DesignDocument {
  return mapActivePage(document, (layers) => ({
    layers: layers.map((layer) =>
      layer.id === layerId ? { ...layer, ...patch, id: layer.id } : layer,
    ),
  }));
}

export function updateLayersInDocument(
  document: DesignDocument,
  patches: LayerPatch[],
): DesignDocument {
  if (patches.length === 0) {
    return document;
  }

  const patchById = new Map(
    patches.map(({ layerId, patch }) => [layerId, patch]),
  );

  return mapActivePage(document, (layers) => ({
    layers: layers.map((layer) => {
      const patch = patchById.get(layer.id);

      return patch ? { ...layer, ...patch, id: layer.id } : layer;
    }),
  }));
}

export function updateActivePageInDocument(
  document: DesignDocument,
  patch: DesignPagePatch,
): DesignDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    pages: document.pages.map((page) =>
      page.id === document.activePageId ? { ...page, ...patch } : page,
    ),
  };
}

export function updatePageInDocument(
  document: DesignDocument,
  pageId: string,
  patch: DesignPagePatch,
): DesignDocument {
  if (!document.pages.some((page) => page.id === pageId)) {
    return document;
  }

  return {
    ...document,
    updatedAt: new Date().toISOString(),
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, ...patch } : page,
    ),
  };
}

export function setActivePageInDocument(
  document: DesignDocument,
  pageId: string,
): DesignDocument {
  if (!document.pages.some((page) => page.id === pageId)) {
    return document;
  }

  return {
    ...document,
    activePageId: pageId,
    updatedAt: new Date().toISOString(),
  };
}

export function addPageToDocument(document: DesignDocument): DesignDocument {
  const page = createBlankPage(`Page ${document.pages.length + 1}`);

  return {
    ...document,
    activePageId: page.id,
    pages: [...document.pages, page],
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateActivePageInDocument(
  document: DesignDocument,
): DesignDocument {
  const page = getActivePage(document);
  const duplicatedPage = clonePage(page, `${page.name} Copy`);

  return {
    ...document,
    activePageId: duplicatedPage.id,
    pages: [...document.pages, duplicatedPage],
    updatedAt: new Date().toISOString(),
  };
}

export function deleteActivePageInDocument(document: DesignDocument): DesignDocument {
  if (document.pages.length <= 1) {
    return document;
  }

  const activeIndex = document.pages.findIndex(
    (page) => page.id === document.activePageId,
  );
  const nextPages = document.pages.filter(
    (page) => page.id !== document.activePageId,
  );
  const nextActivePage =
    nextPages[Math.max(0, Math.min(activeIndex, nextPages.length - 1))] ??
    nextPages[0];

  if (!nextActivePage) {
    return document;
  }

  return {
    ...document,
    activePageId: nextActivePage.id,
    pages: nextPages,
    updatedAt: new Date().toISOString(),
  };
}

export function reorderPageInDocument(
  document: DesignDocument,
  pageId: string,
  direction: "up" | "down",
): DesignDocument {
  const index = document.pages.findIndex((page) => page.id === pageId);

  if (index === -1) {
    return document;
  }

  const targetIndex =
    direction === "up"
      ? Math.max(0, index - 1)
      : Math.min(document.pages.length - 1, index + 1);

  if (targetIndex === index) {
    return document;
  }

  const pages = [...document.pages];
  const [page] = pages.splice(index, 1);

  if (!page) {
    return document;
  }

  pages.splice(targetIndex, 0, page);

  return {
    ...document,
    pages,
    updatedAt: new Date().toISOString(),
  };
}

export function createComponentFromLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
): { document: DesignDocument; componentId: string | null } {
  const page = getActivePage(document);
  const selectedIds = new Set(layerIds);
  const layers = page.layers.filter((layer) => selectedIds.has(layer.id));

  if (layers.length === 0) {
    return { document, componentId: null };
  }

  const componentCount = Object.keys(document.components ?? {}).length;
  const component = createDesignComponent(
    layers,
    layers.length === 1
      ? `${layers[0]?.name ?? "Layer"} Component`
      : `Component ${componentCount + 1}`,
  );

  if (!component) {
    return { document, componentId: null };
  }

  return {
    document: {
      ...document,
      components: {
        ...(document.components ?? {}),
        [component.id]: component,
      },
      updatedAt: new Date().toISOString(),
    },
    componentId: component.id,
  };
}

export function insertComponentInstanceInDocument(
  document: DesignDocument,
  componentId: string,
  point: { x: number; y: number },
  variantId?: string,
): { document: DesignDocument; insertedIds: string[] } {
  const component = document.components?.[componentId];

  if (!component) {
    return { document, insertedIds: [] };
  }

  if (
    variantId &&
    !component.variants?.some((variant) => variant.id === variantId)
  ) {
    return { document, insertedIds: [] };
  }

  const instance = createComponentInstance(component, point, variantId);

  return {
    document: mapActivePage(document, (layers, _comments, groups) => ({
      layers: [...layers, ...instance.layers],
      groups: instance.group ? [...groups, instance.group] : groups,
    })),
    insertedIds: instance.layers.map((layer) => layer.id),
  };
}

export function createComponentVariantFromLayersInDocument(
  document: DesignDocument,
  componentId: string,
  layerIds: string[],
): { document: DesignDocument; variantId: string | null } {
  const component = document.components?.[componentId];
  const page = getActivePage(document);
  const selectedIds = new Set(layerIds);
  const layers = page.layers.filter((layer) => selectedIds.has(layer.id));

  if (!component || layers.length === 0) {
    return { document, variantId: null };
  }

  const variantName = `Variant ${(component.variants?.length ?? 0) + 2}`;
  const variant = createDesignComponentVariant(layers, variantName);

  if (!variant) {
    return { document, variantId: null };
  }

  return {
    document: {
      ...document,
      components: {
        ...(document.components ?? {}),
        [componentId]: {
          ...component,
          propertyDefinitions: withVariantPropertyOption(component, variantName),
          variants: [...(component.variants ?? []), variant],
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    },
    variantId: variant.id,
  };
}

export function renameComponentInDocument(
  document: DesignDocument,
  componentId: string,
  name: string,
): DesignDocument {
  const component = document.components?.[componentId];
  const trimmedName = name.trim();

  if (!component || !trimmedName) {
    return document;
  }

  const now = new Date().toISOString();

  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: {
        ...component,
        name: trimmedName,
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
}

export function renameComponentVariantInDocument(
  document: DesignDocument,
  componentId: string,
  variantId: string,
  name: string,
): DesignDocument {
  const component = document.components?.[componentId];
  const trimmedName = name.trim();
  const variants = component?.variants ?? [];

  if (
    !component ||
    !trimmedName ||
    !variants.some((variant) => variant.id === variantId)
  ) {
    return document;
  }

  const now = new Date().toISOString();
  const currentVariant = variants.find((variant) => variant.id === variantId);
  const variantDefinition =
    component.propertyDefinitions?.[defaultVariantPropertyId];

  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: {
        ...component,
        propertyDefinitions: variantDefinition
          ? {
              ...component.propertyDefinitions,
              [defaultVariantPropertyId]: {
                ...variantDefinition,
                options: (variantDefinition.options ?? []).map((option) =>
                  option === currentVariant?.name
                    ? trimmedName
                    : option,
                ),
                updatedAt: now,
              },
            }
          : component.propertyDefinitions,
        variants: variants.map((variant) =>
          variant.id === variantId
            ? {
                ...variant,
                name: trimmedName,
                properties: {
                  ...variant.properties,
                  Variant: trimmedName,
                },
                updatedAt: now,
              }
            : variant,
        ),
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
}

export function deleteComponentInDocument(
  document: DesignDocument,
  componentId: string,
): DesignDocument {
  if (!document.components?.[componentId]) {
    return document;
  }

  const { [componentId]: _removedComponent, ...remainingComponents } =
    document.components;

  return {
    ...document,
    components: remainingComponents,
    pages: document.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        layer.componentId === componentId ? detachComponentLayer(layer) : layer,
      ),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function updateComponentInstancePropertiesInDocument(
  document: DesignDocument,
  layerId: string,
  properties: Record<string, string>,
): DesignDocument {
  const page = getActivePage(document);
  const targetLayer = page.layers.find((layer) => layer.id === layerId);

  if (!targetLayer?.componentId) {
    return document;
  }

  const component = document.components?.[targetLayer.componentId];

  if (!component) {
    return document;
  }

  const instanceIds = new Set(
    getComponentInstanceLayers(page.layers, targetLayer).map(
      (layer) => layer.id,
    ),
  );

  if (instanceIds.size === 0) {
    return document;
  }

  return mapActivePage(document, (layers) => ({
    layers: layers.map((layer) =>
      instanceIds.has(layer.id)
        ? applyComponentTextProperties(
            {
              ...layer,
              componentProperties: properties,
            },
            component,
            properties,
          )
        : layer,
    ),
  }));
}

export function switchComponentInstanceVariantInDocument(
  document: DesignDocument,
  layerId: string,
  variantId?: string,
): DesignDocument {
  const page = getActivePage(document);
  const targetLayer = page.layers.find((layer) => layer.id === layerId);

  if (!targetLayer?.componentId) {
    return document;
  }

  const component = document.components?.[targetLayer.componentId];

  if (!component) {
    return document;
  }

  if (
    variantId &&
    !component.variants?.some((variant) => variant.id === variantId)
  ) {
    return document;
  }

  const variant = component.variants?.find((item) => item.id === variantId);
  const instanceLayers = getComponentInstanceLayers(page.layers, targetLayer);
  const sourceLayers = getComponentSourceLayers(component, variantId);

  if (instanceLayers.length === 0 || sourceLayers.length === 0) {
    return document;
  }

  const instanceBounds = getLayerBounds(instanceLayers);
  const componentProperties = createInstancePropertiesForVariant(
    component,
    targetLayer.componentProperties,
    variant,
  );
  const switchedById = new Map<string, DesignLayer>();

  instanceLayers.forEach((layer, index) => {
    const sourceLayer = sourceLayers[index];

    if (!sourceLayer) {
      return;
    }

    switchedById.set(
      layer.id,
      applyComponentTextProperties(
        {
          ...sourceLayer,
          id: layer.id,
          name: toInstanceLayerName(sourceLayer.name),
          groupId: layer.groupId,
          componentId: targetLayer.componentId,
          componentVariantId: variant?.id,
          componentLayerId: sourceLayer.id,
          componentProperties,
          x: Math.round(instanceBounds.left + sourceLayer.x),
          y: Math.round(instanceBounds.top + sourceLayer.y),
        },
        component,
        componentProperties,
      ),
    );
  });

  if (switchedById.size === 0) {
    return document;
  }

  return mapActivePage(document, (layers) => ({
    layers: layers.map((layer) => switchedById.get(layer.id) ?? layer),
  }));
}

export function deleteComponentVariantInDocument(
  document: DesignDocument,
  componentId: string,
  variantId: string,
): DesignDocument {
  const component = document.components?.[componentId];
  const variants = component?.variants ?? [];

  if (!component || !variants.some((variant) => variant.id === variantId)) {
    return document;
  }

  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: {
        ...component,
        variants: variants.filter((variant) => variant.id !== variantId),
        updatedAt: new Date().toISOString(),
      },
    },
    pages: document.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        layer.componentId === componentId && layer.componentVariantId === variantId
          ? detachComponentLayer(layer)
          : layer,
      ),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function updateLibraryMetadataInDocument(
  document: DesignDocument,
  patch: Partial<Pick<DesignLibraryMetadata, "name" | "teamName" | "description">>,
): DesignDocument {
  const metadata = normalizeLibraryMetadata(
    document.libraryMetadata,
    Object.values(document.components ?? {}),
  );

  return {
    ...document,
    libraryMetadata: {
      ...metadata,
      ...patch,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function publishComponentLibraryInDocument(
  document: DesignDocument,
): DesignDocument {
  const components = Object.values(document.components ?? {});
  const metadata = normalizeLibraryMetadata(document.libraryMetadata, components);
  const now = new Date().toISOString();

  return {
    ...document,
    libraryMetadata: {
      ...metadata,
      version: metadata.version + 1,
      componentCount: components.length,
      componentSignatures: getComponentSignatureMap(components),
      publishedAt: now,
      updatedAt: now,
    },
    updatedAt: now,
  };
}

export function subscribeComponentLibraryInDocument(
  document: DesignDocument,
  manifest: ComponentLibraryManifest,
): DesignDocument {
  const now = new Date().toISOString();
  const components = { ...(document.components ?? {}) };
  const pendingUpdates = {
    ...(document.pendingLibraryComponentUpdates ?? {}),
  };

  manifest.components.forEach((remoteComponent) => {
    const existing = Object.values(components).find(
      (component) =>
        component.librarySource?.libraryId === manifest.library.id &&
        component.librarySource?.remoteComponentId === remoteComponent.id,
    );
    const remoteSignature = getComponentLibrarySignature(remoteComponent);

    if (!existing) {
      const componentId = nanoid();

      components[componentId] = prepareLibraryComponent(
        remoteComponent,
        componentId,
        manifest,
        remoteSignature,
        now,
      );
      return;
    }

    const localSignature = getComponentLibrarySignature(existing);
    const hasLocalChanges =
      existing.librarySource?.status === "detached" ||
      localSignature !== existing.librarySource?.signature;
    const update = prepareLibraryComponent(
      remoteComponent,
      existing.id,
      manifest,
      remoteSignature,
      now,
    );

    if (hasLocalChanges) {
      components[existing.id] = {
        ...existing,
        librarySource: {
          ...existing.librarySource,
          libraryId: manifest.library.id,
          libraryName: manifest.library.name,
          teamName: manifest.library.teamName,
          remoteComponentId: remoteComponent.id,
          version: existing.librarySource?.version ?? manifest.library.version,
          signature:
            existing.librarySource?.signature ??
            getComponentLibrarySignature(existing),
          availableVersion: manifest.library.version,
          availableSignature: remoteSignature,
          status:
            existing.librarySource?.status === "detached"
              ? "detached"
              : "update-available",
          updatedAt: now,
        },
      };
      pendingUpdates[existing.id] = update;
      return;
    }

    components[existing.id] = update;
    delete pendingUpdates[existing.id];
  });

  return {
    ...document,
    components,
    librarySubscriptions: {
      ...(document.librarySubscriptions ?? {}),
      [manifest.library.id]: {
        ...manifest.library,
        updatedAt: now,
      },
    },
    pendingLibraryComponentUpdates: pendingUpdates,
    updatedAt: now,
  };
}

export function acceptLibraryComponentUpdateInDocument(
  document: DesignDocument,
  componentId: string,
): DesignDocument {
  const update = document.pendingLibraryComponentUpdates?.[componentId];

  if (!update) {
    return document;
  }

  const {
    [componentId]: _acceptedUpdate,
    ...remainingUpdates
  } = document.pendingLibraryComponentUpdates ?? {};

  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: update,
    },
    pendingLibraryComponentUpdates: remainingUpdates,
    updatedAt: new Date().toISOString(),
  };
}

export function detachLibraryComponentInDocument(
  document: DesignDocument,
  componentId: string,
): DesignDocument {
  const component = document.components?.[componentId];

  if (!component?.librarySource) {
    return document;
  }

  const {
    [componentId]: _pendingUpdate,
    ...remainingUpdates
  } = document.pendingLibraryComponentUpdates ?? {};

  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: {
        ...component,
        librarySource: {
          ...component.librarySource,
          status: "detached",
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    },
    pendingLibraryComponentUpdates: remainingUpdates,
    updatedAt: new Date().toISOString(),
  };
}

export function resetComponentInstanceInDocument(
  document: DesignDocument,
  layerId: string,
): DesignDocument {
  const page = getActivePage(document);
  const targetLayer = page.layers.find((layer) => layer.id === layerId);

  if (!targetLayer?.componentId) {
    return document;
  }

  const component = document.components?.[targetLayer.componentId];

  if (!component) {
    return document;
  }

  const instanceLayers = getComponentInstanceLayers(page.layers, targetLayer);
  const sourceLayers = getComponentSourceLayers(
    component,
    targetLayer.componentVariantId,
  );

  if (instanceLayers.length === 0 || sourceLayers.length === 0) {
    return document;
  }

  const instanceBounds = getLayerBounds(instanceLayers);
  const sourceById = new Map(sourceLayers.map((layer) => [layer.id, layer]));
  const resetById = new Map<string, DesignLayer>();
  const variant = component.variants?.find(
    (item) => item.id === targetLayer.componentVariantId,
  );
  const componentProperties = getComponentInstancePropertyValues(
    component,
    variant,
  );

  instanceLayers.forEach((layer, index) => {
    const sourceLayer =
      sourceById.get(layer.componentLayerId ?? "") ?? sourceLayers[index];

    if (!sourceLayer) {
      return;
    }

    const instanceProperties =
      targetLayer.componentProperties ?? componentProperties;

    resetById.set(
      layer.id,
      applyComponentTextProperties(
        {
          ...sourceLayer,
          id: layer.id,
          name: toInstanceLayerName(sourceLayer.name),
          groupId: layer.groupId,
          componentId: targetLayer.componentId,
          componentVariantId: targetLayer.componentVariantId,
          componentLayerId: sourceLayer.id,
          componentProperties: instanceProperties,
          x: Math.round(instanceBounds.left + sourceLayer.x),
          y: Math.round(instanceBounds.top + sourceLayer.y),
        },
        component,
        instanceProperties,
      ),
    );
  });

  if (resetById.size === 0) {
    return document;
  }

  return mapActivePage(document, (layers) => ({
    layers: layers.map((layer) => resetById.get(layer.id) ?? layer),
  }));
}

export function detachComponentInstanceInDocument(
  document: DesignDocument,
  layerId: string,
): DesignDocument {
  const page = getActivePage(document);
  const targetLayer = page.layers.find((layer) => layer.id === layerId);

  if (!targetLayer?.componentId) {
    return document;
  }

  const instanceIds = new Set(
    getComponentInstanceLayers(page.layers, targetLayer).map(
      (layer) => layer.id,
    ),
  );

  if (instanceIds.size === 0) {
    return document;
  }

  return mapActivePage(document, (layers) => ({
    layers: layers.map((layer) =>
      instanceIds.has(layer.id) ? detachComponentLayer(layer) : layer,
    ),
  }));
}

export function groupLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
): { document: DesignDocument; groupedLayerIds: string[] } {
  const page = getActivePage(document);
  const uniqueLayerIds = Array.from(new Set(layerIds));
  const existingIds = new Set(page.layers.map((layer) => layer.id));
  const groupedLayerIds = uniqueLayerIds.filter((layerId) =>
    existingIds.has(layerId),
  );

  if (groupedLayerIds.length < 2) {
    return { document, groupedLayerIds: [] };
  }

  const now = new Date().toISOString();
  const groupId = nanoid();

  return {
    document: mapActivePage(document, (layers, _comments, groups) => {
      const groupedIds = new Set(groupedLayerIds);
      const remainingGroups = groups
        .map((group) => ({
          ...group,
          layerIds: group.layerIds.filter((layerId) => !groupedIds.has(layerId)),
        }))
        .filter((group) => group.layerIds.length > 1);

      return {
        layers: layers.map((layer) =>
          groupedIds.has(layer.id) ? { ...layer, groupId } : layer,
        ),
        groups: [
          ...remainingGroups,
          {
            id: groupId,
            name: `Group ${remainingGroups.length + 1}`,
            layerIds: groupedLayerIds,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    }),
    groupedLayerIds,
  };
}

export function ungroupLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
): { document: DesignDocument; ungroupedLayerIds: string[] } {
  const page = getActivePage(document);
  const selectedIds = new Set(layerIds);
  const groupIds = new Set(
    page.layers
      .filter((layer) => selectedIds.has(layer.id) && layer.groupId)
      .map((layer) => layer.groupId as string),
  );

  if (groupIds.size === 0) {
    return { document, ungroupedLayerIds: [] };
  }

  const ungroupedLayerIds = page.layers
    .filter((layer) => layer.groupId && groupIds.has(layer.groupId))
    .map((layer) => layer.id);

  return {
    document: mapActivePage(document, (layers, _comments, groups) => ({
      layers: layers.map((layer) =>
        layer.groupId && groupIds.has(layer.groupId)
          ? { ...layer, groupId: undefined }
          : layer,
      ),
      groups: groups.filter((group) => !groupIds.has(group.id)),
    })),
    ungroupedLayerIds,
  };
}

export function alignLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
  alignment: LayerAlignment,
): DesignDocument {
  if (layerIds.length < 2) {
    return document;
  }

  const ids = new Set(layerIds);
  const selectedLayers = getActivePage(document).layers.filter(
    (layer) => ids.has(layer.id) && !layer.locked,
  );

  if (selectedLayers.length < 2) {
    return document;
  }

  const bounds = getLayerBounds(selectedLayers);

  return updateLayersInDocument(
    document,
    selectedLayers.map((layer) => ({
      layerId: layer.id,
      patch: getAlignmentPatch(layer, bounds, alignment),
    })),
  );
}

export function distributeLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
  distribution: LayerDistribution,
): DesignDocument {
  if (layerIds.length < 3) {
    return document;
  }

  const ids = new Set(layerIds);
  const selectedLayers = getActivePage(document).layers.filter(
    (layer) => ids.has(layer.id) && !layer.locked,
  );

  if (selectedLayers.length < 3) {
    return document;
  }

  return updateLayersInDocument(
    document,
    getDistributionPatches(selectedLayers, distribution),
  );
}

export function addLayerToDocument(
  document: DesignDocument,
  layer: DesignLayer,
): DesignDocument {
  return mapActivePage(document, (layers) => ({ layers: [...layers, layer] }));
}

export function addLayersToDocument(
  document: DesignDocument,
  layersToAdd: DesignLayer[],
): DesignDocument {
  if (layersToAdd.length === 0) {
    return document;
  }

  return mapActivePage(document, (layers) => ({
    layers: [...layers, ...layersToAdd],
  }));
}

export function removeLayerFromDocument(
  document: DesignDocument,
  layerId: string,
): DesignDocument {
  return mapActivePage(document, (layers) => ({
    layers: layers.filter((layer) => layer.id !== layerId),
  }));
}

export function removeLayersFromDocument(
  document: DesignDocument,
  layerIds: string[],
): DesignDocument {
  if (layerIds.length === 0) {
    return document;
  }

  const ids = new Set(layerIds);

  return mapActivePage(document, (layers, _comments, groups) => ({
    layers: layers.filter((layer) => !ids.has(layer.id)),
    groups: groups
      .map((group) => ({
        ...group,
        layerIds: group.layerIds.filter((layerId) => !ids.has(layerId)),
      }))
      .filter((group) => group.layerIds.length > 1),
  }));
}

export function replaceLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
  replacementLayers: DesignLayer[],
): DesignDocument {
  if (layerIds.length === 0 && replacementLayers.length === 0) {
    return document;
  }

  const ids = new Set(layerIds);

  return mapActivePage(document, (layers, _comments, groups) => {
    const firstRemovedIndex = layers.findIndex((layer) => ids.has(layer.id));
    const insertIndex = firstRemovedIndex === -1 ? layers.length : firstRemovedIndex;
    const remainingLayers = layers.filter((layer) => !ids.has(layer.id));
    const nextLayers = [
      ...remainingLayers.slice(0, insertIndex),
      ...replacementLayers,
      ...remainingLayers.slice(insertIndex),
    ];

    return {
      layers: nextLayers,
      groups: groups
        .map((group) => ({
          ...group,
          layerIds: group.layerIds.filter((layerId) => !ids.has(layerId)),
        }))
        .filter((group) => group.layerIds.length > 1),
    };
  });
}

export function duplicateLayerInDocument(
  document: DesignDocument,
  layerId: string,
): { document: DesignDocument; duplicatedId: string | null } {
  const page = getActivePage(document);
  const layer = page.layers.find((item) => item.id === layerId);

  if (!layer) {
    return { document, duplicatedId: null };
  }

  const duplicatedId = nanoid();
  const { groupId: _groupId, ...ungroupedLayer } = layer;
  const duplicated = {
    ...ungroupedLayer,
    id: duplicatedId,
    name: `${layer.name} Copy`,
    x: layer.x + 24,
    y: layer.y + 24,
  };

  return {
    document: addLayerToDocument(document, duplicated),
    duplicatedId,
  };
}

export function duplicateLayersInDocument(
  document: DesignDocument,
  layerIds: string[],
): { document: DesignDocument; duplicatedIds: string[] } {
  if (layerIds.length === 0) {
    return { document, duplicatedIds: [] };
  }

  const page = getActivePage(document);
  const selectedLayers = layerIds
    .map((layerId) => page.layers.find((layer) => layer.id === layerId))
    .filter((layer): layer is DesignLayer => Boolean(layer));

  if (selectedLayers.length === 0) {
    return { document, duplicatedIds: [] };
  }

  const duplicatedLayers = selectedLayers.map((layer) => {
    const { groupId: _groupId, ...ungroupedLayer } = layer;

    return {
      ...ungroupedLayer,
      id: nanoid(),
      name: `${layer.name} Copy`,
      x: layer.x + 24,
      y: layer.y + 24,
    };
  });

  return {
    document: mapActivePage(document, (layers) => ({
      layers: [...layers, ...duplicatedLayers],
    })),
    duplicatedIds: duplicatedLayers.map((layer) => layer.id),
  };
}

export function pasteLayersIntoDocument(
  document: DesignDocument,
  layers: DesignLayer[],
): { document: DesignDocument; pastedIds: string[] } {
  if (layers.length === 0) {
    return { document, pastedIds: [] };
  }

  const pastedLayers = layers.map((layer) => {
    const { groupId: _groupId, ...ungroupedLayer } = layer;

    return {
      ...ungroupedLayer,
      id: nanoid(),
      name: layer.name.endsWith(" Copy") ? layer.name : `${layer.name} Copy`,
      x: layer.x + 32,
      y: layer.y + 32,
    };
  });

  return {
    document: mapActivePage(document, (currentLayers) => ({
      layers: [...currentLayers, ...pastedLayers],
    })),
    pastedIds: pastedLayers.map((layer) => layer.id),
  };
}

export function reorderLayerInDocument(
  document: DesignDocument,
  layerId: string,
  direction: "forward" | "backward" | "front" | "back",
): DesignDocument {
  return mapActivePage(document, (layers) => {
    const index = layers.findIndex((layer) => layer.id === layerId);

    if (index === -1) {
      return { layers };
    }

    const nextLayers = [...layers];
    const [layer] = nextLayers.splice(index, 1);

    if (!layer) {
      return { layers };
    }

    if (direction === "front") {
      nextLayers.push(layer);
      return { layers: nextLayers };
    }

    if (direction === "back") {
      nextLayers.unshift(layer);
      return { layers: nextLayers };
    }

    const targetIndex =
      direction === "forward"
        ? Math.min(nextLayers.length, index + 1)
        : Math.max(0, index - 1);

    nextLayers.splice(targetIndex, 0, layer);
    return { layers: nextLayers };
  });
}

function getLayerBounds(layers: DesignLayer[]) {
  const left = Math.min(...layers.map((layer) => layer.x));
  const top = Math.min(...layers.map((layer) => layer.y));
  const right = Math.max(...layers.map((layer) => layer.x + layer.width));
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));

  return {
    left,
    top,
    right,
    bottom,
    horizontalCenter: left + (right - left) / 2,
    verticalCenter: top + (bottom - top) / 2,
  };
}

function getAlignmentPatch(
  layer: DesignLayer,
  bounds: ReturnType<typeof getLayerBounds>,
  alignment: LayerAlignment,
): Partial<DesignLayer> {
  if (alignment === "left") {
    return { x: Math.round(bounds.left) };
  }

  if (alignment === "horizontal-center") {
    return { x: Math.round(bounds.horizontalCenter - layer.width / 2) };
  }

  if (alignment === "right") {
    return { x: Math.round(bounds.right - layer.width) };
  }

  if (alignment === "top") {
    return { y: Math.round(bounds.top) };
  }

  if (alignment === "vertical-center") {
    return { y: Math.round(bounds.verticalCenter - layer.height / 2) };
  }

  return { y: Math.round(bounds.bottom - layer.height) };
}

function getDistributionPatches(
  layers: DesignLayer[],
  distribution: LayerDistribution,
): LayerPatch[] {
  const sortedLayers = [...layers].sort((first, second) =>
    distribution === "horizontal" ? first.x - second.x : first.y - second.y,
  );
  const bounds = getLayerBounds(sortedLayers);

  if (distribution === "horizontal") {
    const totalWidth = sortedLayers.reduce((sum, layer) => sum + layer.width, 0);
    const gap = (bounds.right - bounds.left - totalWidth) / (sortedLayers.length - 1);
    let nextX = bounds.left;

    return sortedLayers.map((layer) => {
      const patch = {
        layerId: layer.id,
        patch: { x: Math.round(nextX) },
      };
      nextX += layer.width + gap;
      return patch;
    });
  }

  const totalHeight = sortedLayers.reduce((sum, layer) => sum + layer.height, 0);
  const gap = (bounds.bottom - bounds.top - totalHeight) / (sortedLayers.length - 1);
  let nextY = bounds.top;

  return sortedLayers.map((layer) => {
    const patch = {
      layerId: layer.id,
      patch: { y: Math.round(nextY) },
    };
    nextY += layer.height + gap;
    return patch;
  });
}

function createBlankPage(name: string): DesignPage {
  return {
    id: nanoid(),
    name,
    background: "#0f0f10",
    grid: {
      visible: true,
      snap: false,
      objectSnap: true,
      size: 24,
    },
    comments: [],
    groups: [],
    guides: [],
    layers: [],
  };
}

function clonePage(page: DesignPage, name: string): DesignPage {
  const layerIdMap = new Map(page.layers.map((layer) => [layer.id, nanoid()]));
  const groupIdMap = new Map(
    (page.groups ?? []).map((group) => [group.id, nanoid()]),
  );

  return {
    ...page,
    id: nanoid(),
    name,
    layers: page.layers.map((layer) => ({
      ...layer,
      id: layerIdMap.get(layer.id) ?? nanoid(),
      groupId: layer.groupId ? groupIdMap.get(layer.groupId) : undefined,
    })),
    groups: (page.groups ?? []).map((group) => ({
      ...group,
      id: groupIdMap.get(group.id) ?? nanoid(),
      layerIds: group.layerIds
        .map((layerId) => layerIdMap.get(layerId))
        .filter((layerId): layerId is string => Boolean(layerId)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    guides: (page.guides ?? []).map((guide) => ({
      ...guide,
      id: nanoid(),
      createdAt: new Date().toISOString(),
    })),
    comments: (page.comments ?? []).map((comment) => ({
      ...comment,
      id: nanoid(),
      replies: (comment.replies ?? []).map((reply) => ({
        ...reply,
        id: nanoid(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
}

function baseLayer(
  id: string,
  type: DesignLayer["type"],
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<DesignLayer>,
): DesignLayer {
  return {
    id,
    type,
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blendMode: "normal",
    fill: "#27272a",
    stroke: "#3f3f46",
    strokeWidth: 1,
    strokeLineCap: "butt",
    strokeLineJoin: "miter",
    cornerRadius: 0,
    ...overrides,
  };
}

function extractMentions(text: string) {
  return Array.from(text.matchAll(/@([\w.-]+)/g), (match) => match[1] ?? "")
    .filter(Boolean)
    .filter((mention, index, mentions) => mentions.indexOf(mention) === index);
}

function sameReactionActor(
  firstName: string,
  firstEmail: string | null | undefined,
  secondName: string,
  secondEmail: string | null | undefined,
) {
  if (firstEmail || secondEmail) {
    return firstEmail === secondEmail;
  }

  return firstName === secondName;
}

function detachComponentLayer(layer: DesignLayer): DesignLayer {
  const {
    componentId: _componentId,
    componentVariantId: _componentVariantId,
    componentLayerId: _componentLayerId,
    componentProperties: _componentProperties,
    componentSlotName: _componentSlotName,
    componentSlotType: _componentSlotType,
    ...detachedLayer
  } = layer;

  return detachedLayer;
}

function createInstancePropertiesForVariant(
  component: DesignComponent,
  previousProperties: Record<string, string> | undefined,
  variant: DesignComponentVariant | undefined,
) {
  const defaults = getComponentInstancePropertyValues(component, variant);
  const variantPropertyNames = new Set(
    getComponentVariantPropertyNames(component),
  );
  const preservedProperties = Object.fromEntries(
    Object.entries(previousProperties ?? {}).filter(
      ([name]) => !variantPropertyNames.has(name),
    ),
  );

  return {
    ...defaults,
    ...preservedProperties,
    ...(variant?.properties ?? {}),
  };
}

function applyComponentTextProperties(
  layer: DesignLayer,
  component: DesignComponent,
  properties: Record<string, string>,
) {
  const propertyName = getComponentTextPropertyNameForLayer(
    component,
    layer.componentLayerId ?? layer.id,
    getComponentSlotName(layer),
  );

  if (
    !propertyName ||
    layer.text === undefined ||
    properties[propertyName] === undefined
  ) {
    return layer;
  }

  return {
    ...layer,
    text: properties[propertyName],
  };
}

function prepareLibraryComponent(
  component: DesignComponent,
  componentId: string,
  manifest: ComponentLibraryManifest,
  signature: string,
  now: string,
): DesignComponent {
  return {
    ...component,
    id: componentId,
    librarySource: {
      libraryId: manifest.library.id,
      libraryName: manifest.library.name,
      teamName: manifest.library.teamName,
      remoteComponentId: component.id,
      version: manifest.library.version,
      signature,
      status: "synced",
      reviewedAt: now,
      updatedAt: now,
    },
    updatedAt: now,
  };
}

function getComponentSourceLayers(
  component: DesignComponent,
  variantId?: string,
) {
  return (
    component.variants?.find((variant) => variant.id === variantId)?.layers ??
    component.layers
  );
}

function getComponentInstanceLayers(
  layers: DesignLayer[],
  targetLayer: DesignLayer,
) {
  if (!targetLayer.componentId) {
    return [];
  }

  if (!targetLayer.groupId) {
    return [targetLayer];
  }

  const scopedLayers = layers.filter(
    (layer) =>
      layer.groupId === targetLayer.groupId &&
      layer.componentId === targetLayer.componentId &&
      layer.componentVariantId === targetLayer.componentVariantId,
  );

  return scopedLayers.length > 0 ? scopedLayers : [targetLayer];
}

function toInstanceLayerName(name: string) {
  return name.endsWith(" Instance") ? name : `${name} Instance`;
}

function mapActivePage(
  document: DesignDocument,
  mapper: (
    layers: DesignLayer[],
    comments: DesignComment[],
    groups: DesignGroup[],
    guides: DesignGuide[],
  ) => Partial<Pick<DesignPage, "layers" | "comments" | "groups" | "guides">>,
): DesignDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    pages: document.pages.map((page) =>
      page.id === document.activePageId
        ? {
            ...page,
            ...mapper(
              page.layers,
              page.comments ?? [],
              page.groups ?? [],
              page.guides ?? [],
            ),
          }
        : page,
    ),
  };
}
