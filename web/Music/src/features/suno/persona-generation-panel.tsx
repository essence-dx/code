"use client";

import { Fingerprint, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProviderJobOfflineBadge,
  useProviderJobActionGuard,
} from "./provider-job-action-guard";
import type {
  PersonaGenerationBusyState,
  PersonaGenerationJobView,
} from "@/features/ai/use-persona-generation-job";

type PersonaGenerationPanelProps = {
  busy: PersonaGenerationBusyState;
  job?: PersonaGenerationJobView;
  onRefresh: () => Promise<unknown>;
  onSave: () => Promise<unknown>;
};

export function PersonaGenerationPanel({
  busy,
  job,
  onRefresh,
  onSave,
}: PersonaGenerationPanelProps) {
  const actionGuard = useProviderJobActionGuard();

  if (!job?.id) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="size-4 text-emerald-200" />
            Generated persona
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <ProviderJobOfflineBadge guard={actionGuard} />
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={actionGuard.connectionDisabled || busy === "refresh"}
              title={actionGuard.title("Check status")}
              onClick={() => {
                void onRefresh();
              }}
            >
              <RefreshCw className={busy === "refresh" ? "size-4 animate-spin" : "size-4"} />
              Check status
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={
                actionGuard.connectionDisabled ||
                busy === "save" ||
                !job.persona?.available
              }
              title={actionGuard.title("Save persona")}
              onClick={() => {
                void onSave();
              }}
            >
              <Save className="size-4" />
              Save persona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{job.sourceTitle}</p>
          <p className="text-xs text-muted-foreground">{job.id}</p>
          {job.error ? <p className="mt-1 text-xs text-rose-200">{job.error}</p> : null}
        </div>
        {job.persona?.available ? (
          <div className="grid gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3 md:grid-cols-2">
            <PersonaField label="Name" value={job.persona.name} />
            <PersonaField label="Energy" value={job.persona.energy} />
            <PersonaField label="Vibe" value={job.persona.vibe} />
            <PersonaField
              label="Vocal character"
              value={job.persona.vocalCharacter}
            />
            <div className="md:col-span-2">
              <PersonaField label="Style prompt" value={job.persona.stylePrompt} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the configured persona provider to return real metadata.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PersonaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "Waiting"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "succeeded"
      ? "bg-emerald-400/15 text-emerald-200"
      : status === "failed"
        ? "bg-rose-400/15 text-rose-200"
        : "";

  return (
    <Badge variant="secondary" className={className}>
      {status || "queued"}
    </Badge>
  );
}
