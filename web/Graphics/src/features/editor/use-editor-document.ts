"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addPageToDocument,
  addLayerToDocument,
  addLayersToDocument,
  addCommentToDocument,
  addCommentReplyToDocument,
  addGuideToDocument,
  alignLayersInDocument,
  assignCommentInDocument,
  createComponentFromLayersInDocument,
  createComponentVariantFromLayersInDocument,
  createGuide,
  createCommentReply,
  acceptLibraryComponentUpdateInDocument,
  deleteActivePageInDocument,
  deleteComponentInDocument,
  deleteComponentVariantInDocument,
  detachLibraryComponentInDocument,
  detachComponentInstanceInDocument,
  distributeLayersInDocument,
  duplicateActivePageInDocument,
  duplicateLayersInDocument,
  getActivePage,
  groupLayersInDocument,
  insertComponentInstanceInDocument,
  pasteLayersIntoDocument,
  removeCommentFromDocument,
  removeCommentReplyFromDocument,
  removeGuideFromDocument,
  removeLayersFromDocument,
  clearCommentAssignmentInDocument,
  replaceLayersInDocument,
  reorderPageInDocument,
  renameComponentInDocument,
  renameComponentVariantInDocument,
  resetComponentInstanceInDocument,
  reorderLayerInDocument,
  setActivePageInDocument,
  type LayerPatch,
  ungroupLayersInDocument,
  updateActivePageInDocument,
  updateCommentInDocument,
  updateCommentReplyInDocument,
  updateCommentsInDocument,
  updateComponentInstancePropertiesInDocument,
  updateGuideInDocument,
  updateLayerInDocument,
  updatePageInDocument,
  updateLayersInDocument,
  switchComponentInstanceVariantInDocument,
  publishComponentLibraryInDocument,
  subscribeComponentLibraryInDocument,
  type DesignPagePatch,
  updateLibraryMetadataInDocument,
  toggleCommentReactionInDocument,
} from "@/features/editor/document-utils";
import {
  addComponentPropertyDefinitionInDocument,
  deleteComponentPropertyDefinitionInDocument,
  updateComponentPropertyDefinitionInDocument,
  updateComponentSlotInDocument,
  type ComponentPropertyDefinitionPatch,
  type ComponentSlotPatch,
} from "@/features/editor/component-definition-document";
import type { ComponentLibraryManifest } from "@/features/editor/component-library-manifest";
import type {
  DesignActivityEvent,
  DesignComment,
  DesignCommentReactionKind,
  DesignComponentPropertyType,
  DesignDocument,
  DesignEffectStyle,
  DesignGuide,
  DesignLayer,
  DesignLayoutGridStyle,
  DesignLayoutPresetStyle,
  DesignPage,
  DesignPaintStyle,
  DesignTextStyle,
  DesignVariableDefinition,
  DesignVariableMode,
  LayerAlignment,
  LayerDistribution,
} from "@/features/editor/types";
import { applyVariableBindingsToDocument } from "@/features/editor/variable-bindings";
import {
  appendActivityEvent,
  clearActivityEvents,
} from "@/features/editor/activity-log";
import { bindMatchingComponentVariablesInDocument } from "@/features/editor/component-variable-coverage";
import { removeStaleComponentVariableBindingsInDocument } from "@/features/editor/component-variable-binding-review";

const HISTORY_LIMIT = 60;

type CommentMutationActor = {
  actorName: string;
  actorEmail?: string | null;
};

