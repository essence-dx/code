"use client";

import { brandColorsForTemplate } from "@/lib/editor/brand-kit";
import { createSavedTimelineTemplate, editorTemplates, instantiateSavedTemplate } from "@/lib/editor/templates";
import type { TimelineLayer } from "@/lib/editor/types";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorTemplateSlice = Pick<EditorState, "addTemplate" | "addSavedTemplate" | "saveCurrentTimelineAsTemplate" | "removeSavedTemplate">;

type EditorTemplateDeps = {
  addLayers: (layers: TimelineLayer[]) => void;
  nextTrack: (layers: TimelineLayer[]) => number;
};

export function createEditorTemplateSlice(set: EditorStoreSet, get: EditorStoreGet, deps: EditorTemplateDeps): EditorTemplateSlice {
  return {
    addTemplate: (templateId) => {
      const template = editorTemplates.find((item) => item.id === templateId);
      if (!template) return;

      const layers = template.createLayers(deps.nextTrack(get().project.layers), {
        brandColors: brandColorsForTemplate(get().brandColors, get().project.brandKit),
      });
      deps.addLayers(layers);
    },
    addSavedTemplate: (templateId) => {
      const template = get().savedTemplates.find((item) => item.id === templateId);
      if (!template) return { addedLayerCount: 0, missingAssetCount: 0 };

      const availableAssetIds = new Set(get().mediaAssets.map((asset) => asset.id));
      const result = instantiateSavedTemplate(template, deps.nextTrack(get().project.layers), availableAssetIds);
      deps.addLayers(result.layers);
      return { addedLayerCount: result.layers.length, missingAssetCount: result.missingAssetCount };
    },
    saveCurrentTimelineAsTemplate: (label) => {
      const template = createSavedTimelineTemplate(label ?? `${get().project.title} template`, get().project.layers);
      if (!template) return { saved: false, layerCount: 0 };

      set((state) => ({
        savedTemplates: [template, ...state.savedTemplates.filter((item) => item.id !== template.id)].slice(0, 24),
      }));
      return { saved: true, layerCount: template.layers.length, templateName: template.label };
    },
    removeSavedTemplate: (templateId) =>
      set((state) => ({
        savedTemplates: state.savedTemplates.filter((template) => template.id !== templateId),
      })),
  };
}
