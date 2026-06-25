"use client";

interface CollaborationCausalIdInput {
  clientId: string;
  clientSequence: number;
  projectId: string;
}

const causalSequenceStoragePrefix = "essence-spline-collaboration-causal-sequence";

function getCausalSequenceStorageKey(projectId: string, clientId: string) {
  return `${causalSequenceStoragePrefix}:${projectId}:${clientId}`;
}

function normalizeSequence(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function parseStoredSequence(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  return normalizeSequence(parsed);
}

export function createCollaborationCausalId({ clientId, clientSequence, projectId }: CollaborationCausalIdInput) {
  return `${projectId}:${clientId}:${clientSequence}`;
}

export function reserveNextCollaborationClientSequence(projectId: string, clientId: string) {
  if (typeof window === "undefined") {
    return 1;
  }

  const key = getCausalSequenceStorageKey(projectId, clientId);
  const nextSequence = parseStoredSequence(window.localStorage.getItem(key)) + 1;
  window.localStorage.setItem(key, String(nextSequence));

  return nextSequence;
}

export function synchronizeCollaborationClientSequence(projectId: string, clientId: string, latestSequence: number) {
  const sequence = normalizeSequence(latestSequence);

  if (typeof window === "undefined") {
    return sequence;
  }

  const key = getCausalSequenceStorageKey(projectId, clientId);

  if (sequence === 0) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, String(sequence));
  }

  return sequence;
}
