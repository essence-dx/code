import type { TemplateCatalogItem } from "@/features/templates/template-catalog";

type TemplateCatalogPreviewProps = {
  template: TemplateCatalogItem;
  size?: "card" | "hero";
};

export function TemplateCatalogPreview({
  template,
  size = "card",
}: TemplateCatalogPreviewProps) {
  return (
    <div
      className={[
        "flex flex-col justify-between rounded-none p-4",
        size === "hero" ? "min-h-[420px] p-8" : "aspect-[4/3]",
      ].join(" ")}
      style={{
        background: template.surfaceColor,
        color: template.textColor,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={size === "hero" ? "h-14 w-14 rounded-md" : "h-8 w-8 rounded"}
          style={{ background: template.accentColor }}
        />
        <span className="rounded bg-white/70 px-2 py-1 text-[11px] font-medium text-slate-950">
          {template.width} x {template.height}
        </span>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-normal">
          {template.category}
        </p>
        <p
          className={
            size === "hero"
              ? "max-w-xl text-5xl font-semibold leading-tight"
              : "max-w-[14rem] text-lg font-semibold leading-tight"
          }
        >
          {template.name}
        </p>
        <div
          className={size === "hero" ? "h-2 w-36 rounded-full" : "h-1.5 w-24 rounded-full"}
          style={{ background: template.accentColor }}
        />
      </div>
    </div>
  );
}

export function formatTemplateLabel(format: string) {
  return format
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
