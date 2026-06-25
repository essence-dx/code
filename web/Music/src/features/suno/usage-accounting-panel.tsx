"use client";

import { BarChart3, Download, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  clearUsageLedger,
  getUsageSummary,
  saveUsageSettings,
  serializeUsageLedger,
  subscribeToUsage,
  type UsageKind,
  type UsageSettings,
  type UsageSummary,
} from "@/features/ai/usage-accounting";

const usageRows: Array<{ kind: UsageKind; label: string }> = [
  { kind: "text", label: "Writing" },
  { kind: "image", label: "Images" },
  { kind: "transcription", label: "Transcription" },
  { kind: "audio", label: "Music" },
];

export function UsageAccountingPanel() {
  const [summary, setSummary] = useState<UsageSummary>(() => getUsageSummary());
  const [settings, setSettings] = useState<UsageSettings>(summary.settings);

  useEffect(() => {
    return subscribeToUsage(() => {
      const nextSummary = getUsageSummary();
      setSummary(nextSummary);
      setSettings(nextSummary.settings);
    });
  }, []);

  function saveSettings() {
    saveUsageSettings(settings);
    toast.success("Usage limits saved.");
  }

  function resetLedger() {
    clearUsageLedger();
    toast.success("Usage ledger cleared.");
  }

  function exportLedger() {
    const blob = new Blob([serializeUsageLedger()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `essence-suno-usage-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-emerald-200" />
          Usage accounting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {usageRows.map((row) => {
            const rowSummary = summary.byKind[row.kind];

            return (
              <div
                key={row.kind}
                className="rounded-md border border-white/10 bg-slate-950/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{row.label}</p>
                  <Badge variant="secondary">{rowSummary.total}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p>Today</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {rowSummary.daily}
                    </p>
                  </div>
                  <div>
                    <p>Month</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {rowSummary.monthly}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="audio-daily-limit">Daily music attempts</Label>
              <Input
                id="audio-daily-limit"
                min={1}
                type="number"
                value={settings.audioDailyLimit}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    audioDailyLimit: parseLimit(
                      event.target.valueAsNumber,
                      current.audioDailyLimit,
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audio-monthly-limit">Monthly music attempts</Label>
              <Input
                id="audio-monthly-limit"
                min={1}
                type="number"
                value={settings.audioMonthlyLimit}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    audioMonthlyLimit: parseLimit(
                      event.target.valueAsNumber,
                      current.audioMonthlyLimit,
                    ),
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3">
              <div>
                <p className="text-sm font-medium">Soft limit</p>
                <p className="text-xs text-muted-foreground">
                  Stop music queueing when local limits are reached.
                </p>
              </div>
              <Switch
                checked={settings.enforceAudioLimit}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    enforceAudioLimit: checked,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button className="gap-2" onClick={saveSettings}>
              <Save className="size-4" />
              Save
            </Button>
            <Button variant="secondary" className="gap-2" onClick={exportLedger}>
              <Download className="size-4" />
              Export
            </Button>
            <Button variant="ghost" className="gap-2" onClick={resetLedger}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
          <p className="text-sm font-medium">Recent requests</p>
          <div className="mt-3 space-y-2">
            {summary.entries.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="grid gap-2 rounded-md bg-black/20 p-2 text-sm md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.kind} / {entry.status} / {entry.units}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {!summary.entries.length ? (
              <p className="text-sm text-muted-foreground">
                Usage appears here as creation actions run.
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function parseLimit(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : fallback;
}
