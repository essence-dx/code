import type { NetworkTrigger, NetworkTriggerEvent } from "../types";

export const DEFAULT_NETWORK_TRIGGER_COOLDOWN_MS = 120;
export const networkTriggerEvents: NetworkTriggerEvent[] = ["apiUpdated", "webhookCalled"];

export const NETWORK_INTERACTION_EVENT_TYPE = "essence-spline:network-interaction";

export interface NetworkInteractionEventDetail {
  event: NetworkTriggerEvent;
  sceneId?: string;
  sceneName?: string;
  trigger?: string;
}

export function resolveNetworkTriggerEvent(trigger: NetworkTrigger | undefined): NetworkTriggerEvent {
  return trigger?.event ?? "apiUpdated";
}

export function resolveNetworkTriggerCooldownMs(trigger: NetworkTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_NETWORK_TRIGGER_COOLDOWN_MS;
}

export function matchesNetworkTrigger(trigger: NetworkTrigger | undefined, event: NetworkTriggerEvent) {
  return trigger?.enabled === true && resolveNetworkTriggerEvent(trigger) === event;
}

export function emitNetworkInteractionEvent(detail: NetworkInteractionEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<NetworkInteractionEventDetail>(NETWORK_INTERACTION_EVENT_TYPE, { detail }));
}
