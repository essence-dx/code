import { isElementLocked } from "./element-visibility"
import type { Slide } from "./types"

function idsInOrder(slide: Slide, ids: Set<string>) {
  return slide.elements
    .filter((element) => ids.has(element.id))
    .map((element) => element.id)
}

export function expandSelectionToGroups(slide: Slide, elementIds: string[]) {
  const ids = new Set(elementIds)
  const groupIds = new Set(
    slide.elements
      .filter((element) => ids.has(element.id) && element.groupId)
      .map((element) => element.groupId),
  )

  for (const element of slide.elements) {
    if (element.groupId && groupIds.has(element.groupId)) {
      ids.add(element.id)
    }
  }

  return idsInOrder(slide, ids)
}

export function groupableElementIds(slide: Slide, elementIds: string[]) {
  const ids = new Set(elementIds)

  return slide.elements
    .filter((element) => ids.has(element.id) && !isElementLocked(element))
    .map((element) => element.id)
}

export function hasGroupedElement(slide: Slide, elementIds: string[]) {
  const ids = new Set(elementIds)

  return slide.elements.some((element) => ids.has(element.id) && element.groupId)
}

export function selectedGroupIds(slide: Slide, elementIds: string[]) {
  const ids = new Set(elementIds)

  return new Set(
    slide.elements
      .filter((element) => ids.has(element.id) && element.groupId)
      .map((element) => element.groupId),
  )
}
