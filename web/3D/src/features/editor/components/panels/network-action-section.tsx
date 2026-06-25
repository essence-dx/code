"use client";

import { RadioTower, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "../../store/editor-store";
import type { ApiActionMethod, SceneObject } from "../../types";

const apiMethods: ApiActionMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function NetworkActionSection({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const apiAction = object.interaction?.apiAction;
  const webhookAction = object.interaction?.webhookAction;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={apiAction?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              apiAction:
                checked === true
                  ? {
                      enabled: true,
                      method: apiAction?.method ?? "POST",
                      url: apiAction?.url ?? "",
                      body: apiAction?.body ?? "",
                    }
                  : undefined,
            })
          }
        />
        Run API update
      </Label>

      {apiAction?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-5 gap-2">
            {apiMethods.map((method) => (
              <Button
                key={method}
                className="gap-2"
                size="sm"
                variant={(apiAction.method ?? "POST") === method ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    apiAction: {
                      ...apiAction,
                      enabled: true,
                      method,
                    },
                  })
                }
              >
                <RadioTower className="size-3.5 shrink-0" />
                {method}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`api-action-${object.id}-url`}>URL</Label>
            <Input
              id={`api-action-${object.id}-url`}
              inputMode="url"
              value={apiAction.url ?? ""}
              onChange={(event) =>
                updateInteraction(object.id, {
                  apiAction: {
                    ...apiAction,
                    enabled: true,
                    url: event.target.value,
                  },
                })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`api-action-${object.id}-body`}>Body</Label>
            <Textarea
              id={`api-action-${object.id}-body`}
              className="min-h-24 font-mono text-xs"
              value={apiAction.body ?? ""}
              onChange={(event) =>
                updateInteraction(object.id, {
                  apiAction: {
                    ...apiAction,
                    enabled: true,
                    body: event.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      ) : null}

      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={webhookAction?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              webhookAction:
                checked === true
                  ? {
                      enabled: true,
                      url: webhookAction?.url ?? "",
                      eventName: webhookAction?.eventName ?? "interaction",
                      includeVariables: webhookAction?.includeVariables ?? true,
                    }
                  : undefined,
            })
          }
        />
        Send webhook
      </Label>

      {webhookAction?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="space-y-1">
            <Label htmlFor={`webhook-action-${object.id}-url`}>URL</Label>
            <Input
              id={`webhook-action-${object.id}-url`}
              inputMode="url"
              value={webhookAction.url ?? ""}
              onChange={(event) =>
                updateInteraction(object.id, {
                  webhookAction: {
                    ...webhookAction,
                    enabled: true,
                    url: event.target.value,
                  },
                })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`webhook-action-${object.id}-event`}>Event name</Label>
            <Input
              id={`webhook-action-${object.id}-event`}
              value={webhookAction.eventName ?? ""}
              onChange={(event) =>
                updateInteraction(object.id, {
                  webhookAction: {
                    ...webhookAction,
                    enabled: true,
                    eventName: event.target.value,
                  },
                })
              }
            />
          </div>

          <Label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={webhookAction.includeVariables !== false}
              onCheckedChange={(checked) =>
                updateInteraction(object.id, {
                  webhookAction: {
                    ...webhookAction,
                    enabled: true,
                    includeVariables: checked === true,
                  },
                })
              }
            />
            Include variables
          </Label>

          <div className="flex justify-end">
            <Send className="size-4 text-muted-foreground" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
