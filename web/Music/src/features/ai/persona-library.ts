"use client";

import type { ReusePromptContext } from "./reuse-prompt";

const storageKey = "essence-suno:persona-library";
const personasChangedEvent = "essence-suno:personas-changed";
const maxPersonas = 80;

export type PersonaInput = {
  energy: string;
  name: string;
  rightsConfirmed: boolean;
  sourceSongId?: string;
  sourceTitle?: string;
  stylePrompt: string;
  vibe: string;
  vocalCharacter: string;
};

export type PersonaProfile = PersonaInput & {
  createdAt: number;
  id: string;
  updatedAt: number;
};

export type PersonaAttachment = {
  id: string;
  name: string;
  rightsConfirmed: boolean;
  summary: string;
};

export function listPersonas(): PersonaProfile[] {
  return readPersonas().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function savePersona(input: PersonaInput, existingId?: string) {
  const personas = readPersonas();
  const now = Date.now();
  const existing = existingId
    ? personas.find((persona) => persona.id === existingId)
    : undefined;
  const persona: PersonaProfile = {
    ...normalizePersonaInput(input),
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? createPersonaId(),
    updatedAt: now,
  };
  const next = [
    persona,
    ...personas.filter((item) => item.id !== persona.id),
  ].slice(0, maxPersonas);

  writePersonas(next);
  return persona;
}

export function deletePersona(id: string) {
  writePersonas(readPersonas().filter((persona) => persona.id !== id));
}

export function serializePersonas() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      type: "persona-library",
      version: 1,
      personas: listPersonas(),
    },
    null,
    2,
  );
}

export function toPersonaAttachment(
  persona: PersonaProfile,
): PersonaAttachment {
  return {
    id: persona.id,
    name: persona.name,
    rightsConfirmed: persona.rightsConfirmed,
    summary: personaSummary(persona),
  };
}

export function personaSummary(persona: PersonaProfile) {
  return [persona.vibe, persona.vocalCharacter, persona.energy]
    .filter(Boolean)
    .join(" / ");
}

export function personaToPrompt(persona: PersonaProfile) {
  return [
    `Persona: ${persona.name}`,
    persona.vibe ? `Vibe: ${persona.vibe}` : "",
    persona.vocalCharacter ? `Vocal character: ${persona.vocalCharacter}` : "",
    persona.energy ? `Energy: ${persona.energy}` : "",
    persona.stylePrompt ? `Style direction: ${persona.stylePrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function createPersonaInputFromReusePrompt(
  prompt: ReusePromptContext,
  rightsConfirmed: boolean,
): PersonaInput {
  return {
    energy: prompt.persona.energy,
    name: prompt.persona.name,
    rightsConfirmed,
    sourceSongId: prompt.sourceSongId,
    sourceTitle: prompt.sourceTitle,
    stylePrompt: prompt.styleIdea,
    vibe: prompt.persona.vibe,
    vocalCharacter: prompt.persona.vocalCharacter,
  };
}

export function subscribeToPersonas(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(personasChangedEvent, listener);
  return () => window.removeEventListener(personasChangedEvent, listener);
}

function readPersonas(): PersonaProfile[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isPersonaProfile);
  } catch {
    return [];
  }
}

function writePersonas(personas: PersonaProfile[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(personas));
  window.dispatchEvent(new Event(personasChangedEvent));
}

function normalizePersonaInput(input: PersonaInput): PersonaInput {
  return {
    energy: input.energy.trim(),
    name: input.name.trim() || "Untitled persona",
    rightsConfirmed: input.rightsConfirmed,
    sourceSongId: input.sourceSongId?.trim() || undefined,
    sourceTitle: input.sourceTitle?.trim() || undefined,
    stylePrompt: input.stylePrompt.trim(),
    vibe: input.vibe.trim(),
    vocalCharacter: input.vocalCharacter.trim(),
  };
}

function createPersonaId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isPersonaProfile(value: unknown): value is PersonaProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const persona = value as Partial<PersonaProfile>;

  return (
    typeof persona.id === "string" &&
    typeof persona.name === "string" &&
    typeof persona.vibe === "string" &&
    typeof persona.vocalCharacter === "string" &&
    typeof persona.energy === "string" &&
    typeof persona.stylePrompt === "string" &&
    typeof persona.rightsConfirmed === "boolean" &&
    typeof persona.createdAt === "number" &&
    typeof persona.updatedAt === "number"
  );
}
