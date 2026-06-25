import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";

interface CollaborationBatchIdInput {
  baseUpdatedAt: string | null;
  causalId?: string | null;
  clientId: string;
  clientSequence?: number | null;
  operations: SceneCollaborationOperation[];
  projectId: string;
}

function fallbackHash(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCollaborationClientBatchId(input: CollaborationBatchIdInput) {
  const payload = JSON.stringify({
    baseUpdatedAt: input.baseUpdatedAt,
    clientId: input.clientId,
    operations: input.operations,
    projectId: input.projectId,
  });

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return `client-${toHex(new Uint8Array(digest)).slice(0, 48)}`;
  }

  return `client-${fallbackHash(payload)}`;
}
