import type { PresentationElement, Slide } from "./types"

export function isElementHidden(element: PresentationElement) {
  return element.hidden === true
}

export function isElementLocked(element: PresentationElement) {
  return element.locked === true
}

export function isElementEditable(element: PresentationElement) {
  return !isElementLocked(element)
}

export function visibleElements(slide: Slide) {
  return slide.elements.filter((element) => !isElementHidden(element))
}

export function editableElements(elements: PresentationElement[]) {
  return elements.filter(isElementEditable)
}
