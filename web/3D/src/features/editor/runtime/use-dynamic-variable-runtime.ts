"use client";

import { useEffect } from "react";
import type { DynamicVariableRuntime } from "../scene/dynamic-variables";

interface UseDynamicVariableRuntimeOptions {
  enabled: boolean;
  onTick: (runtime: DynamicVariableRuntime) => void;
  runKey: string;
}

export function useDynamicVariableRuntime({ enabled, onTick, runKey }: UseDynamicVariableRuntimeOptions) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const startedAtMs = Date.now();
    let tick = 0;

    const updateVariables = () => {
      tick += 1;
      onTick({
        nowMs: Date.now(),
        startedAtMs,
        tick,
      });
    };

    updateVariables();

    const intervalId = window.setInterval(updateVariables, 250);

    return () => window.clearInterval(intervalId);
  }, [enabled, onTick, runKey]);
}
