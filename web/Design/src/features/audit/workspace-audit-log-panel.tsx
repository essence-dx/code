import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { formatAuditAction } from "@/features/audit/workspace-audit";

export function WorkspaceAuditLogPanel({
  logs,
}: {
  logs: WorkspaceAuditLogSummary[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Workspace audit log
        </CardTitle>
        <CardDescription>
          Recent project, campaign, team, publishing, and security changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <article
                key={log.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {formatAuditAction(log.action)}
                    </Badge>
                    <p className="truncate text-sm font-medium">
                      {log.summary}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.actorEmail ?? "Workspace"} / {log.targetType}
                    {log.targetId ? ` / ${log.targetId}` : ""}
                  </p>
                </div>
                <time
                  dateTime={log.createdAt}
                  className="text-xs text-muted-foreground"
                >
                  {new Date(log.createdAt).toLocaleString()}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No workspace activity has been recorded yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
