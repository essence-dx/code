"use client";

import { CheckCircle2, CircleAlert, CircleX, RefreshCw, RadioTower } from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReadinessState } from "@/lib/readiness";
import { useAudioProviderHealth } from "@/features/system/use-audio-provider-health";
import { useReadiness } from "@/features/system/use-readiness";

const stateIcon: Record<ReadinessState, ComponentType<{ className?: string }>> = {
  blocked: CircleX,
  ready: CheckCircle2,
  warning: CircleAlert,
};

export function ReadinessPanel() {
  const {
    canRefresh,
    checks,
    loading,
    refresh,
    refreshDisabledReason,
    summary,
  } = useReadiness();
  const { canCheck, checkDisabledReason, checkHealth, health } =
    useAudioProviderHealth();
  const refreshDisabled = loading || !canRefresh;
  const healthCheckDisabled = health.state === "checking" || !canCheck;

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-4 text-emerald-200" />
            Release readiness
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-400/15 text-emerald-200">
              Core {summary.coreScore}/100
            </Badge>
            <Badge variant="secondary">
              Full {summary.fullScore}/100
            </Badge>
            <Badge variant="secondary">
              core ready: {summary.coreReady}/{summary.coreTotal}
            </Badge>
            <Badge variant="secondary">
              upgrades: {summary.enhancementReady}/{summary.enhancementTotal}
            </Badge>
            <Badge variant="secondary">blocked: {summary.blocked}</Badge>
            {!canRefresh ? (
              <Badge variant="outline">{refreshDisabledReason}</Badge>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={refreshDisabled}
              title={
                canRefresh ? "Refresh release readiness" : refreshDisabledReason
              }
              onClick={() => {
                void refresh();
              }}
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {checks.map((check) => {
          const Icon = stateIcon[check.state];
          return (
            <div
              key={check.id}
              className="rounded-md border border-white/10 bg-slate-950/50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={iconClassName(check.state)} />
                  <p className="font-medium">{check.label}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{tierLabel(check.tier)}</Badge>
                  <Badge variant="secondary" className={badgeClassName(check.state)}>
                    {check.state}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
              {check.id === "audio-provider-health" ? (
                <div className="mt-3 flex flex-col gap-2 rounded-md border border-white/10 bg-slate-950/60 p-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-200">
                      <RadioTower className="size-3.5 text-emerald-200" />
                      Live endpoint
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{health.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {health.status ? (
                      <Badge variant="secondary" className={healthBadgeClassName(health.state)}>
                        {health.status}
                      </Badge>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={healthCheckDisabled}
                      title={
                        canCheck ? "Check live endpoint" : checkDisabledReason
                      }
                      onClick={() => {
                        void checkHealth();
                      }}
                    >
                      <RefreshCw
                        className={
                          health.state === "checking" ? "size-4 animate-spin" : "size-4"
                        }
                      />
                      Check
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function tierLabel(tier: string) {
  return tier === "core" ? "core" : "upgrade";
}

function iconClassName(state: ReadinessState) {
  if (state === "ready") {
    return "size-4 text-emerald-200";
  }

  if (state === "blocked") {
    return "size-4 text-rose-200";
  }

  return "size-4 text-amber-200";
}

function badgeClassName(state: ReadinessState) {
  if (state === "ready") {
    return "bg-emerald-400/15 text-emerald-200";
  }

  if (state === "blocked") {
    return "bg-rose-400/15 text-rose-200";
  }

  return "bg-amber-400/15 text-amber-100";
}

function healthBadgeClassName(state: string) {
  if (state === "ready") {
    return "bg-emerald-400/15 text-emerald-200";
  }

  if (state === "blocked") {
    return "bg-rose-400/15 text-rose-200";
  }

  return "bg-amber-400/15 text-amber-100";
}