export function useEditorDocument(initialDocument: DesignDocument) {
  const [document, setDocument] = useState(initialDocument);
  const [past, setPast] = useState<DesignDocument[]>([]);
  const [future, setFuture] = useState<DesignDocument[]>([]);
  const [selectedLayerIdsState, setSelectedLayerIdsState] = useState<string[]>(
    () => getInitialSelection(initialDocument),
  );

  const activePage = useMemo(() => getActivePage(document), [document]);
  const groups = activePage.groups ?? [];
  const guides = activePage.guides ?? [];
  const selectedLayerIds = useMemo(() => {
    const layerIds = new Set(activePage.layers.map((layer) => layer.id));
    return selectedLayerIdsState.filter((layerId) => layerIds.has(layerId));
  }, [activePage.layers, selectedLayerIdsState]);
  const selectedLayerId = selectedLayerIds.at(-1) ?? null;
  const selectedLayer =
    activePage.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedLayers = selectedLayerIds
    .map((layerId) => activePage.layers.find((layer) => layer.id === layerId))
    .filter((layer): layer is DesignLayer => Boolean(layer));
  const comments = activePage.comments ?? [];
  const components = useMemo(
    () => Object.values(document.components ?? {}),
    [document.components],
  );
  const pages = document.pages;

  const setSelectedLayerId = useCallback((layerId: string | null) => {
    setSelectedLayerIdsState(layerId ? [layerId] : []);
  }, []);

  const setSelectedLayerIds = useCallback((layerIds: string[]) => {
    setSelectedLayerIdsState(Array.from(new Set(layerIds)));
  }, []);

  const selectAllLayers = useCallback(() => {
    setSelectedLayerIdsState(activePage.layers.map((layer) => layer.id));
  }, [activePage.layers]);

  const clearSelection = useCallback(() => {
    setSelectedLayerIdsState([]);
  }, []);

  const selectAdjacentLayer = useCallback(
    (direction: "next" | "previous") => {
      const visibleLayerIds = activePage.layers
        .filter((layer) => layer.visible)
        .map((layer) => layer.id);

      if (visibleLayerIds.length === 0) {
        setSelectedLayerIdsState([]);
        return;
      }

      const currentIndex = selectedLayerId
        ? visibleLayerIds.indexOf(selectedLayerId)
        : -1;

      if (currentIndex === -1) {
        setSelectedLayerIdsState([
          direction === "next"
            ? visibleLayerIds[0]
            : visibleLayerIds[visibleLayerIds.length - 1],
        ]);
        return;
      }

      const offset = direction === "next" ? 1 : -1;
      const nextIndex =
        (currentIndex + offset + visibleLayerIds.length) %
        visibleLayerIds.length;

      setSelectedLayerIdsState([visibleLayerIds[nextIndex]]);
    },
    [activePage.layers, selectedLayerId],
  );

  const selectEdgeLayer = useCallback(
    (edge: "front" | "back") => {
      const visibleLayerIds = activePage.layers
        .filter((layer) => layer.visible)
        .map((layer) => layer.id);

      if (visibleLayerIds.length === 0) {
        setSelectedLayerIdsState([]);
        return;
      }

      setSelectedLayerIdsState([
        edge === "front"
          ? visibleLayerIds[visibleLayerIds.length - 1]
          : visibleLayerIds[0],
      ]);
    },
    [activePage.layers],
  );

  const remember = useCallback((snapshot: DesignDocument) => {
    setPast((items) => [...items, snapshot].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, []);

  const commit = useCallback((updater: (current: DesignDocument) => DesignDocument) => {
    setDocument((current) => {
      const next = updater(current);
      if (next === current) {
        return current;
      }
      setPast((items) => [...items, current].slice(-HISTORY_LIMIT));
      setFuture([]);
      return next;
    });
  }, []);

  const applyTransient = useCallback(
    (updater: (current: DesignDocument) => DesignDocument) => {
      setDocument(updater);
    },
    [],
  );

  const recordActivity = useCallback((event: DesignActivityEvent) => {
    setDocument((current) => appendActivityEvent(current, event));
  }, []);

  const clearActivity = useCallback(() => {
    setDocument(clearActivityEvents);
  }, []);

  const addLayer = useCallback(
    (layer: DesignLayer) => {
      commit((current) => addLayerToDocument(current, layer));
      setSelectedLayerIdsState([layer.id]);
    },
    [commit],
  );

  const addLayers = useCallback(
    (layers: DesignLayer[]) => {
      if (layers.length === 0) {
        return;
      }

      commit((current) => addLayersToDocument(current, layers));
      setSelectedLayerIdsState(layers.map((layer) => layer.id));
    },
    [commit],
  );

  const replaceLayers = useCallback(
    (layerIds: string[], replacementLayers: DesignLayer[]) => {
      if (layerIds.length === 0 && replacementLayers.length === 0) {
        return;
      }

      commit((current) =>
        replaceLayersInDocument(current, layerIds, replacementLayers),
      );
      setSelectedLayerIdsState(replacementLayers.map((layer) => layer.id));
    },
    [commit],
  );

  const addComment = useCallback(
    (comment: DesignComment) => {
      commit((current) => addCommentToDocument(current, comment));
      setSelectedLayerIdsState([]);
    },
    [commit],
  );

  const addGuide = useCallback(
    (orientation: DesignGuide["orientation"], position: number) => {
      commit((current) =>
        addGuideToDocument(current, createGuide(orientation, position)),
      );
      setSelectedLayerIdsState([]);
    },
    [commit],
  );

  const updateLayer = useCallback(
    (layerId: string, patch: Partial<DesignLayer>) => {
      commit((current) => updateLayerInDocument(current, layerId, patch));
    },
    [commit],
  );

  const updateLayerTransient = useCallback(
    (layerId: string, patch: Partial<DesignLayer>) => {
      applyTransient((current) => updateLayerInDocument(current, layerId, patch));
    },
    [applyTransient],
  );

  const updateLayers = useCallback(
    (patches: LayerPatch[]) => {
      commit((current) => updateLayersInDocument(current, patches));
    },
    [commit],
  );

  const updateLayersTransient = useCallback(
    (patches: LayerPatch[]) => {
      applyTransient((current) => updateLayersInDocument(current, patches));
    },
    [applyTransient],
  );

  const updateActivePage = useCallback(
    (patch: DesignPagePatch) => {
      commit((current) => updateActivePageInDocument(current, patch));
    },
    [commit],
  );

  const updateLayoutGridStyles = useCallback(
    (layoutGridStyles: Record<string, DesignLayoutGridStyle>) => {
      commit((current) => ({
        ...current,
        layoutGridStyles,
        updatedAt: new Date().toISOString(),
      }));
    },
    [commit],
  );

  const updatePaintStyles = useCallback(
    (paintStyles: Record<string, DesignPaintStyle>) => {
      commit((current) => ({
        ...current,
        paintStyles,
        updatedAt: new Date().toISOString(),
      }));
    },
    [commit],
  );

  const updateTextStyles = useCallback(
    (textStyles: Record<string, DesignTextStyle>) => {
      commit((current) => ({
        ...current,
        textStyles,
        updatedAt: new Date().toISOString(),
      }));
    },
    [commit],
  );

  const updateEffectStyles = useCallback(
    (effectStyles: Record<string, DesignEffectStyle>) => {
      commit((current) => ({
        ...current,
        effectStyles,
        updatedAt: new Date().toISOString(),
      }));
    },
    [commit],
  );

  const updateLayoutPresetStyles = useCallback(
    (layoutPresetStyles: Record<string, DesignLayoutPresetStyle>) => {
      commit((current) => ({
        ...current,
        layoutPresetStyles,
        updatedAt: new Date().toISOString(),
      }));
    },
    [commit],
  );

  const updateVariableSystem = useCallback(
    (
      patch: Partial<
        Pick<
          DesignDocument,
          | "variables"
          | "variableModes"
          | "activeVariableModeId"
          | "variableDefinitions"
          | "variableCollections"
        >
      >,
      applyBindings = false,
    ) => {
      commit((current) => {
        const next = {
          ...current,
          ...patch,
          updatedAt: new Date().toISOString(),
        };

        return applyBindings ? applyVariableBindingsToDocument(next) : next;
      });
    },
    [commit],
  );

  const bindMatchingComponentVariables = useCallback(() => {
    commit(bindMatchingComponentVariablesInDocument);
  }, [commit]);

  const removeStaleComponentVariableBindings = useCallback(() => {
    commit(removeStaleComponentVariableBindingsInDocument);
  }, [commit]);

  const setActivePage = useCallback(
    (pageId: string) => {
      commit((current) => {
        const next = setActivePageInDocument(current, pageId);
        setSelectedLayerIdsState(getInitialSelection(next));
        return next;
      });
    },
    [commit],
  );

  const updatePage = useCallback(
    (pageId: string, patch: DesignPagePatch) => {
      commit((current) => updatePageInDocument(current, pageId, patch));
    },
    [commit],
  );

  const addPage = useCallback(() => {
    commit((current) => {
      const next = addPageToDocument(current);
      setSelectedLayerIdsState(getInitialSelection(next));
      return next;
    });
  }, [commit]);

  const duplicateActivePage = useCallback(() => {
    commit((current) => {
      const next = duplicateActivePageInDocument(current);
      setSelectedLayerIdsState(getInitialSelection(next));
      return next;
    });
  }, [commit]);

  const deleteActivePage = useCallback(() => {
    commit((current) => {
      const next = deleteActivePageInDocument(current);
      setSelectedLayerIdsState(getInitialSelection(next));
      return next;
    });
  }, [commit]);

  const reorderPage = useCallback(
    (pageId: string, direction: "up" | "down") => {
      commit((current) => reorderPageInDocument(current, pageId, direction));
    },
    [commit],
  );

  const updateGuide = useCallback(
    (guideId: string, position: number) => {
      commit((current) => updateGuideInDocument(current, guideId, position));
    },
    [commit],
  );

  const updateGuideTransient = useCallback(
    (guideId: string, position: number) => {
      applyTransient((current) =>
        updateGuideInDocument(current, guideId, position),
      );
    },
    [applyTransient],
  );

  const removeGuide = useCallback(
    (guideId: string) => {
      commit((current) => removeGuideFromDocument(current, guideId));
    },
    [commit],
  );

  const updateComment = useCallback(
    (
      commentId: string,
      patch: Partial<
        Pick<DesignComment, "text" | "resolved" | "x" | "y" | "dueDate">
      >,
      actor?: CommentMutationActor,
    ) => {
      commit((current) =>
        updateCommentInDocument(current, commentId, patch, actor),
      );
    },
    [commit],
  );

  const updateCommentTransient = useCallback(
    (
      commentId: string,
      patch: Partial<
        Pick<DesignComment, "text" | "resolved" | "x" | "y" | "dueDate">
      >,
    ) => {
      applyTransient((current) =>
        updateCommentInDocument(current, commentId, patch),
      );
    },
    [applyTransient],
  );

  const updateComments = useCallback(
    (
      commentIds: string[],
      patch: Partial<
        Pick<
          DesignComment,
          "resolved" | "assigneeName" | "assigneeEmail" | "dueDate"
        >
      >,
      actor?: CommentMutationActor,
    ) => {
      if (commentIds.length === 0) {
        return;
      }

      commit((current) =>
        updateCommentsInDocument(current, commentIds, patch, actor),
      );
    },
    [commit],
  );

  const removeComment = useCallback(
    (commentId: string) => {
      commit((current) => removeCommentFromDocument(current, commentId));
    },
    [commit],
  );

  const toggleCommentReaction = useCallback(
    (
      commentId: string,
      kind: DesignCommentReactionKind,
      actorName: string,
      actorEmail?: string | null,
    ) => {
      commit((current) =>
        toggleCommentReactionInDocument(
          current,
          commentId,
          kind,
          actorName,
          actorEmail,
        ),
      );
    },
    [commit],
  );

  const assignComment = useCallback(
    (commentId: string, assigneeName: string, assigneeEmail?: string | null) => {
      commit((current) =>
        assignCommentInDocument(
          current,
          commentId,
          assigneeName,
          assigneeEmail,
        ),
      );
    },
    [commit],
  );

  const clearCommentAssignment = useCallback(
    (commentId: string) => {
      commit((current) => clearCommentAssignmentInDocument(current, commentId));
    },
    [commit],
  );

  const addCommentReply = useCallback(
    (commentId: string, text: string, authorName: string) => {
      const trimmedText = text.trim();

      if (!trimmedText) {
        return;
      }

      commit((current) =>
        addCommentReplyToDocument(
          current,
          commentId,
          createCommentReply(trimmedText, authorName),
        ),
      );
    },
    [commit],
  );

  const updateCommentReply = useCallback(
    (commentId: string, replyId: string, text: string) => {
      commit((current) =>
        updateCommentReplyInDocument(current, commentId, replyId, text),
      );
    },
    [commit],
  );

  const removeCommentReply = useCallback(
    (commentId: string, replyId: string) => {
      commit((current) =>
        removeCommentReplyFromDocument(current, commentId, replyId),
      );
    },
    [commit],
  );

  const createComponentFromSelection = useCallback(() => {
    if (selectedLayerIds.length === 0) {
      return;
    }

    commit((current) =>
      createComponentFromLayersInDocument(current, selectedLayerIds).document,
    );
  }, [commit, selectedLayerIds]);

  const insertComponentInstance = useCallback(
    (
      componentId: string,
      point: { x: number; y: number },
      variantId?: string,
    ) => {
      commit((current) => {
        const result = insertComponentInstanceInDocument(
          current,
          componentId,
          point,
          variantId,
        );
        setSelectedLayerIdsState(result.insertedIds);
        return result.document;
      });
    },
    [commit],
  );

  const createComponentVariantFromSelection = useCallback(
    (componentId: string) => {
      if (selectedLayerIds.length === 0) {
        return;
      }

      commit((current) =>
        createComponentVariantFromLayersInDocument(
          current,
          componentId,
          selectedLayerIds,
        ).document,
      );
    },
    [commit, selectedLayerIds],
  );

  const renameComponent = useCallback(
    (componentId: string, name: string) => {
      commit((current) => renameComponentInDocument(current, componentId, name));
    },
    [commit],
  );

  const renameComponentVariant = useCallback(
    (componentId: string, variantId: string, name: string) => {
      commit((current) =>
        renameComponentVariantInDocument(current, componentId, variantId, name),
      );
    },
    [commit],
  );

  const deleteComponent = useCallback(
    (componentId: string) => {
      commit((current) => deleteComponentInDocument(current, componentId));
    },
    [commit],
  );

  const deleteComponentVariant = useCallback(
    (componentId: string, variantId: string) => {
      commit((current) =>
        deleteComponentVariantInDocument(current, componentId, variantId),
      );
    },
    [commit],
  );

  const addComponentPropertyDefinition = useCallback(
    (componentId: string, type: DesignComponentPropertyType) => {
      commit((current) =>
        addComponentPropertyDefinitionInDocument(current, componentId, type),
      );
    },
    [commit],
  );

  const updateComponentPropertyDefinition = useCallback(
    (
      componentId: string,
      definitionId: string,
      patch: ComponentPropertyDefinitionPatch,
    ) => {
      commit((current) =>
        updateComponentPropertyDefinitionInDocument(
          current,
          componentId,
          definitionId,
          patch,
        ),
      );
    },
    [commit],
  );

  const deleteComponentPropertyDefinition = useCallback(
    (componentId: string, definitionId: string) => {
      commit((current) =>
        deleteComponentPropertyDefinitionInDocument(
          current,
          componentId,
          definitionId,
        ),
      );
    },
    [commit],
  );

  const updateComponentSlot = useCallback(
    (componentId: string, sourceLayerId: string, patch: ComponentSlotPatch) => {
      commit((current) =>
        updateComponentSlotInDocument(
          current,
          componentId,
          sourceLayerId,
          patch,
        ),
      );
    },
    [commit],
  );

  const resetComponentInstance = useCallback(
    (layerId: string) => {
      commit((current) => resetComponentInstanceInDocument(current, layerId));
    },
    [commit],
  );

  const detachComponentInstance = useCallback(
    (layerId: string) => {
      commit((current) => detachComponentInstanceInDocument(current, layerId));
    },
    [commit],
  );

  const updateComponentInstanceProperties = useCallback(
    (layerId: string, properties: Record<string, string>) => {
      commit((current) =>
        updateComponentInstancePropertiesInDocument(
          current,
          layerId,
          properties,
        ),
      );
    },
    [commit],
  );

  const switchComponentInstanceVariant = useCallback(
    (layerId: string, variantId?: string) => {
      commit((current) =>
        switchComponentInstanceVariantInDocument(current, layerId, variantId),
      );
    },
    [commit],
  );

  const updateLibraryMetadata = useCallback(
    (patch: Parameters<typeof updateLibraryMetadataInDocument>[1]) => {
      commit((current) => updateLibraryMetadataInDocument(current, patch));
    },
    [commit],
  );

  const publishComponentLibrary = useCallback(() => {
    commit(publishComponentLibraryInDocument);
  }, [commit]);

  const subscribeComponentLibrary = useCallback(
    (manifest: ComponentLibraryManifest) => {
      commit((current) => subscribeComponentLibraryInDocument(current, manifest));
    },
    [commit],
  );

  const acceptLibraryComponentUpdate = useCallback(
    (componentId: string) => {
      commit((current) =>
        acceptLibraryComponentUpdateInDocument(current, componentId),
      );
    },
    [commit],
  );

  const detachLibraryComponent = useCallback(
    (componentId: string) => {
      commit((current) => detachLibraryComponentInDocument(current, componentId));
    },
    [commit],
  );

  const deleteSelectedLayer = useCallback(() => {
    if (selectedLayerIds.length === 0) {
      return;
    }
    commit((current) => removeLayersFromDocument(current, selectedLayerIds));
    setSelectedLayerIdsState([]);
  }, [commit, selectedLayerIds]);

  const deleteLayers = useCallback(
    (layerIds: string[]) => {
      if (layerIds.length === 0) {
        return;
      }

      commit((current) => removeLayersFromDocument(current, layerIds));
      setSelectedLayerIdsState((current) =>
        current.filter((layerId) => !layerIds.includes(layerId)),
      );
    },
    [commit],
  );

  const duplicateSelectedLayer = useCallback(() => {
    if (selectedLayerIds.length === 0) {
      return;
    }
    commit((current) => {
      const result = duplicateLayersInDocument(current, selectedLayerIds);
      setSelectedLayerIdsState(result.duplicatedIds);
      return result.document;
    });
  }, [commit, selectedLayerIds]);

  const duplicateLayers = useCallback(
    (layerIds: string[]) => {
      if (layerIds.length === 0) {
        return;
      }

      commit((current) => {
        const result = duplicateLayersInDocument(current, layerIds);
        setSelectedLayerIdsState(result.duplicatedIds);
        return result.document;
      });
    },
    [commit],
  );

  const pasteLayers = useCallback(
    (layers: DesignLayer[]) => {
      if (layers.length === 0) {
        return;
      }

      commit((current) => {
        const result = pasteLayersIntoDocument(current, layers);
        setSelectedLayerIdsState(result.pastedIds);
        return result.document;
      });
    },
    [commit],
  );

  const groupSelectedLayers = useCallback(() => {
    if (selectedLayerIds.length < 2) {
      return;
    }

    commit((current) => {
      const result = groupLayersInDocument(current, selectedLayerIds);
      setSelectedLayerIdsState(result.groupedLayerIds);
      return result.document;
    });
  }, [commit, selectedLayerIds]);

  const ungroupSelectedLayers = useCallback(() => {
    if (selectedLayerIds.length === 0) {
      return;
    }

    commit((current) => {
      const result = ungroupLayersInDocument(current, selectedLayerIds);
      if (result.ungroupedLayerIds.length > 0) {
        setSelectedLayerIdsState(result.ungroupedLayerIds);
      }
      return result.document;
    });
  }, [commit, selectedLayerIds]);

  const alignSelectedLayers = useCallback(
    (alignment: LayerAlignment) => {
      if (selectedLayerIds.length < 2) {
        return;
      }

      commit((current) =>
        alignLayersInDocument(current, selectedLayerIds, alignment),
      );
    },
    [commit, selectedLayerIds],
  );

  const distributeSelectedLayers = useCallback(
    (distribution: LayerDistribution) => {
      if (selectedLayerIds.length < 3) {
        return;
      }

      commit((current) =>
        distributeLayersInDocument(current, selectedLayerIds, distribution),
      );
    },
    [commit, selectedLayerIds],
  );

  const reorderSelectedLayer = useCallback(
    (direction: "forward" | "backward" | "front" | "back") => {
      if (!selectedLayerId) {
        return;
      }

      commit((current) =>
        reorderLayerInDocument(current, selectedLayerId, direction),
      );
    },
    [commit, selectedLayerId],
  );

  const reorderLayer = useCallback(
    (
      layerId: string,
      direction: "forward" | "backward" | "front" | "back",
    ) => {
      commit((current) => reorderLayerInDocument(current, layerId, direction));
    },
    [commit],
  );

  const undo = useCallback(() => {
    setPast((items) => {
      const previous = items.at(-1);
      if (!previous) {
        return items;
      }
      const activityEvents = document.activityEvents ?? [];
      const restoredPrevious = {
        ...previous,
        activityEvents,
      };

      setFuture((futureItems) => [
        {
          ...document,
          activityEvents,
        },
        ...futureItems,
      ]);
      setDocument(restoredPrevious);
      setSelectedLayerIdsState(getInitialSelection(restoredPrevious));
      return items.slice(0, -1);
    });
  }, [document]);

  const redo = useCallback(() => {
    setFuture((items) => {
      const next = items[0];
      if (!next) {
        return items;
      }
      const activityEvents = document.activityEvents ?? [];
      const restoredNext = {
        ...next,
        activityEvents,
      };

      setPast((pastItems) =>
        [
          ...pastItems,
          {
            ...document,
            activityEvents,
          },
        ].slice(-HISTORY_LIMIT),
      );
      setDocument(restoredNext);
      setSelectedLayerIdsState(getInitialSelection(restoredNext));
      return items.slice(1);
    });
  }, [document]);

  return {
    document,
    activePage,
    pages,
    selectedLayer,
    selectedLayers,
    groups,
    guides,
    comments,
    components,
    selectedLayerId,
    selectedLayerIds,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    setSelectedLayerId,
    setSelectedLayerIds,
    selectAllLayers,
    clearSelection,
    selectAdjacentLayer,
    selectEdgeLayer,
    setDocument,
    remember,
    recordActivity,
    clearActivity,
    addLayer,
    addLayers,
    replaceLayers,
    addComment,
    addGuide,
    updateLayer,
    updateLayerTransient,
    updateLayers,
    updateLayersTransient,
    updateActivePage,
    updateLayoutGridStyles,
    updatePaintStyles,
    updateTextStyles,
    updateEffectStyles,
    updateLayoutPresetStyles,
    updateVariableSystem,
    bindMatchingComponentVariables,
    removeStaleComponentVariableBindings,
    setActivePage,
    updatePage,
    addPage,
    duplicateActivePage,
    deleteActivePage,
    reorderPage,
    updateGuide,
    updateGuideTransient,
    removeGuide,
    updateComment,
    updateCommentTransient,
    updateComments,
    removeComment,
    toggleCommentReaction,
    assignComment,
    clearCommentAssignment,
    addCommentReply,
    updateCommentReply,
    removeCommentReply,
    createComponentFromSelection,
    createComponentVariantFromSelection,
    insertComponentInstance,
    renameComponent,
    renameComponentVariant,
    deleteComponent,
    deleteComponentVariant,
    addComponentPropertyDefinition,
    updateComponentPropertyDefinition,
    deleteComponentPropertyDefinition,
    updateComponentSlot,
    resetComponentInstance,
    detachComponentInstance,
    updateComponentInstanceProperties,
    switchComponentInstanceVariant,
    updateLibraryMetadata,
    publishComponentLibrary,
    subscribeComponentLibrary,
    acceptLibraryComponentUpdate,
    detachLibraryComponent,
    deleteLayers,
    deleteSelectedLayer,
    duplicateLayers,
    duplicateSelectedLayer,
    pasteLayers,
    groupSelectedLayers,
    ungroupSelectedLayers,
    alignSelectedLayers,
    distributeSelectedLayers,
    reorderLayer,
    reorderSelectedLayer,
    undo,
    redo,
  };
}

function getInitialSelection(document: DesignDocument) {
  const firstLayerId = getActivePage(document).layers[0]?.id;
  return firstLayerId ? [firstLayerId] : [];
}
