"use client";

import { useEffect, useState, type CSSProperties } from "react";

import {
  clampTimerDuration,
  formatTimerSeconds,
  getTimerDisplaySeconds,
} from "@/features/editor/timer";
import type { DesignElement, TimerElement } from "@/features/editor/types";

type TimerRendererProps = {
  element: Extract<DesignElement, { type: "timer" }>;
  baseStyle: CSSProperties;
};

export function TimerRenderer({ element, baseStyle }: TimerRendererProps) {
  const [now, setNow] = useState(() => Date.now());
  const displaySeconds = getTimerDisplaySeconds(element, now);
  const displayValue = formatTimerSeconds(displaySeconds, element.showHours);
  const isFinished =
    element.timerMode === "countdown" && displaySeconds <= 0 && element.running;

  useEffect(() => {
    if (!element.running) return undefined;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [element.running, element.startedAt]);

  return (
    <div
      style={{
        ...baseStyle,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: Math.max(8, element.padding * 0.45),
        padding: element.padding,
        borderRadius: element.radius,
        border: `${Math.max(0, element.borderWidth)}px solid ${
          isFinished ? element.accentColor : element.borderColor
        }`,
        background: element.surfaceColor,
        color: element.textColor,
        fontFamily: element.fontFamily,
        overflow: "hidden",
      }}
    >
      {element.showLabel ? (
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: element.accentColor,
            fontSize: Math.max(10, element.fontSize * 0.28),
            fontWeight: 800,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          {element.label ||
            (element.timerMode === "countdown" ? "Countdown" : "Stopwatch")}
        </span>
      ) : null}
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayValue}
      </span>
      <span
        style={{
          width: "100%",
          height: Math.max(4, element.fontSize * 0.08),
          overflow: "hidden",
          borderRadius: 999,
          background: `${element.accentColor}24`,
        }}
      >
        <span
          style={{
            display: "block",
            width: `${getTimerProgress(element, displaySeconds)}%`,
            height: "100%",
            borderRadius: 999,
            background: element.accentColor,
          }}
        />
      </span>
    </div>
  );
}

function getTimerProgress(element: TimerElement, displaySeconds: number) {
  if (element.timerMode === "stopwatch") {
    return Math.min(
      100,
      (displaySeconds / clampTimerDuration(element.durationSeconds)) * 100,
    );
  }

  return Math.min(
    100,
    Math.max(
      0,
      (displaySeconds / clampTimerDuration(element.durationSeconds)) * 100,
    ),
  );
}
