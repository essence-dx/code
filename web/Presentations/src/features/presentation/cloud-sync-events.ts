import type { CloudDeckSummary } from "./cloud-api"
import type { Deck } from "./types"

export const cloudDeckOpenedEventName =
  "essence-powerpoint:cloud-deck-opened"

export type CloudDeckOpenedEventDetail = {
  access: Pick<CloudDeckSummary, "accessRole" | "ownerName">
  deck: Deck
}

export function dispatchCloudDeckOpened(detail: CloudDeckOpenedEventDetail) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<CloudDeckOpenedEventDetail>(cloudDeckOpenedEventName, {
      detail,
    }),
  )
}

export function isCloudDeckOpenedEvent(
  event: Event,
): event is CustomEvent<CloudDeckOpenedEventDetail> {
  return event.type === cloudDeckOpenedEventName && "detail" in event
}
