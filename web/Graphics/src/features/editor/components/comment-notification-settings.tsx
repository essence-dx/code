"use client";

import { useState } from "react";
import { Bell, BellOff, MailCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DesignCommentNotificationDelivery,
  DesignCommentNotificationPreferences,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type CommentNotificationSettingsProps = {
  preferences: DesignCommentNotificationPreferences;
  deliveries: DesignCommentNotificationDelivery[];
  onUpdatePreferences: (
    patch: Partial<
      Pick<
        DesignCommentNotificationPreferences,
        | "enabled"
        | "newComments"
        | "replies"
        | "assignments"
        | "mentions"
        | "reactions"
        | "acknowledgements"
        | "mutedEmails"
      >
    >,
  ) => void;
};

export function CommentNotificationSettings({
  preferences,
  deliveries,
  onUpdatePreferences,
}: CommentNotificationSettingsProps) {
  const [mutedEmailDraft, setMutedEmailDraft] = useState("");
  const deliveryStats = getDeliveryStats(deliveries);
  const recentDeliveries = deliveries.slice(0, 4);

  function addMutedEmail() {
    const email = mutedEmailDraft.trim().toLowerCase();

    if (!isEmail(email)) {
      return;
    }

    onUpdatePreferences({
      mutedEmails: Array.from(new Set([...preferences.mutedEmails, email])),
    });
    setMutedEmailDraft("");
  }

  function removeMutedEmail(email: string) {
    onUpdatePreferences({
      mutedEmails: preferences.mutedEmails.filter((item) => item !== email),
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2 normal-case tracking-normal">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {preferences.enabled ? (
            <Bell className="size-3.5 text-primary" />
          ) : (
            <BellOff className="size-3.5" />
          )}
          <span className="truncate text-xs font-medium text-foreground">
            Comment email notifications
          </span>
        </div>
        <NotificationToggle
          active={preferences.enabled}
          label={preferences.enabled ? "On" : "Off"}
          onClick={() => onUpdatePreferences({ enabled: !preferences.enabled })}
        />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <NotificationToggle
          active={preferences.newComments}
          label="Comments"
          onClick={() =>
            onUpdatePreferences({ newComments: !preferences.newComments })
          }
        />
        <NotificationToggle
          active={preferences.replies}
          label="Replies"
          onClick={() => onUpdatePreferences({ replies: !preferences.replies })}
        />
        <NotificationToggle
          active={preferences.assignments}
          label="Assignments"
          onClick={() =>
            onUpdatePreferences({ assignments: !preferences.assignments })
          }
        />
        <NotificationToggle
          active={preferences.mentions}
          label="Mentions"
          onClick={() =>
            onUpdatePreferences({ mentions: !preferences.mentions })
          }
        />
        <NotificationToggle
          active={preferences.reactions}
          label="Reactions"
          onClick={() =>
            onUpdatePreferences({ reactions: !preferences.reactions })
          }
        />
        <NotificationToggle
          active={preferences.acknowledgements}
          label="Ack"
          onClick={() =>
            onUpdatePreferences({
              acknowledgements: !preferences.acknowledgements,
            })
          }
        />
      </div>
      <div className="flex items-center gap-1">
        <Input
          value={mutedEmailDraft}
          className="h-7 text-xs"
          placeholder="Mute email"
          onChange={(event) => setMutedEmailDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addMutedEmail();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={!isEmail(mutedEmailDraft)}
          onClick={addMutedEmail}
        >
          Mute
        </Button>
      </div>
      {preferences.mutedEmails.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {preferences.mutedEmails.map((email) => (
            <button
              key={email}
              type="button"
              className="inline-flex max-w-full items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              onClick={() => removeMutedEmail(email)}
            >
              <span className="truncate">{email}</span>
              <X className="size-3" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="rounded-sm bg-muted/50 p-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1 text-foreground">
          <MailCheck className="size-3.5" />
          {deliveryStats.sent} sent / {deliveryStats.failed} failed
        </div>
        {recentDeliveries.length > 0 ? (
          <div className="mt-1 space-y-1">
            {recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate">
                  {formatNotificationKind(delivery.kind)} to{" "}
                  {delivery.recipientEmail}
                </span>
                <span
                  className={cn(
                    "shrink-0",
                    delivery.status === "failed" && "text-destructive",
                  )}
                >
                  {delivery.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NotificationToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-6 justify-start rounded-sm px-2 text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function getDeliveryStats(deliveries: DesignCommentNotificationDelivery[]) {
  return deliveries.reduce(
    (stats, delivery) => ({
      sent: stats.sent + (delivery.status === "sent" ? 1 : 0),
      failed: stats.failed + (delivery.status === "failed" ? 1 : 0),
    }),
    { sent: 0, failed: 0 },
  );
}

function formatNotificationKind(
  kind: DesignCommentNotificationDelivery["kind"],
) {
  const labels: Record<DesignCommentNotificationDelivery["kind"], string> = {
    "new-comment": "Comment",
    "new-reply": "Reply",
    assignment: "Assignment",
    mention: "Mention",
    reaction: "Reaction",
    acknowledgement: "Ack",
  };

  return labels[kind];
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
