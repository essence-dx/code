import type { Deck, DeckAsset, PresentationElement } from "./types"
import { formatBytes } from "./deck-performance"

export { formatBytes } from "./deck-performance"

export type DeckAssetHealthIssue = {
  id: string
  label: string
  details: string
  severity: "warning" | "info"
}

export type DeckAssetDuplicateGroup = {
  dataUrl: string
  assetIds: string[]
  sizeBytes: number
}

export type DeckAssetHealthReport = {
  totalAssets: number
  usedAssets: number
  remoteAssets: number
  unusedAssets: DeckAsset[]
  duplicateGroups: DeckAssetDuplicateGroup[]
  missingAssetElementCount: number
  inlineImageElementCount: number
  totalBytes: number
  reclaimableBytes: number
  largestAssets: DeckAsset[]
  issues: DeckAssetHealthIssue[]
}

export type DeckAssetCleanupResult = {
  deck: Deck
  removedAssets: number
  removedBytes: number
  rewiredElements: number
  changed: boolean
}

function imageElements(deck: Deck) {
  return deck.slides.flatMap((slide) =>
    slide.elements
      .filter((element) => element.type === "image")
      .map((element) => ({ slide, element })),
  )
}

function assetDuplicateGroups(assets: DeckAsset[]) {
  const byDataUrl = new Map<string, DeckAsset[]>()

  for (const asset of assets) {
    if (!asset.dataUrl) continue
    byDataUrl.set(asset.dataUrl, [...(byDataUrl.get(asset.dataUrl) ?? []), asset])
  }

  return Array.from(byDataUrl.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      assetIds: group.map((asset) => asset.id),
      dataUrl: group[0]?.dataUrl ?? "",
      sizeBytes: group[0]?.sizeBytes ?? 0,
    }))
}

function usedAssetIds(deck: Deck) {
  return new Set(
    imageElements(deck)
      .map(({ element }) => element.assetId)
      .filter(Boolean),
  )
}

export function analyzeDeckAssets(deck: Deck): DeckAssetHealthReport {
  const assets = deck.assets ?? []
  const assetIds = new Set(assets.map((asset) => asset.id))
  const usedIds = usedAssetIds(deck)
  const unusedAssets = assets.filter((asset) => !usedIds.has(asset.id))
  const duplicateGroups = assetDuplicateGroups(assets)
  const remoteAssets = assets.filter(
    (asset) => asset.storage === "remote" || Boolean(asset.remoteUrl),
  )
  const imageElementList = imageElements(deck)
  const missingAssetElementCount = imageElementList.filter(
    ({ element }) => element.assetId && !assetIds.has(element.assetId),
  ).length
  const inlineImageElementCount = imageElementList.filter(
    ({ element }) => !element.assetId && element.src.startsWith("data:"),
  ).length
  const totalBytes = assets.reduce((total, asset) => total + asset.sizeBytes, 0)
  const duplicateReclaimableBytes = duplicateGroups.reduce(
    (total, group) => total + group.sizeBytes * Math.max(0, group.assetIds.length - 1),
    0,
  )
  const unusedBytes = unusedAssets.reduce(
    (total, asset) => total + asset.sizeBytes,
    0,
  )
  const issues: DeckAssetHealthIssue[] = []

  if (unusedAssets.length) {
    issues.push({
      id: "unused-assets",
      label: "Unused assets",
      details: `${unusedAssets.length} stored images are no longer used by any slide.`,
      severity: "warning",
    })
  }
  if (duplicateGroups.length) {
    issues.push({
      id: "duplicate-assets",
      label: "Duplicate assets",
      details: `${duplicateGroups.length} duplicate image groups can be deduplicated.`,
      severity: "info",
    })
  }
  if (missingAssetElementCount) {
    issues.push({
      id: "missing-assets",
      label: "Missing references",
      details: `${missingAssetElementCount} image objects point at missing asset records.`,
      severity: "warning",
    })
  }
  if (inlineImageElementCount) {
    issues.push({
      id: "inline-images",
      label: "Inline images",
      details: `${inlineImageElementCount} image objects still use inline data URLs.`,
      severity: "info",
    })
  }
  if (remoteAssets.length) {
    issues.push({
      id: "remote-assets",
      label: "Remote asset delivery",
      details: `${remoteAssets.length} large images load through cloud asset URLs instead of the deck payload.`,
      severity: "info",
    })
  }

  return {
    totalAssets: assets.length,
    usedAssets: Array.from(usedIds).filter((id) => assetIds.has(id)).length,
    remoteAssets: remoteAssets.length,
    unusedAssets,
    duplicateGroups,
    missingAssetElementCount,
    inlineImageElementCount,
    totalBytes,
    reclaimableBytes: unusedBytes + duplicateReclaimableBytes,
    largestAssets: [...assets]
      .sort((first, second) => second.sizeBytes - first.sizeBytes)
      .slice(0, 5),
    issues,
  }
}

export function compactDeckAssets(deck: Deck): DeckAssetCleanupResult {
  const assets = deck.assets ?? []
  const canonicalByDataUrl = new Map<string, DeckAsset>()
  const rewriteAssetId = new Map<string, string>()

  for (const asset of assets) {
    if (!asset.dataUrl) {
      canonicalByDataUrl.set(asset.id, asset)
      continue
    }

    const canonical = canonicalByDataUrl.get(asset.dataUrl)

    if (canonical) {
      rewriteAssetId.set(asset.id, canonical.id)
    } else {
      canonicalByDataUrl.set(asset.dataUrl, asset)
    }
  }

  let rewiredElements = 0
  const slides = deck.slides.map((slide) => ({
    ...slide,
    elements: slide.elements.map((element): PresentationElement => {
      if (element.type !== "image") return element
      const canonicalAssetId = rewriteAssetId.get(element.assetId)
      if (!canonicalAssetId) return element

      rewiredElements += 1
      return {
        ...element,
        assetId: canonicalAssetId,
      }
    }),
  }))
  const nextDeck = {
    ...deck,
    slides,
  }
  const usedIds = usedAssetIds(nextDeck)
  const nextAssets = assets.filter((asset) => {
    if (!usedIds.has(asset.id)) return false
    if (!asset.dataUrl) return true

    return canonicalByDataUrl.get(asset.dataUrl)?.id === asset.id
  })
  const removedAssets = assets.length - nextAssets.length
  const removedBytes = assets
    .filter((asset) => !nextAssets.some((item) => item.id === asset.id))
    .reduce((total, asset) => total + asset.sizeBytes, 0)

  return {
    deck: {
      ...nextDeck,
      assets: nextAssets,
    },
    removedAssets,
    removedBytes,
    rewiredElements,
    changed: removedAssets > 0 || rewiredElements > 0,
  }
}
