"use client"

import { AlertTriangle, CheckCircle2, Palette, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import {
  masterThemeSafeguardReport,
  type MasterThemeSafeguardIssue,
  type MasterThemeSafeguardSeverity,
} from "../master-theme-safeguards"
import {
  officeThemeVariantRepairReport,
  type OfficeThemeVariantRepairAction,
  type OfficeThemeVariantRepairStatus,
} from "../office-theme-variant-repair"
import type { Deck } from "../types"

type MasterThemeSafeguardPanelProps = {
  deck: Deck
}

function statusLabel(status: MasterThemeSafeguardSeverity) {
  if (status === "attention") return "Review"
  if (status === "warning") return "Warning"
  return "Ready"
}

function statusBadgeVariant(status: MasterThemeSafeguardSeverity) {
  if (status === "attention") return "destructive"
  if (status === "warning") return "secondary"
  return "outline"
}

function IssueIcon({ severity }: { severity: MasterThemeSafeguardSeverity }) {
  if (severity === "attention") return <AlertTriangle className="size-3.5" />
  if (severity === "warning") return <ShieldCheck className="size-3.5" />
  return <CheckCircle2 className="size-3.5" />
}

function IssueRow({ issue }: { issue: MasterThemeSafeguardIssue }) {
  return (
    <div className="grid gap-1 rounded-md border bg-background px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IssueIcon severity={issue.severity} />
          <span className="truncate text-xs font-medium">{issue.label}</span>
        </div>
        <Badge
          variant={statusBadgeVariant(issue.severity)}
          className="shrink-0"
        >
          {issue.count}
        </Badge>
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">
        {issue.detail}
      </p>
      {issue.slideTitles.length ? (
        <p className="truncate text-[11px] text-muted-foreground">
          {issue.slideTitles.join(", ")}
        </p>
      ) : null}
    </div>
  )
}

function variantStatusBadgeVariant(status: OfficeThemeVariantRepairStatus) {
  if (status === "attention") return "destructive"
  if (status === "warning") return "secondary"
  return "outline"
}

function variantActionWeight(status: OfficeThemeVariantRepairStatus) {
  if (status === "attention") return 3
  if (status === "warning") return 2
  return 1
}

function VariantActionRow({ action }: { action: OfficeThemeVariantRepairAction }) {
  return (
    <div className="grid gap-1 rounded-md border bg-background px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium">{action.label}</span>
        <Badge
          variant={variantStatusBadgeVariant(action.status)}
          className="shrink-0"
        >
          {action.status}
        </Badge>
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">
        {action.detail}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">
        {action.target}
      </p>
    </div>
  )
}

export function MasterThemeSafeguardPanel({
  deck,
}: MasterThemeSafeguardPanelProps) {
  const report = masterThemeSafeguardReport(deck)
  const themeVariantReport = officeThemeVariantRepairReport(deck)
  const visibleThemeVariantActions = [...themeVariantReport.actions]
    .sort(
      (left, right) =>
        variantActionWeight(right.status) - variantActionWeight(left.status),
    )
    .slice(0, 3)
  const metrics = report.metrics

  return (
    <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Master safeguards
        </span>
        <Badge variant={statusBadgeVariant(report.status)}>
          {statusLabel(report.status)}
        </Badge>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {report.summary}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Badge variant="outline">{metrics.masterPresetCount} layouts</Badge>
        <Badge variant="outline">{metrics.placeholderCount} placeholders</Badge>
        <Badge variant="outline">{metrics.manualOverrideCount} overrides</Badge>
        <Badge variant="outline">
          {metrics.bulkReapplyRiskSlideCount} risk slides
        </Badge>
        <Badge variant="outline">
          {metrics.officeThemeColorCount} Office colors
        </Badge>
        <Badge variant="outline">
          {metrics.officeThemeSlideLayoutCount} Office layouts
        </Badge>
      </div>
      {report.issues.length ? (
        <div className="grid gap-1.5">
          {report.issues.slice(0, 4).map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground">
          Bulk master reapply is clear for the current deck.
        </div>
      )}
      <div className="grid gap-2 rounded-md border bg-background p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
            <Palette className="size-3.5" />
            <span className="truncate">Theme variant repair</span>
          </span>
          <Badge variant={variantStatusBadgeVariant(themeVariantReport.status)}>
            {themeVariantReport.readyCount}/{themeVariantReport.actions.length}
          </Badge>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {themeVariantReport.summary}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Badge variant="outline">
            {themeVariantReport.metrics.variantCount} variants
          </Badge>
          <Badge variant="outline">
            {themeVariantReport.metrics.themePackageXmlReadyPartCount}/
            {themeVariantReport.metrics.themePackageXmlTotalPartCount} XML
          </Badge>
        </div>
        <div className="grid gap-1.5">
          {visibleThemeVariantActions.map((action) => (
            <VariantActionRow key={action.id} action={action} />
          ))}
        </div>
      </div>
    </div>
  )
}
