export type WorkspaceNotificationEvent =
  | "review.updated"
  | "publishing.changed";

export type WorkspaceNotificationHookInput = {
  event: WorkspaceNotificationEvent;
  title: string;
  body: string;
  targetHref?: string | null;
  metadata?: Record<string, unknown>;
};

export type WorkspaceNotificationTarget = {
  id: "slack" | "teams";
  url: string;
};

export function getWorkspaceNotificationTargets(
  env: Record<string, string | undefined> = process.env,
) {
  const targets: WorkspaceNotificationTarget[] = [];

  if (env.SLACK_WEBHOOK_URL) {
    targets.push({ id: "slack", url: env.SLACK_WEBHOOK_URL });
  }

  const teamsUrl = env.MICROSOFT_TEAMS_WEBHOOK_URL ?? env.TEAMS_WEBHOOK_URL;

  if (teamsUrl) {
    targets.push({ id: "teams", url: teamsUrl });
  }

  return targets;
}

export function formatWorkspaceNotificationText(
  input: WorkspaceNotificationHookInput,
) {
  const lines = [`${input.title}`, input.body];

  if (input.targetHref) {
    lines.push(`Open: ${input.targetHref}`);
  }

  return lines.filter(Boolean).join("\n");
}

export async function sendWorkspaceNotificationHooks(
  input: WorkspaceNotificationHookInput,
) {
  const targets = getWorkspaceNotificationTargets();
  const text = formatWorkspaceNotificationText(input);
  const failures: Array<{ target: string; status?: number; error?: string }> =
    [];

  await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await fetch(target.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text,
            event: input.event,
            metadata: input.metadata ?? {},
          }),
        });

        if (!response.ok) {
          failures.push({ target: target.id, status: response.status });
        }
      } catch (error) {
        failures.push({
          target: target.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
  );

  if (failures.length) {
    console.error("Workspace notification hook failures", failures);
  }

  return {
    sent: targets.length - failures.length,
    failed: failures.length,
  };
}
