"use client";

import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBrandGuardrailReport } from "@/features/editor/brand-guardrails";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignDocument,
} from "@/features/editor/types";

type BrandGuardrailsPanelProps = {
  document: DesignDocument;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  onApplyBrandKit: () => void;
};

export function BrandGuardrailsPanel({
  document,
  brandColors,
  brandFonts,
  brandLogos,
  onApplyBrandKit,
}: BrandGuardrailsPanelProps) {
  const report = useMemo(
    () =>
      createBrandGuardrailReport({
        document,
        brandColors,
        brandFonts,
        brandLogos,
      }),
    [brandColors, brandFonts, brandLogos, document],
  );
  const canApplyBrandKit = brandColors.length > 0 || brandFonts.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Brand score</span>
        </div>
        <Badge variant={report.issues.length ? "outline" : "secondary"}>
          {report.score}/100
        </Badge>
      </div>
      {report.issues.length ? (
        <div className="space-y-2">
          {report.issues.slice(0, 4).map((issue) => (
            <div
              key={issue.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{issue.label}</span>
                <Badge
                  variant={issue.tone === "missing" ? "destructive" : "outline"}
                >
                  {issue.tone}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {issue.detail}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
          Active brand colors, fonts, and logo usage are aligned.
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        disabled={!canApplyBrandKit}
        onClick={onApplyBrandKit}
      >
        <ShieldCheck className="h-4 w-4" />
        Apply brand kit
      </Button>
    </div>
  );
}
