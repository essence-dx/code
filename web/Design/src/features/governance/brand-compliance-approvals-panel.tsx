"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  FolderKanban,
  Gavel,
  Library,
  ShieldAlert,
  ShieldCheck,
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
import type {
  BrandComplianceApprovalCenter,
  BrandComplianceApprovalStatus,
  BrandComplianceCampaignEnforcement,
  BrandComplianceExceptionRequest,
  BrandComplianceLegalReviewPacket,
  BrandComplianceRule,
} from "@/features/governance/brand-compliance-approvals";
import { cn } from "@/lib/utils";

type BrandComplianceApprovalsPanelProps = {
  center: BrandComplianceApprovalCenter;
};

const statusLabels: Record<BrandComplianceApprovalStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  BrandComplianceApprovalStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function BrandComplianceApprovalsPanel({
  center,
}: BrandComplianceApprovalsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Brand compliance approvals
            </CardTitle>
            <CardDescription>
              Exception requests, legal review packets, reusable rule libraries,
              and campaign enforcement from governance evidence.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.auditEvidence.toLocaleString()} audit events
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Rules" value={center.totals.reusableRules} />
          <Metric label="Exceptions" value={center.totals.exceptionRequests} />
          <Metric label="Blocked" value={center.totals.blockedExceptions} />
          <Metric label="Review" value={center.totals.reviewExceptions} />
          <Metric label="Legal" value={center.totals.legalReviewPackets} />
          <Metric
            label="Campaigns"
            value={center.totals.campaignEnforcements}
          />
          <Metric label="Blocked C." value={center.totals.blockedCampaigns} />
          <Metric label="Audit" value={center.totals.auditEvidence} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <PanelBlock
              badge={`${center.ruleLibrary.length} reusable`}
              title="Rule library"
            >
              {center.ruleLibrary.map((rule) => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
            </PanelBlock>

            <PanelBlock
              badge={`${center.campaignEnforcement.length} campaigns`}
              title="Campaign enforcement"
            >
              {center.campaignEnforcement.map((campaign) => (
                <CampaignEnforcementCard
                  campaign={campaign}
                  key={campaign.id}
                />
              ))}
            </PanelBlock>
          </section>

          <section className="space-y-4">
            <PanelBlock
              badge={`${center.exceptionRequests.length} requests`}
              title="Exception requests"
            >
              {center.exceptionRequests.length ? (
                center.exceptionRequests
                  .slice(0, 8)
                  .map((request) => (
                    <ExceptionRequestCard key={request.id} request={request} />
                  ))
              ) : (
                <EmptyState text="No compliance exception requests are open." />
              )}
            </PanelBlock>

            <PanelBlock
              badge={`${center.legalReviewPackets.length} packets`}
              title="Legal review"
            >
              {center.legalReviewPackets.length ? (
                center.legalReviewPackets.map((packet) => (
                  <LegalPacketCard key={packet.id} packet={packet} />
                ))
              ) : (
                <EmptyState text="No legal review packets are required." />
              )}
            </PanelBlock>

            {center.nextActions.length ? (
              <PanelBlock
                badge={`${center.nextActions.length} actions`}
                title="Next actions"
              >
                {center.nextActions.map((action) => (
                  <p
                    className="flex gap-2 text-xs text-muted-foreground"
                    key={action}
                  >
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{action}</span>
                  </p>
                ))}
              </PanelBlock>
            ) : null}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function RuleCard({ rule }: { rule: BrandComplianceRule }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-muted-foreground" />
            <StatusIcon status={rule.status} />
            <p className="truncate text-sm font-semibold">{rule.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {rule.description}
          </p>
        </div>
        <Badge variant={statusVariants[rule.status]}>{rule.score}/100</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{rule.category}</Badge>
        <Badge variant="outline">{rule.sourceIds.length} sources</Badge>
      </div>
      <div className="mt-3 grid gap-1">
        {rule.evidence.slice(0, 3).map((item) => (
          <p className="flex gap-2 text-xs text-muted-foreground" key={item}>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{item}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function CampaignEnforcementCard({
  campaign,
}: {
  campaign: BrandComplianceCampaignEnforcement;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <StatusIcon status={campaign.status} />
            <p className="truncate text-sm font-semibold">
              {campaign.campaignName}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {campaign.enforcementSummary}
          </p>
        </div>
        <Badge variant={statusVariants[campaign.status]}>
          {campaign.score}/100
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric
          compact
          label="Blocked"
          value={campaign.blockedDeliverableIds.length}
        />
        <Metric
          compact
          label="Review"
          value={campaign.reviewDeliverableIds.length}
        />
        <Metric
          compact
          label="Missing"
          value={campaign.missingBrandEvidence.length}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {campaign.missingBrandEvidence.length ? (
          campaign.missingBrandEvidence.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))
        ) : (
          <Badge variant="secondary">Brand evidence present</Badge>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {campaign.nextAction}
      </p>
    </div>
  );
}

function ExceptionRequestCard({
  request,
}: {
  request: BrandComplianceExceptionRequest;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
            <StatusIcon status={request.status} />
            <p className="truncate text-sm font-medium">{request.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.requestReason}
          </p>
        </div>
        <Badge variant={statusVariants[request.status]}>
          {statusLabels[request.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{request.sourceKind}</Badge>
        <Badge variant="outline">{request.approverRole}</Badge>
        <Badge
          variant={request.legalReviewRequired ? "destructive" : "outline"}
        >
          {request.legalReviewRequired ? "Legal" : "No legal"}
        </Badge>
        <Badge variant="outline">{request.auditEvidenceIds.length} audit</Badge>
      </div>
    </div>
  );
}

function LegalPacketCard({
  packet,
}: {
  packet: BrandComplianceLegalReviewPacket;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">Legal review packet</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.exceptionRequestIds.length} exceptions /{" "}
            {packet.auditEvidenceIds.length} audit events.
          </p>
        </div>
        <Badge variant={statusVariants[packet.status]}>
          {statusLabels[packet.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-1">
        {packet.notes.slice(0, 3).map((note) => (
          <p className="flex gap-2 text-xs text-muted-foreground" key={note}>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{note}</span>
          </p>
        ))}
      </div>
      <Button asChild className="mt-3" size="sm" variant="outline">
        <a download={packet.fileName} href={packet.dataUrl}>
          <Download className="h-4 w-4" />
          Packet
        </a>
      </Button>
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: BrandComplianceApprovalStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
