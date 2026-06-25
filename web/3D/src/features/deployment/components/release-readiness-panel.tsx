import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Rocket, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ReleaseDeploymentCheck, ReleaseDeploymentCheckStatus, ReleaseDeploymentChecklist } from "../release-deployment-checklist";
import { createReleaseReadinessDashboardSummary, type ReleaseReadinessCategorySummary } from "../release-readiness-dashboard";

function statusVariant(status: ReleaseDeploymentCheckStatus) {
  if (status === "fail") {
    return "destructive";
  }

  return status === "warning" ? "secondary" : "default";
}

function statusIcon(status: ReleaseDeploymentCheckStatus) {
  if (status === "pass") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }

  return status === "warning" ? <AlertTriangle className="size-4 text-amber-500" /> : <AlertTriangle className="size-4 text-destructive" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function CategoryReadiness({ category }: { category: ReleaseReadinessCategorySummary }) {
  const percent = category.totalCount > 0 ? Math.round((category.passCount / category.totalCount) * 100) : 100;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {statusIcon(category.status)}
          <p className="truncate text-sm font-medium">{category.label}</p>
        </div>
        <Badge className="rounded-md" variant={statusVariant(category.status)}>
          {category.passCount}/{category.totalCount}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", category.status === "pass" ? "bg-emerald-500" : category.status === "warning" ? "bg-amber-500" : "bg-destructive")} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {category.failCount} blockers, {category.warningCount} warnings
      </p>
    </div>
  );
}

function IssueCheck({ check }: { check: ReleaseDeploymentCheck }) {
  return (
    <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {statusIcon(check.status)}
          <p className="truncate text-sm font-medium">{check.title}</p>
          <Badge className="rounded-md text-[10px]" variant={statusVariant(check.status)}>
            {check.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{check.message}</p>
      </div>
      <Badge className="h-fit justify-self-start rounded-md md:justify-self-end" variant="outline">
        {check.category}
      </Badge>
    </div>
  );
}

export function ReleaseReadinessPanel({ checklist }: { checklist: ReleaseDeploymentChecklist }) {
  const summary = createReleaseReadinessDashboardSummary(checklist);
  const topIssues = summary.issueChecks.slice(0, 5);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Release readiness
            </CardTitle>
            <CardDescription>Production auth, database, email, and Vercel checks from the saved deployment checklist report.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={statusVariant(summary.status)}>
              {summary.statusLabel}
            </Badge>
            <Badge className="rounded-md" variant={summary.blockerCount > 0 ? "destructive" : "outline"}>
              {summary.blockerCount} blockers
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {summary.warningCount} warnings
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{summary.targetLabel} checklist</p>
                <p className="mt-1 text-3xl font-semibold">{summary.completionPercent}%</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <Rocket className="size-4" />
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", summary.status === "pass" ? "bg-emerald-500" : summary.status === "warning" ? "bg-amber-500" : "bg-destructive")} style={{ width: `${summary.completionPercent}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Checks passed</span>
                <span className="font-medium text-foreground">
                  {summary.passCount}/{summary.totalChecks}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Generated</span>
                <span className="font-medium text-foreground">{formatDate(summary.generatedAt)}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid gap-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">CLI source</p>
              <code className="overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs">{summary.actionCommand}</code>
              <Link className={buttonVariants({ className: "w-fit gap-2", size: "sm", variant: "outline" })} href="/projects/release-operations">
                Release Ops
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {summary.categories.map((category) => (
              <CategoryReadiness category={category} key={category.category} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {topIssues.length > 0 ? (
            topIssues.map((check) => <IssueCheck check={check} key={check.key} />)
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Release deployment checks are clear.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
