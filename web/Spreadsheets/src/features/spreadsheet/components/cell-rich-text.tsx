import { cellFontFamilyToCss } from "@/features/workbooks/font-families";
import { scaleSize } from "@/features/spreadsheet/components/grid-geometry";
import type { CellRichTextRun } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function CellRichTextRuns({
  runs,
  zoomScale,
}: {
  runs: CellRichTextRun[];
  zoomScale: number;
}) {
  return (
    <>
      {runs.map((run, index) => (
        <span
          key={`${index}:${run.text.slice(0, 16)}`}
          className={cn(
            run.bold && "font-semibold",
            run.italic && "italic",
            run.underline && "underline",
            run.strikethrough && "line-through",
          )}
          style={{
            color: run.foreground,
            fontFamily: cellFontFamilyToCss(run.fontFamily),
            fontSize: run.fontSize
              ? `${scaleSize(run.fontSize, zoomScale)}px`
              : undefined,
          }}
        >
          {run.text}
        </span>
      ))}
    </>
  );
}
