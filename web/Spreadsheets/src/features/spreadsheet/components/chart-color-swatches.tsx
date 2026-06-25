import { chartColorSwatches } from "@/features/spreadsheet/chart-formatting";

export function ChartColorSwatches({
  disabled,
  label,
  selectedColor,
  onSelectColor,
}: {
  disabled?: boolean;
  label: string;
  selectedColor?: string;
  onSelectColor: (color: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {chartColorSwatches.map((color) => (
          <button
            key={`${label}-${color}`}
            type="button"
            aria-label={`${label} ${color}`}
            disabled={disabled}
            className="size-5 rounded-sm border outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            style={{
              backgroundColor: color,
              boxShadow:
                selectedColor === color
                  ? "0 0 0 2px var(--background), 0 0 0 4px var(--primary)"
                  : undefined,
            }}
            onClick={() => onSelectColor(color)}
          />
        ))}
      </div>
    </div>
  );
}
