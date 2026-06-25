"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BellRing, Loader2, Mail, MonitorCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  normalizeWorkspaceNotificationDeliveryPreferences,
  summarizeWorkspaceNotificationDeliveryPreferences,
  workspaceNotificationDeliveryTopicCopy,
} from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic } from "@/features/workspaces/types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Notification preference update failed";
    throw new Error(message);
  }

  return payload as T;
}

function updatePreference(
  preferences: WorkspaceNotificationDeliveryPreference[],
  topic: WorkspaceNotificationTopic,
  field: "emailEnabled" | "inAppEnabled",
  value: boolean,
) {
  return normalizeWorkspaceNotificationDeliveryPreferences(preferences).map((preference) => (preference.topic === topic ? { ...preference, [field]: value } : preference));
}

export function WorkspaceNotificationPreferencesPanel({
  initialPreferences,
  workspaceId,
}: {
  initialPreferences: WorkspaceNotificationDeliveryPreference[];
  workspaceId: string;
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(() => normalizeWorkspaceNotificationDeliveryPreferences(initialPreferences));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const summary = useMemo(() => summarizeWorkspaceNotificationDeliveryPreferences(preferences), [preferences]);

  async function handleToggle(topic: WorkspaceNotificationTopic, field: "emailEnabled" | "inAppEnabled", value: boolean) {
    const previousPreferences = preferences;
    const nextPreferences = updatePreference(previousPreferences, topic, field, value);

    setPreferences(nextPreferences);
    setPendingKey(`${topic}:${field}`);

    try {
      const response = await parseJson<{ preferences: WorkspaceNotificationDeliveryPreference[] }>(
        await fetch(`/api/workspaces/${workspaceId}/notification-preferences`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ preferences: nextPreferences }),
        }),
      );

      setPreferences(normalizeWorkspaceNotificationDeliveryPreferences(response.preferences));
      toast.success("Notification preferences saved");
      router.refresh();
    } catch (error) {
      setPreferences(previousPreferences);
      toast.error(error instanceof Error ? error.message : "Notification preference update failed");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4" />
              Notification delivery
            </CardTitle>
            <CardDescription>Choose how workspace notification categories reach this account.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant="secondary">
              {summary.inAppEnabledCount} in-app
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {summary.emailEnabledCount} email
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {workspaceNotificationDeliveryTopicCopy.map((entry) => {
          const preference = preferences.find((item) => item.topic === entry.topic);
          const inAppKey = `${entry.topic}:inAppEnabled`;
          const emailKey = `${entry.topic}:emailEnabled`;
          const inAppId = `${entry.topic}-in-app-delivery`;
          const emailId = `${entry.topic}-email-delivery`;

          return (
            <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]" key={entry.topic}>
              <div className="min-w-0">
                <p className="text-sm font-medium">{entry.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:min-w-[260px]">
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
                  <Label className="flex items-center gap-2" htmlFor={inAppId}>
                    <MonitorCheck className="size-4 text-muted-foreground" />
                    In-app
                  </Label>
                  {pendingKey === inAppKey ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch checked={preference?.inAppEnabled ?? true} id={inAppId} onCheckedChange={(checked) => void handleToggle(entry.topic, "inAppEnabled", checked)} />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
                  <Label className="flex items-center gap-2" htmlFor={emailId}>
                    <Mail className="size-4 text-muted-foreground" />
                    Email
                  </Label>
                  {pendingKey === emailKey ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch checked={preference?.emailEnabled ?? false} id={emailId} onCheckedChange={(checked) => void handleToggle(entry.topic, "emailEnabled", checked)} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
