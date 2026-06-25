import type { CellStyle } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function CellBorders({ borders }: { borders?: CellStyle["borders"] }) {
  if (!borders) {
    return null;
  }

  const color = borders.color ?? "#111827";

  return (
    <>
      {borders.top ? (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {borders.right ? (
        <span
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-px"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {borders.bottom ? (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-px"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {borders.left ? (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-px"
          style={{ backgroundColor: color }}
        />
      ) : null}
    </>
  );
}

export function CellIndicator({
  indicator,
}: {
  indicator?: CellStyle["indicator"];
}) {
  if (!indicator) {
    return null;
  }

  if (indicator.direction === "flat") {
    return (
      <span
        className="pointer-events-none absolute left-1 top-1/2 h-1.5 w-3 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: indicator.color }}
      />
    );
  }

  return (
    <span
      className={cn(
        "pointer-events-none absolute left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-x-[5px] border-x-transparent",
        indicator.direction === "up" ? "border-b-[9px]" : "border-t-[9px]",
      )}
      style={
        indicator.direction === "up"
          ? { borderBottomColor: indicator.color }
          : { borderTopColor: indicator.color }
      }
    />
  );
}
