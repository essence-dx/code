"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileWarning,
  Inbox,
  Link2,
  MonitorSmartphone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  EmailClientQaCheck,
  RenderingQaAccessibilityEvidence,
  RenderingQaFormDiagnostic,
  RenderingQaLinkValidation,
  RenderingQaStatus,
  WebsiteEmailRenderingQaCenter,
  WebsiteViewportQaCheck,
} from "@/features/distribution/website-email-rendering-qa";
import { cn } from "@/lib/utils";

type WebsiteEmailRenderingQaPanelProps = {
  center: WebsiteEmailRenderingQaCenter;
};

const statusLabels: Record<RenderingQaStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  RenderingQaStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WebsiteEmailRenderingQaPanel({
  center,
}: WebsiteEmailRenderingQaPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Website and email rendering QA
            </CardTitle>
            <CardDescription>
              Viewport checks, email-client matrices, link validation, form
              routing, accessibility evidence, and release packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                href={center.releaseReport.dataUrl}
                download={center.releaseReport.fileName}
              >
                <Download className="h-4 w-4" />
                Report
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric
            label="Website checks"
            value={center.totals.websiteViewportChecks}
          />
          <Metric label="Email checks" value={center.totals.emailClientChecks} />
          <Metric label="Links" value={center.totals.linkChecks} />
          <Metric label="Forms" value={center.totals.formDiagnostics} />
          <Metric label="Ready" value={center.totals.readyChecks} />
          <Metric label="Review" value={center.totals.reviewChecks} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Website viewport matrix"
            icon={<MonitorSmartphone className="h-4 w-4 text-muted-foreground" />}
            badge={`${center.websiteViewportMatrix.length} checks`}
          >
            <ScrollArea className="h-[340px]">
              <div className="grid gap-2 pr-3">
                {center.websiteViewportMatrix.length ? (
                  center.websiteViewportMatrix.map((check) => (
                    <ViewportRow key={check.id} check={check} />
                  ))
                ) : (
                  <EmptyLine>No published websites need viewport QA yet.</EmptyLine>
                )}
              </div>
            </ScrollArea>
          </PanelBlock>

          <PanelBlock
            title="Email client matrix"
            icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
            badge={`${center.emailClientMatrix.length} checks`}
          >
            <ScrollArea className="h-[340px]">
              <div className="grid gap-2 pr-3">
                {center.emailClientMatrix.length ? (
                  center.emailClientMatrix.map((check) => (
                    <EmailRow key={check.id} check={check} />
                  ))
                ) : (
                  <EmptyLine>No email projects have QA evidence yet.</EmptyLine>
                )}
              </div>
            </ScrollArea>
          </PanelBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ListBlock
            title="Link validation"
            icon={<Link2 className="h-4 w-4 text-muted-foreground" />}
            items={center.linkValidation}
            emptyState="No links are ready for validation."
            renderItem={(item) => <LinkRow item={item} />}
          />
          <ListBlock
            title="Form routing"
            icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
            items={center.formRoutingDiagnostics}
            emptyState="No website forms need routing checks."
            renderItem={(item) => <FormRow item={item} />}
          />
          <ListBlock
            title="Accessibility evidence"
            icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
            items={center.accessibilityEvidence}
            emptyState="No accessibility evidence is attached yet."
            renderItem={(item) => <AccessibilityRow item={item} />}
          />
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next release QA actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ViewportRow({ check }: { check: WebsiteViewportQaCheck }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ReadinessIcon status={check.status} />
            <h3 className="truncate text-sm font-medium">{check.title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {check.viewport} / {check.width}px
          </p>
        </div>
        <Badge variant={statusVariants[check.status]}>
          {statusLabels[check.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {check.checks.slice(0, 3).map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
      {check.warnings[0] ? (
        <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
          <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{check.warnings[0]}</span>
        </p>
      ) : null}
    </article>
  );
}

function EmailRow({ check }: { check: EmailClientQaCheck }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ReadinessIcon status={check.status} />
            <h3 className="truncate text-sm font-medium">
              {check.projectName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {check.client} / {check.score}/100
          </p>
        </div>
        <Badge variant={statusVariants[check.status]}>
          {check.exportJobId ? "Exported" : statusLabels[check.status]}
        </Badge>
      </div>
      {check.warnings[0] ? (
        <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
          <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{check.warnings[0]}</span>
        </p>
      ) : null}
    </article>
  );
}

function LinkRow({ item }: { item: RenderingQaLinkValidation }) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]}>{item.kind}</Badge>
      </div>
      {item.url ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={item.url.startsWith("download:") ? "#" : item.url}>
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function FormRow({ item }: { item: RenderingQaFormDiagnostic }) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
        </div>
        <Badge variant={statusVariants[item.status]}>
          {item.submissionCount}
        </Badge>
      </div>
      {item.sectionIds.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.sectionIds.slice(0, 3).map((sectionId) => (
            <Badge key={sectionId} variant="outline">
              {sectionId}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccessibilityRow({
  item,
}: {
  item: RenderingQaAccessibilityEvidence;
}) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.projectName}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]}>
          {item.surface} {item.score}
        </Badge>
      </div>
    </div>
  );
}

function ListBlock<T>({
  title,
  icon,
  items,
  emptyState,
  renderItem,
}: {
  title: string;
  icon: ReactNode;
  items: T[];
  emptyState: string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      {items.length ? (
        <ScrollArea className="h-[310px]">
          <div className="divide-y divide-border">
            {items.slice(0, 12).map((item, index) => (
              <div key={index}>{renderItem(item)}</div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">{emptyState}</p>
      )}
    </section>
  );
}

function PanelBlock({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: ReactNode;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function ReadinessIcon({ status }: { status: RenderingQaStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <Sparkles className={className} />;

  return <ShieldAlert className={className} />;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
