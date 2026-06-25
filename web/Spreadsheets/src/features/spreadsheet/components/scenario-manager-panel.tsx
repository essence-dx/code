"use client";

import { CheckCircle2, Layers3, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WhatIfScenario } from "@/features/workbooks/types";

function formatCellList(scenario: WhatIfScenario) {
  return scenario.values.map((value) => value.cellKey).join(", ");
}

export function ScenarioManagerPanel({
  disabled,
  scenarios,
  onAddScenario,
  onApplyScenario,
  onDeleteScenario,
}: {
  disabled?: boolean;
  scenarios: WhatIfScenario[];
  onAddScenario: (name: string) => string | null;
  onApplyScenario: (scenarioId: string) => string | null;
  onDeleteScenario: (scenarioId: string) => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function addScenario() {
    const result = onAddScenario(name);

    if (result) {
      setSuccessMessage("");
      setMessage(result);
      return;
    }

    setName("");
    setMessage("");
    setSuccessMessage("Scenario saved from the selected input cells.");
  }

  function applyScenario(scenarioId: string) {
    const result = onApplyScenario(scenarioId);

    if (result) {
      setSuccessMessage("");
      setMessage(result);
      return;
    }

    setMessage("");
    setSuccessMessage("Scenario applied to the worksheet.");
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Scenario manager</h2>
        <Badge variant="secondary" className="font-mono">
          {scenarios.length}
        </Badge>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-3">
        <div className="grid gap-2">
          <label className="block text-xs font-medium">
            Scenario name
            <Input
              value={name}
              disabled={disabled}
              placeholder="Best case"
              className="mt-1 h-8 px-2 text-xs"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addScenario}
          >
            <Layers3 />
            Save selected inputs
          </Button>
        </div>
        {message ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            {message}
          </p>
        ) : null}
        {successMessage ? (
          <p className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-950">
            <CheckCircle2 className="size-3" />
            {successMessage}
          </p>
        ) : null}
        {scenarios.length === 0 ? (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            Select up to 32 input cells, then save their current values as a
            reusable scenario.
          </p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <section
                key={scenario.id}
                className="rounded-md border bg-background/80 p-2"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {scenario.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {formatCellList(scenario)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono">
                    {scenario.values.length}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    disabled={disabled}
                    onClick={() => applyScenario(scenario.id)}
                  >
                    <Play />
                    Apply
                  </Button>
                  <ConfirmDestructiveButton
                    title="Delete this scenario?"
                    description="This removes the saved input set. Worksheet cells are not changed."
                    label={`Delete ${scenario.name} scenario`}
                    size="icon-sm"
                    disabled={disabled}
                    onConfirm={() => onDeleteScenario(scenario.id)}
                  >
                    <Trash2 />
                  </ConfirmDestructiveButton>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
