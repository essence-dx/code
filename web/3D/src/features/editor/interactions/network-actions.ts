import { interpolateVariables } from "../scene/scene-variables";
import type { ApiAction, ObjectInteraction, SceneVariable, WebhookAction } from "../types";
import { emitNetworkInteractionEvent, type NetworkInteractionEventDetail } from "./network-triggers";

interface NetworkActionContext {
  sceneId?: string;
  sceneName?: string;
  sourceObjectId?: string;
  trigger?: string;
}

function normalizeUrl(value: string | undefined, variables: SceneVariable[]) {
  const url = value ? interpolateVariables(value.trim(), variables) : "";

  return url.length > 0 ? url : null;
}

function hasRequestBody(action: ApiAction) {
  return action.method !== "GET" && action.method !== "DELETE" && action.body?.trim();
}

function createVariablePayload(variables: SceneVariable[]) {
  return Object.fromEntries(variables.map((variable) => [variable.name, variable.value]));
}

async function runApiAction(action: ApiAction | undefined, variables: SceneVariable[]) {
  if (action?.enabled !== true) {
    return null;
  }

  const url = normalizeUrl(action.url, variables);

  if (!url) {
    return null;
  }

  const method = action.method ?? "POST";
  const body = hasRequestBody({ ...action, method }) ? interpolateVariables(action.body ?? "", variables) : undefined;

  await fetch(url, {
    body,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    method,
  });

  return "apiUpdated" as const;
}

async function runWebhookAction(action: WebhookAction | undefined, variables: SceneVariable[], context: NetworkActionContext) {
  if (action?.enabled !== true) {
    return null;
  }

  const url = normalizeUrl(action.url, variables);

  if (!url) {
    return null;
  }

  await fetch(url, {
    body: JSON.stringify({
      eventName: interpolateVariables(action.eventName?.trim() || "interaction", variables),
      sceneId: context.sceneId,
      sceneName: context.sceneName,
      sourceObjectId: context.sourceObjectId,
      trigger: context.trigger,
      timestamp: new Date().toISOString(),
      variables: action.includeVariables === false ? undefined : createVariablePayload(variables),
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  return "webhookCalled" as const;
}

export function runNetworkActions(interaction: ObjectInteraction | undefined | null, variables: SceneVariable[], context: NetworkActionContext = {}) {
  if (!interaction?.apiAction && !interaction?.webhookAction) {
    return;
  }

  void Promise.allSettled([runApiAction(interaction.apiAction, variables), runWebhookAction(interaction.webhookAction, variables, context)]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        console.warn("Interaction network action failed", result.reason);
        continue;
      }

      if (result.value) {
        emitNetworkInteractionEvent({
          event: result.value,
          sceneId: context.sceneId,
          sceneName: context.sceneName,
          trigger: context.trigger,
        } satisfies NetworkInteractionEventDetail);
      }
    }
  });
}
