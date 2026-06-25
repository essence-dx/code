import {
  ClipboardCopy,
  Download,
  FileJson2,
  Globe2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminWorkspaceAccessBudgetReport,
  AdminWorkspaceAccessBudgetStatus,
} from "@/features/admin/admin-workspace-access-budget";
import {
  getAdminWorkspaceAccessBudgetCsv,
  getAdminWorkspaceAccessBudgetJson,
  getAdminWorkspaceAccessBudgetMarkdown,
} from "@/features/admin/admin-workspace-access-budget-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminWorkspaceAccessBudgetPanelProps = {
  report: AdminWorkspaceAccessBudgetReport;
};

export function AdminWorkspaceAccessBudgetPanel({
  report,
}: AdminWorkspaceAccessBudgetPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "workspace-access-budget.json",
      content: getAdminWorkspaceAccessBudgetJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "workspace-access-budget.csv",
      content: getAdminWorkspaceAccessBudgetCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "workspace-access-budget.md",
      content: getAdminWorkspaceAccessBudgetMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminWorkspaceAccessBudgetMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Workspace access budget
          </CardTitle>
          <CardDescription>
            External domains, stale collaborators, elevated access pressure,
            public-link drift, and pending permission requests.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Users" value={report.userCount} />
          <Metric label="Collaborators" value={report.collaboratorCount} />
          <Metric label="Elevated" value={report.elevatedCollaboratorCount} />
          <Metric label="External" value={report.externalDomainCount} />
          <Metric label="Stale" value={report.staleCollaboratorCount} />
          <Metric label="Risky links" value={report.riskyShareCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-3">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2 font-medium">
                <Globe2 className="size-4 text-muted-foreground" />
                Domain budget
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {report.trustedDomains.length > 0 ? (
                  report.trustedDomains.map((domain) => (
                    <Badge key={domain} variant="outline">
                      {domain}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">No trusted domain</Badge>
                )}
              </div>
              <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                <Info
                  label="External domains"
                  value={`${report.externalDomainCount}/${report.thresholds.externalDomainLimit}`}
                />
                <Info
                  label="Stale grants"
                  value={`${report.staleCollaboratorCount} over ${report.thresholds.staleCollaboratorDays}d`}
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2 font-medium">
                <UserCog className="size-4 text-muted-foreground" />
                Role budgets
              </div>
              <div className="mt-3 grid gap-2">
                {report.roleBudgets.map((budget) => (
                  <div
                    key={budget.label}
                    className="rounded-md border border-border bg-background p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{budget.label}</span>
                      <Badge variant={getStatusVariant(budget.status)}>
                        {budget.used}/{budget.limit}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {budget.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {report.rows.slice(0, 8).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Users className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{row.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{row.category}</Badge>
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                      <Badge variant="secondary">{row.owner}</Badge>
                    </div>
                  </div>
                  <Badge variant="outline">{row.count}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
                {row.latestAt ? (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Latest: {formatDate(row.latestAt)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminWorkspaceAccessBudgetStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
