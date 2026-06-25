"use client";

import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  Palette,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  MultiBrandApprovalGate,
  MultiBrandKit,
  MultiBrandTemplateRule,
  MultiBrandWorkspaceControlCenter,
  MultiBrandWorkspaceStatus,
} from "@/features/governance/multi-brand-workspace";
import { cn } from "@/lib/utils";

type MultiBrandWorkspacePanelProps = {
  center: MultiBrandWorkspaceControlCenter;
};

const statusLabels: Record<MultiBrandWorkspaceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  MultiBrandWorkspaceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function MultiBrandWorkspacePanel({
  center,
}: MultiBrandWorkspacePanelProps) {
  const defaultKit = center.kits[0]?.id ?? "workspace";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Multi-brand workspace
            </CardTitle>
            <CardDescription>
              Brand-kit switching, approval gates, and template visibility.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Metric label="Kits" value={center.totals.kits} />
          <Metric label="Brand assets" value={center.totals.brandAssets} />
          <Metric
            label="Visible templates"
            value={center.totals.visibleTemplates}
          />
          <Metric
            label="Hidden templates"
            value={center.totals.hiddenTemplates}
          />
        </div>

        <Tabs defaultValue={defaultKit} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            {center.kits.map((kit) => (
              <TabsTrigger key={kit.id} value={kit.id}>
                {kit.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {center.kits.map((kit) => (
            <TabsContent key={kit.id} value={kit.id}>
              <BrandKitView kit={kit} />
            </TabsContent>
          ))}
        </Tabs>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Next brand actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BrandKitView({ kit }: { kit: MultiBrandKit }) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{kit.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {kit.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {kit.switchSummary}
            </p>
          </div>
          <Badge variant={statusVariants[kit.status]}>
            {kit.score}/100 {statusLabels[kit.status]}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {kit.colors.slice(0, 8).map((color) => (
            <Badge key={color.id} variant="outline" className="gap-1 pl-1">
              <span
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: color.color }}
              />
              {color.color}
            </Badge>
          ))}
          {kit.fonts.slice(0, 4).map((font) => (
            <Badge key={font.id} variant="outline">
              {font.role}: {font.fontFamily}
            </Badge>
          ))}
          {kit.logos.slice(0, 3).map((logo) => (
            <Badge key={logo.id} variant="outline">
              {logo.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold">Approval gates</h3>
          <div className="mt-3 grid gap-2">
            {kit.approvalGates.map((gate) => (
              <ApprovalGateRow key={gate.id} gate={gate} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold">Template visibility</h3>
          <div className="mt-3 grid gap-2">
            {kit.templateRules.length ? (
              kit.templateRules.slice(0, 8).map((rule) => (
                <TemplateRuleRow key={rule.templateId} rule={rule} />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                No templates are assigned to this kit yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function ApprovalGateRow({ gate }: { gate: MultiBrandApprovalGate }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <ReadinessIcon status={gate.status} />
          <p className="text-sm font-medium">{gate.label}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{gate.detail}</p>
      </div>
      <Badge variant={statusVariants[gate.status]}>{gate.score}/100</Badge>
    </div>
  );
}

function TemplateRuleRow({ rule }: { rule: MultiBrandTemplateRule }) {
  const isVisible = rule.visibility === "visible";
  const isHidden = rule.visibility === "hidden";
  const Icon = isVisible ? Eye : isHidden ? EyeOff : CircleAlert;
  const badgeVariant = isHidden
    ? "destructive"
    : isVisible
      ? "secondary"
      : "outline";

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{rule.templateName}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{rule.reason}</p>
        </div>
        <Badge variant={badgeVariant}>
          {rule.visibility}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{rule.approvalStatus}</Badge>
        <Badge variant="outline">{rule.marketplaceStatus}</Badge>
      </div>
    </div>
  );
}

function ReadinessIcon({ status }: { status: MultiBrandWorkspaceStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

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
