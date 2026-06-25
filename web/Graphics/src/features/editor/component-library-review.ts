import { getComponentPropertyDefinitionSignature } from "@/features/editor/component-properties";
import { getComponentSlotCount } from "@/features/editor/component-slots";
import type { DesignComponent } from "@/features/editor/types";

export type ComponentLibraryUpdateReview = {
  title: string;
  detail: string;
  changes: string[];
};

export function getComponentLibraryUpdateReview(
  currentComponent: DesignComponent | undefined,
  incomingComponent: DesignComponent,
): ComponentLibraryUpdateReview {
  if (!currentComponent) {
    return {
      title: "New component",
      detail: `${incomingComponent.layers.length} layers, ${getComponentSlotCount(
        incomingComponent.layers,
      )} slots`,
      changes: ["New component will be added to the local library."],
    };
  }

  const changes = [
    getDimensionChange(currentComponent, incomingComponent),
    getCountChange(
      "layers",
      currentComponent.layers.length,
      incomingComponent.layers.length,
    ),
    getCountChange(
      "variants",
      currentComponent.variants?.length ?? 0,
      incomingComponent.variants?.length ?? 0,
    ),
    getCountChange(
      "slots",
      getComponentSlotCount(currentComponent.layers),
      getComponentSlotCount(incomingComponent.layers),
    ),
    getPropertyChange(currentComponent, incomingComponent),
  ].filter((change): change is string => Boolean(change));

  return {
    title: changes.length > 0 ? `${changes.length} changes` : "No visible changes",
    detail: `${incomingComponent.layers.length} layers / ${
      incomingComponent.variants?.length ?? 0
    } variants`,
    changes:
      changes.length > 0
        ? changes
        : ["The incoming component matches the local review metrics."],
  };
}

export function formatComponentUpdateReview(
  review: ComponentLibraryUpdateReview,
) {
  return review.changes.join("; ");
}

function getDimensionChange(
  currentComponent: DesignComponent,
  incomingComponent: DesignComponent,
) {
  if (
    currentComponent.width === incomingComponent.width &&
    currentComponent.height === incomingComponent.height
  ) {
    return null;
  }

  return `Size ${currentComponent.width}x${currentComponent.height} -> ${incomingComponent.width}x${incomingComponent.height}`;
}

function getCountChange(label: string, current: number, incoming: number) {
  if (current === incoming) {
    return null;
  }

  return `${label} ${current} -> ${incoming}`;
}

function getPropertyChange(
  currentComponent: DesignComponent,
  incomingComponent: DesignComponent,
) {
  if (
    getComponentPropertyDefinitionSignature(currentComponent) ===
    getComponentPropertyDefinitionSignature(incomingComponent)
  ) {
    return null;
  }

  return "Component properties changed";
}
