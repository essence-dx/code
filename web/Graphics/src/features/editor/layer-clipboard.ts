import type { DesignLayer } from "@/features/editor/types";
import {
  readClipboardText,
  writeClipboardText,
} from "@/features/editor/clipboard-interop";

const LAYER_CLIPBOARD_TYPE = "essence-figma.layers";

type LayerClipboardPayload = {
  type: typeof LAYER_CLIPBOARD_TYPE;
  layers: DesignLayer[];
};

export function cloneLayer(layer: DesignLayer): DesignLayer {
  return { ...layer };
}

export async function writeLayerClipboard(layers: DesignLayer[]) {
  const payload: LayerClipboardPayload = {
    type: LAYER_CLIPBOARD_TYPE,
    layers,
  };

  await writeClipboardText(JSON.stringify(payload));
}

export async function readLayerClipboard() {
  const text = await readClipboardText();

  if (!text) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(text);
    return isLayerClipboardPayload(payload) ? payload.layers : null;
  } catch {
    return null;
  }
}

function isLayerClipboardPayload(
  payload: unknown,
): payload is LayerClipboardPayload {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("type" in payload) ||
    !("layers" in payload)
  ) {
    return false;
  }

  const candidate = payload as Partial<LayerClipboardPayload>;

  return (
    candidate.type === LAYER_CLIPBOARD_TYPE &&
    Array.isArray(candidate.layers) &&
    candidate.layers.every(isDesignLayer)
  );
}

function isDesignLayer(layer: unknown): layer is DesignLayer {
  if (!layer || typeof layer !== "object") {
    return false;
  }

  const candidate = layer as Partial<DesignLayer>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  );
}
