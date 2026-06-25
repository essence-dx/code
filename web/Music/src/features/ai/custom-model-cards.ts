"use client";

const storageKey = "essence-suno:custom-model-cards";
const customModelCardsChangedEvent = "essence-suno:custom-model-cards-changed";
const maxModelCards = 60;

export type CustomModelCardInput = {
  constraints: string;
  description: string;
  modelIntent: string;
  name: string;
  providerModelId: string;
  recommendedUse: string;
  rightsConfirmed: boolean;
  sourceCount: number;
  sourceTitles: string[];
  styleSummary: string;
};

export type CustomModelCard = CustomModelCardInput & {
  createdAt: number;
  id: string;
  updatedAt: number;
};

export type CustomModelAttachment = {
  constraints: string;
  id: string;
  name: string;
  providerModelId: string;
  summary: string;
};

export function listCustomModelCards(): CustomModelCard[] {
  return readCustomModelCards().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveCustomModelCard(
  input: CustomModelCardInput,
  existingId?: string,
) {
  const cards = readCustomModelCards();
  const now = Date.now();
  const existing = existingId
    ? cards.find((card) => card.id === existingId)
    : undefined;
  const card: CustomModelCard = {
    ...normalizeCustomModelCardInput(input),
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? createCustomModelCardId(),
    updatedAt: now,
  };
  const next = [card, ...cards.filter((item) => item.id !== card.id)].slice(
    0,
    maxModelCards,
  );

  writeCustomModelCards(next);
  return card;
}

export function deleteCustomModelCard(id: string) {
  writeCustomModelCards(readCustomModelCards().filter((card) => card.id !== id));
}

export function serializeCustomModelCards() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      cards: listCustomModelCards(),
      type: "custom-model-cards",
      version: 1,
    },
    null,
    2,
  );
}

export function customModelCardSummary(card: CustomModelCard) {
  return [
    card.styleSummary,
    card.providerModelId ? `Provider ID: ${card.providerModelId}` : "",
    `${card.sourceCount} source${card.sourceCount === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" / ");
}

export function customModelCardToPrompt(card: CustomModelCard) {
  return [
    `Custom model card: ${card.name}`,
    card.providerModelId ? `Provider model ID: ${card.providerModelId}` : "",
    card.modelIntent ? `Intent: ${card.modelIntent}` : "",
    card.styleSummary ? `Style summary: ${card.styleSummary}` : "",
    card.constraints ? `Constraints: ${card.constraints}` : "",
    card.recommendedUse ? `Recommended use: ${card.recommendedUse}` : "",
    card.sourceTitles.length
      ? `Source material: ${card.sourceTitles.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function toCustomModelAttachment(
  card: CustomModelCard,
): CustomModelAttachment {
  return {
    constraints: card.constraints,
    id: card.id,
    name: card.name,
    providerModelId: card.providerModelId,
    summary: customModelCardSummary(card),
  };
}

export function subscribeToCustomModelCards(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(customModelCardsChangedEvent, listener);
  return () => window.removeEventListener(customModelCardsChangedEvent, listener);
}

function readCustomModelCards(): CustomModelCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCustomModelCard);
  } catch {
    return [];
  }
}

function writeCustomModelCards(cards: CustomModelCard[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(cards));
  window.dispatchEvent(new Event(customModelCardsChangedEvent));
}

function normalizeCustomModelCardInput(
  input: CustomModelCardInput,
): CustomModelCardInput {
  return {
    constraints: input.constraints.trim(),
    description: input.description.trim(),
    modelIntent: input.modelIntent.trim(),
    name: input.name.trim() || "Untitled model card",
    providerModelId: input.providerModelId.trim(),
    recommendedUse: input.recommendedUse.trim(),
    rightsConfirmed: input.rightsConfirmed,
    sourceCount: Math.max(0, Math.round(input.sourceCount)),
    sourceTitles: input.sourceTitles
      .map((title) => title.trim())
      .filter(Boolean)
      .slice(0, 20),
    styleSummary: input.styleSummary.trim(),
  };
}

function createCustomModelCardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isCustomModelCard(value: unknown): value is CustomModelCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<CustomModelCard>;

  return (
    typeof card.id === "string" &&
    typeof card.name === "string" &&
    typeof card.description === "string" &&
    typeof card.modelIntent === "string" &&
    typeof card.constraints === "string" &&
    typeof card.providerModelId === "string" &&
    typeof card.recommendedUse === "string" &&
    typeof card.rightsConfirmed === "boolean" &&
    typeof card.sourceCount === "number" &&
    Array.isArray(card.sourceTitles) &&
    card.sourceTitles.every((title) => typeof title === "string") &&
    typeof card.styleSummary === "string" &&
    typeof card.createdAt === "number" &&
    typeof card.updatedAt === "number"
  );
}
