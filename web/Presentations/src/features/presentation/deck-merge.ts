import type { Deck, DeckAsset, Slide } from "./types"

type MergeArea = "asset" | "master" | "slide" | "theme" | "title"

export type DeckMergeConflict = {
  area: MergeArea
  id?: string
  reason: string
}

export type DeckMergeResult =
  | {
      status: "merged"
      deck: Deck
      conflicts: []
      mergedAssets: number
      mergedSlides: number
    }
  | {
      status: "conflict"
      deck: null
      conflicts: DeckMergeConflict[]
      mergedAssets: number
      mergedSlides: number
    }

type MergeRecord<T extends { id: string }> = {
  baseItems: T[]
  cloudItems: T[]
  localItems: T[]
  area: MergeArea
  signature: (item: T) => string
}

function stableSignature(value: unknown) {
  return JSON.stringify(value)
}

function slideSignature(slide: Slide) {
  return stableSignature({
    title: slide.title,
    sectionTitle: slide.sectionTitle,
    layout: slide.layout,
    background: slide.background,
    transition: slide.transition,
    transitionDurationMs: slide.transitionDurationMs,
    autoAdvanceAfterMs: slide.autoAdvanceAfterMs,
    rehearsalDurationMs: slide.rehearsalDurationMs,
    notes: slide.notes,
    comments: slide.comments,
    elements: slide.elements,
  })
}

function latestUpdatedAt(localDeck: Deck, cloudDeck: Deck) {
  const localTime = Date.parse(localDeck.updatedAt)
  const cloudTime = Date.parse(cloudDeck.updatedAt)

  if (!Number.isFinite(localTime)) return cloudDeck.updatedAt
  if (!Number.isFinite(cloudTime)) return localDeck.updatedAt

  return localTime >= cloudTime ? localDeck.updatedAt : cloudDeck.updatedAt
}

function mergeValue<T>(
  baseValue: T,
  localValue: T,
  cloudValue: T,
  area: MergeArea,
  conflicts: DeckMergeConflict[],
) {
  const base = stableSignature(baseValue)
  const local = stableSignature(localValue)
  const cloud = stableSignature(cloudValue)
  const localChanged = local !== base
  const cloudChanged = cloud !== base

  if (localChanged && cloudChanged && local !== cloud) {
    conflicts.push({
      area,
      reason: `Both local and cloud changed ${area}.`,
    })
    return localValue
  }

  return cloudChanged ? cloudValue : localValue
}

function mergeRecords<T extends { id: string }>(input: MergeRecord<T>) {
  const baseById = new Map(input.baseItems.map((item) => [item.id, item]))
  const cloudById = new Map(input.cloudItems.map((item) => [item.id, item]))
  const localById = new Map(input.localItems.map((item) => [item.id, item]))
  const conflicts: DeckMergeConflict[] = []
  const mergedItems: T[] = []
  const emittedIds = new Set<string>()
  let mergedCount = 0

  for (const localItem of input.localItems) {
    const baseItem = baseById.get(localItem.id)
    const cloudItem = cloudById.get(localItem.id)

    if (!baseItem) {
      if (cloudItem && input.signature(cloudItem) !== input.signature(localItem)) {
        conflicts.push({
          area: input.area,
          id: localItem.id,
          reason: `Both local and cloud created ${input.area} ${localItem.id} differently.`,
        })
      }
      mergedItems.push(localItem)
      emittedIds.add(localItem.id)
      mergedCount += 1
      continue
    }

    const baseSignature = input.signature(baseItem)
    const localSignature = input.signature(localItem)

    if (!cloudItem) {
      if (localSignature !== baseSignature) {
        conflicts.push({
          area: input.area,
          id: localItem.id,
          reason: `Cloud deleted ${input.area} ${localItem.id} while local changed it.`,
        })
      }
      continue
    }

    const cloudSignature = input.signature(cloudItem)
    const localChanged = localSignature !== baseSignature
    const cloudChanged = cloudSignature !== baseSignature

    if (localChanged && cloudChanged && localSignature !== cloudSignature) {
      conflicts.push({
        area: input.area,
        id: localItem.id,
        reason: `Both local and cloud changed ${input.area} ${localItem.id}.`,
      })
      mergedItems.push(localItem)
      emittedIds.add(localItem.id)
      continue
    }

    mergedItems.push(cloudChanged ? cloudItem : localItem)
    emittedIds.add(localItem.id)
    if (localChanged || cloudChanged) mergedCount += 1
  }

  for (const cloudItem of input.cloudItems) {
    if (emittedIds.has(cloudItem.id)) continue

    const baseItem = baseById.get(cloudItem.id)
    const localItem = localById.get(cloudItem.id)
    if (localItem) continue

    if (!baseItem) {
      mergedItems.push(cloudItem)
      emittedIds.add(cloudItem.id)
      mergedCount += 1
      continue
    }

    const cloudChanged = input.signature(cloudItem) !== input.signature(baseItem)
    if (cloudChanged) {
      conflicts.push({
        area: input.area,
        id: cloudItem.id,
        reason: `Local deleted ${input.area} ${cloudItem.id} while cloud changed it.`,
      })
    }
  }

  return { conflicts, items: mergedItems, mergedCount }
}

export function mergeDeckVersions(input: {
  baseDeck: Deck
  cloudDeck: Deck
  localDeck: Deck
}): DeckMergeResult {
  const conflicts: DeckMergeConflict[] = []
  const title = mergeValue(
    input.baseDeck.title,
    input.localDeck.title,
    input.cloudDeck.title,
    "title",
    conflicts,
  )
  const theme = mergeValue(
    input.baseDeck.theme,
    input.localDeck.theme,
    input.cloudDeck.theme,
    "theme",
    conflicts,
  )
  const master = mergeValue(
    input.baseDeck.master,
    input.localDeck.master,
    input.cloudDeck.master,
    "master",
    conflicts,
  )
  const slides = mergeRecords<Slide>({
    area: "slide",
    baseItems: input.baseDeck.slides,
    cloudItems: input.cloudDeck.slides,
    localItems: input.localDeck.slides,
    signature: slideSignature,
  })
  const assets = mergeRecords<DeckAsset>({
    area: "asset",
    baseItems: input.baseDeck.assets,
    cloudItems: input.cloudDeck.assets,
    localItems: input.localDeck.assets,
    signature: stableSignature,
  })
  const allConflicts = [...conflicts, ...slides.conflicts, ...assets.conflicts]

  if (allConflicts.length) {
    return {
      status: "conflict",
      deck: null,
      conflicts: allConflicts,
      mergedAssets: assets.mergedCount,
      mergedSlides: slides.mergedCount,
    }
  }

  return {
    status: "merged",
    deck: {
      ...input.localDeck,
      title,
      theme,
      master,
      slides: slides.items,
      assets: assets.items,
      updatedAt: latestUpdatedAt(input.localDeck, input.cloudDeck),
    },
    conflicts: [],
    mergedAssets: assets.mergedCount,
    mergedSlides: slides.mergedCount,
  }
}
