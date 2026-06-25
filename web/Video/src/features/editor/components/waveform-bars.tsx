"use client";

import { cn } from "@/lib/utils";

export function WaveformBars({
  peaks,
  className,
  barClassName,
}: {
  peaks?: number[];
  className?: string;
  barClassName?: string;
}) {
  const safePeaks = peaks?.length ? peaks : Array.from({ length: 32 }, (_, index) => 0.22 + ((index * 17) % 9) / 12);

  return (
    <div className={cn("flex h-8 items-center gap-px overflow-hidden", className)}>
      {safePeaks.map((peak, index) => (
        <div
          key={index}
          className={cn("w-1 shrink-0 rounded-full bg-current opacity-80", barClassName)}
          style={{ height: `${Math.max(10, peak * 100)}%` }}
        />
      ))}
    </div>
  );
}
