"use client";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  Link2,
  LineChart,
  Shuffle,
  Table2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisToolpakResult } from "@/features/spreadsheet/analysis-toolpak";

export function AnalysisToolpakPanel({
  disabled,
  onCreateCorrelation,
  onCreateDescriptiveStatistics,
  onCreateExponentialSmoothing,
  onCreateForecastSheet,
  onCreateHistogram,
  onCreateMovingAverage,
  onCreateRegression,
  onCreateSampling,
}: {
  disabled?: boolean;
  onCreateCorrelation: () => AnalysisToolpakResult;
  onCreateDescriptiveStatistics: () => AnalysisToolpakResult;
  onCreateExponentialSmoothing: () => AnalysisToolpakResult;
  onCreateForecastSheet: () => AnalysisToolpakResult;
  onCreateHistogram: () => AnalysisToolpakResult;
  onCreateMovingAverage: () => AnalysisToolpakResult;
  onCreateRegression: () => AnalysisToolpakResult;
  onCreateSampling: () => AnalysisToolpakResult;
}) {
  const [result, setResult] = useState<AnalysisToolpakResult | null>(null);

  function createDescriptiveStatistics() {
    setResult(onCreateDescriptiveStatistics());
  }

  function createHistogram() {
    setResult(onCreateHistogram());
  }

  function createCorrelation() {
    setResult(onCreateCorrelation());
  }

  function createRegression() {
    setResult(onCreateRegression());
  }

  function createSampling() {
    setResult(onCreateSampling());
  }

  function createMovingAverage() {
    setResult(onCreateMovingAverage());
  }

  function createExponentialSmoothing() {
    setResult(onCreateExponentialSmoothing());
  }

  function createForecastSheet() {
    setResult(onCreateForecastSheet());
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Analysis ToolPak</h2>
        <Badge variant="secondary">ToolPak</Badge>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-3">
        <div className="grid gap-2">
          <Button
            type="button"
            size="sm"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createDescriptiveStatistics}
          >
            <Table2 />
            Descriptive statistics
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createHistogram}
          >
            <BarChart3 />
            Histogram
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createCorrelation}
          >
            <Link2 />
            Correlation
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createRegression}
          >
            <TrendingUp />
            Regression
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createSampling}
          >
            <Shuffle />
            Sampling
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createMovingAverage}
          >
            <Activity />
            Moving average
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createExponentialSmoothing}
          >
            <Activity />
            Exponential smoothing
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
            onClick={createForecastSheet}
          >
            <LineChart />
            Forecast sheet
          </Button>
        </div>
        {result ? (
          <p
            className={`rounded-md border p-2 text-xs ${
              result.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="mr-2 inline size-3" />
            ) : null}
            {result.message}
          </p>
        ) : (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            Select numeric cells, then write analysis output beside the range.
          </p>
        )}
      </div>
    </section>
  );
}
