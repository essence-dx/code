"use client";

import { Download, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExportProofBundle, ExportProofBundleStatus } from "@/lib/projects/export-proof-bundle";
import { downloadExportProofBundle } from "@/lib/projects/export-proof-bundle-download";

export function ExportProofBundleCard({ bundle }: { bundle: ExportProofBundle }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            Proof Bundle
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={proofBadgeVariant(bundle.status)}>
              {bundle.readyCount} ready / {bundle.reviewCount} review / {bundle.blockedCount} blocked
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => downloadExportProofBundle(bundle)} aria-label="Download proof bundle">
              <Download className="size-4" />
              Export proof
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ProofMeta label="Format" value={bundle.format.toUpperCase()} />
          <ProofMeta label="Preset" value={bundle.preset} />
          <ProofMeta label="Downloads" value={String(bundle.downloadCount)} />
          <ProofMeta label="Generated" value={formatDate(bundle.generatedAt)} />
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {bundle.sections.map((section) => (
            <div key={section.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{section.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{section.summary}</div>
                </div>
                <Badge variant={proofBadgeVariant(section.status)}>{proofStatusLabel(section.status)}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{section.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProofMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function proofBadgeVariant(status: ExportProofBundleStatus) {
  if (status === "blocked") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}

function proofStatusLabel(status: ExportProofBundleStatus) {
  if (status === "blocked") return "Blocked";
  if (status === "review") return "Review";
  return "Ready";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
