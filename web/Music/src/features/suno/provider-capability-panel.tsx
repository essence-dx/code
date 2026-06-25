"use client";

import {
  CheckCircle2,
  CircleOff,
  Info,
  ListChecks,
  RadioTower,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProviderCapability } from "@/lib/ai/schemas";
import {
  getGenerationContractCapabilities,
  getProviderContractDetails,
} from "@/lib/ai/provider-contracts";
import {
  getProviderSetupItems,
  getProviderSetupBadge,
  getProviderSetupOutcome,
  groupProviderSetupItems,
  getRemainingProviderSetupItemCount,
} from "./provider-setup";

type ProviderCapabilityPanelProps = {
  capabilities: ProviderCapability[];
  loading: boolean;
  onRefresh: () => void;
  refreshDisabled?: boolean;
  refreshDisabledReason?: string;
  score: number;
};

const groupLabels: Record<ProviderCapability["group"], string> = {
  media: "Media",
  music: "Music",
  studio: "Studio",
  voice: "Voice",
  writing: "Writing",
};

export function ProviderCapabilityPanel({
  capabilities,
  loading,
  onRefresh,
  refreshDisabled,
  refreshDisabledReason,
  score,
}: ProviderCapabilityPanelProps) {
  const grouped = groupCapabilities(capabilities);
  const generationContracts = getGenerationContractCapabilities(capabilities);
  const setupItems = getProviderSetupItems(capabilities);
  const setupGroups = groupProviderSetupItems(capabilities);
  const remainingSetupItems = getRemainingProviderSetupItemCount(
    capabilities,
    setupItems.length,
  );
  const setupBadge = getProviderSetupBadge(capabilities);
  const isRefreshDisabled = loading || Boolean(refreshDisabled);

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RadioTower className="size-4 text-emerald-200" />
            Creation capability details
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-400/15 text-emerald-200">
              {score}/100
            </Badge>
            {refreshDisabledReason ? (
              <Badge variant="outline">{refreshDisabledReason}</Badge>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={isRefreshDisabled}
              title={
                refreshDisabledReason || "Refresh creation capability details"
              }
              onClick={onRefresh}
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Configured coverage</span>
            <span>{readyCount(capabilities)}/{capabilities.length}</span>
          </div>
          <Progress value={score} />
        </div>
        {setupItems.length ? (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-start gap-3">
              <ListChecks className="mt-0.5 size-4 shrink-0 text-emerald-200" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">Next provider setup</p>
                  <ProviderSetupSummaryBadge
                    label={setupBadge.label}
                    summary={setupBadge.summary}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Highest-impact locked creation paths. They stay disabled until
                  a real provider is connected.
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {setupGroups.map((group) => (
                <section
                  key={group.id}
                  aria-labelledby={`provider-setup-group-${group.id}`}
                  className="space-y-2"
                >
                  <h3
                    id={`provider-setup-group-${group.id}`}
                    className="text-xs font-medium uppercase tracking-wide text-emerald-100/80"
                  >
                    {group.label}
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.items.map((capability) => (
                      <ProviderSetupItem
                        key={capability.id}
                        capability={capability}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {remainingSetupItems > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {remainingSetupItems} more provider-backed paths are still
                listed below.
              </p>
            ) : null}
          </div>
        ) : capabilities.length ? (
          <ProviderSetupReadyState
            badgeLabel={setupBadge.label}
            summary={setupBadge.summary}
          />
        ) : (
          <ProviderSetupEmptyState
            badgeLabel={setupBadge.label}
            summary={setupBadge.summary}
          />
        )}
        {generationContracts.length ? (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-emerald-200" />
              <div>
                <p className="text-sm font-medium">Generation contract</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These controls are available only when the matching generation
                  path is ready.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {generationContracts.map((capability) => (
                <ContractSummary key={capability.id} capability={capability} />
              ))}
            </div>
          </div>
        ) : null}
        {grouped.map(([group, items]) => (
          <section key={group} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-200">
              <ShieldAlert className="size-4" />
              {groupLabels[group]}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((capability) => (
                <CapabilityCard key={capability.id} capability={capability} />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function ProviderSetupEmptyState({
  badgeLabel,
  summary,
}: {
  badgeLabel: string;
  summary: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start gap-3">
        <ListChecks className="mt-0.5 size-4 shrink-0 text-emerald-200" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Provider setup pending</p>
            <ProviderSetupSummaryBadge
              label={badgeLabel}
              summary={summary}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Creation path details will appear here after the next status check.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderSetupReadyState({
  badgeLabel,
  summary,
}: {
  badgeLabel: string;
  summary: string;
}) {
  return (
    <div className="rounded-md border border-emerald-300/20 bg-emerald-400/10 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-200" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-emerald-100">
              Provider setup ready
            </p>
            <ProviderSetupSummaryBadge
              className="bg-emerald-300/15 text-emerald-100"
              label={badgeLabel}
              summary={summary}
            />
          </div>
          <p className="mt-1 text-sm text-emerald-50/80">
            Priority creation paths are connected and ready for matching
            generation actions.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderSetupSummaryBadge({
  className,
  label,
  summary,
}: {
  className?: string;
  label: string;
  summary: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={["bg-white/5", className].filter(Boolean).join(" ")}
      title={summary}
      aria-label={summary}
    >
      {label}
    </Badge>
  );
}

function ProviderSetupItem({
  capability,
}: {
  capability: ProviderCapability;
}) {
  const outcome = getProviderSetupOutcome(capability);

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{capability.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {outcome}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-amber-400/10 text-amber-100"
          aria-label={`${capability.label} is locked. ${outcome}`}
        >
          locked
        </Badge>
      </div>
      <p className="mt-3 text-xs text-slate-300">
        <span className="sr-only">Status: locked. </span>
        Connect: {capability.requirement}
      </p>
    </div>
  );
}

function CapabilityCard({ capability }: { capability: ProviderCapability }) {
  const ready = capability.state === "ready";

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{capability.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {capability.summary}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={ready ? "bg-emerald-400/15 text-emerald-200" : ""}
        >
          {ready ? (
            <CheckCircle2 className="mr-1 size-3" />
          ) : (
            <CircleOff className="mr-1 size-3" />
          )}
          {ready ? "ready" : "off"}
        </Badge>
      </div>
      <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-slate-200">{capability.requirement}</p>
        <p className="mt-1">
          {ready ? "Connected." : capability.disabledReason}
        </p>
        {getProviderContractDetails(capability.id).length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {getProviderContractDetails(capability.id).map((detail) => (
              <Badge key={detail} variant="secondary" className="bg-white/5">
                {detail}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ContractSummary({
  capability,
}: {
  capability: ProviderCapability;
}) {
  const ready = capability.state === "ready";
  const details = getProviderContractDetails(capability.id);

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{capability.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ready ? "Ready for requests." : capability.disabledReason}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={ready ? "bg-emerald-400/15 text-emerald-200" : ""}
        >
          {ready ? "ready" : "locked"}
        </Badge>
      </div>
      {details.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {details.map((detail) => (
            <Badge key={detail} variant="secondary" className="bg-white/5">
              {detail}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupCapabilities(capabilities: ProviderCapability[]) {
  const groups = new Map<ProviderCapability["group"], ProviderCapability[]>();

  for (const capability of capabilities) {
    groups.set(capability.group, [
      ...(groups.get(capability.group) ?? []),
      capability,
    ]);
  }

  return Array.from(groups.entries());
}

function readyCount(capabilities: ProviderCapability[]) {
  return capabilities.filter((capability) => capability.state === "ready").length;
}
