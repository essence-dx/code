import type {
  DesignComponent,
  DesignDocument,
  DesignLayer,
  DesignLibraryMetadata,
} from "@/features/editor/types";

export const componentLibraryManifestType = "essence.component-library";

export type ComponentLibraryManifest = {
  type: typeof componentLibraryManifestType;
  version: 1;
  library: DesignLibraryMetadata;
  components: DesignComponent[];
  exportedAt: string;
};

export type LocalLibraryStatus = {
  componentCount: number;
  changedCount: number;
  pendingUpdateCount: number;
  detachedCount: number;
};

export function createComponentLibraryManifest(
  document: DesignDocument,
): ComponentLibraryManifest {
  const components = Object.values(document.components ?? {});
  const library = normalizeLibraryMetadata(
    document.libraryMetadata,
    components,
  );

  return {
    type: componentLibraryManifestType,
    version: 1,
    library: {
      ...library,
      componentCount: components.length,
      componentSignatures: getComponentSignatureMap(components),
      updatedAt: new Date().toISOString(),
    },
    components: components.map(stripComponentLibraryState),
    exportedAt: new Date().toISOString(),
  };
}

export function parseComponentLibraryManifest(
  source: string,
): ComponentLibraryManifest {
  const parsed: unknown = JSON.parse(source);

  if (!isComponentLibraryManifest(parsed)) {
    throw new Error("The selected file is not an Essence component library.");
  }

  return parsed;
}

export function normalizeLibraryMetadata(
  metadata: DesignLibraryMetadata | undefined,
  components: DesignComponent[],
): DesignLibraryMetadata {
  const now = new Date().toISOString();

  return {
    id: metadata?.id ?? "local-library",
    name: metadata?.name?.trim() || "Essence Component Library",
    teamName: metadata?.teamName?.trim() || "Personal",
    description: metadata?.description,
    version: metadata?.version ?? 0,
    componentCount: components.length,
    componentSignatures: metadata?.componentSignatures,
    publishedAt: metadata?.publishedAt,
    updatedAt: metadata?.updatedAt ?? now,
  };
}

export function getLocalLibraryStatus(
  document: DesignDocument,
): LocalLibraryStatus {
  const components = Object.values(document.components ?? {});
  const signatures = document.libraryMetadata?.componentSignatures ?? {};

  return {
    componentCount: components.length,
    changedCount: components.filter((component) => {
      const publishedSignature = signatures[component.id];

      return (
        !publishedSignature ||
        publishedSignature !== getComponentLibrarySignature(component)
      );
    }).length,
    pendingUpdateCount: Object.keys(
      document.pendingLibraryComponentUpdates ?? {},
    ).length,
    detachedCount: components.filter(
      (component) => component.librarySource?.status === "detached",
    ).length,
  };
}

export function getComponentSignatureMap(components: DesignComponent[]) {
  return Object.fromEntries(
    components.map((component) => [
      component.id,
      getComponentLibrarySignature(component),
    ]),
  );
}

export function getComponentLibrarySignature(component: DesignComponent) {
  return stableStringify(stripComponentLibraryState(component));
}

export function stripComponentLibraryState(
  component: DesignComponent,
): DesignComponent {
  const { librarySource: _librarySource, ...componentWithoutLibraryState } =
    component;

  return componentWithoutLibraryState;
}

function isComponentLibraryManifest(
  value: unknown,
): value is ComponentLibraryManifest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.type === componentLibraryManifestType &&
    value.version === 1 &&
    isLibraryMetadata(value.library) &&
    Array.isArray(value.components) &&
    value.components.every(isComponentLike) &&
    typeof value.exportedAt === "string"
  );
}

function isLibraryMetadata(value: unknown): value is DesignLibraryMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.teamName === "string" &&
    typeof value.version === "number" &&
    typeof value.componentCount === "number" &&
    typeof value.updatedAt === "string"
  );
}

function isComponentLike(value: unknown): value is DesignComponent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    Array.isArray(value.layers) &&
    value.layers.every(isLayerLike) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isLayerLike(value: unknown): value is DesignLayer {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.name === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
