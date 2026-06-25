import type {
  WebsiteModel,
  WebsiteNavigationStyle,
  WebsiteSection,
} from "@/features/editor/types";
import {
  createWebsiteNavigationItems,
  type WebsiteNavigationItem,
} from "@/features/website/website-navigation-items";
import { cn } from "@/lib/utils";

export function WebsiteNavigation({
  model,
  style,
}: {
  model: WebsiteModel;
  style: Exclude<WebsiteNavigationStyle, "hidden">;
}) {
  const navigationItems = createWebsiteNavigationItems(model.sections);

  if (!navigationItems.length) return null;

  if (style === "side") {
    return (
      <aside className="hidden lg:block">
        <nav
          aria-label="Website sections"
          className="sticky top-6 rounded-md border border-border bg-background/90 p-3 shadow-sm backdrop-blur"
        >
          <a href="#" className="block truncate text-sm font-semibold">
            {model.title}
          </a>
          <div className="mt-3 grid gap-1">
            {navigationItems.map((item) => (
              <NavigationItem key={item.id} item={item} style={style} />
            ))}
          </div>
        </nav>
      </aside>
    );
  }

  if (style === "pills") {
    return (
      <nav aria-label="Website sections" className="sticky top-3 z-30 px-4">
        <div className="mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
          <a href="#" className="shrink-0 px-3 text-sm font-semibold">
            {model.title}
          </a>
          {navigationItems.map((item) => (
            <NavigationItem key={item.id} item={item} style={style} />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Website sections"
      className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a href="#" className="truncate text-sm font-semibold">
          {model.title}
        </a>
        <div className="flex max-w-[65vw] flex-wrap justify-end gap-2">
          {navigationItems.map((item) => (
            <NavigationItem key={item.id} item={item} style={style} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavigationItem({
  item,
  style,
}: {
  item: WebsiteNavigationItem;
  style: Exclude<WebsiteNavigationStyle, "hidden">;
}) {
  if (item.kind === "section") {
    return (
      <NavigationLink
        section={item.section}
        className={navigationLinkClassName(style)}
      />
    );
  }

  if (style === "side") {
    return (
      <div className="space-y-1 pt-2 first:pt-0">
        <p className="px-2 text-[11px] font-semibold uppercase text-muted-foreground">
          {item.label}
        </p>
        <div className="grid gap-1">
          {item.sections.map((section) => (
            <NavigationLink
              key={section.id}
              section={section}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <details className="group relative shrink-0">
      <summary
        className={cn(
          navigationLinkClassName(style),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        {item.label}
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 grid min-w-44 gap-1 rounded-md border border-border bg-background p-2 shadow-lg">
        {item.sections.map((section) => (
          <NavigationLink
            key={section.id}
            section={section}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        ))}
      </div>
    </details>
  );
}

function NavigationLink({
  section,
  className,
}: {
  section: WebsiteSection;
  className: string;
}) {
  return (
    <a href={`#${section.anchorId}`} className={className}>
      {section.navigationLabel}
    </a>
  );
}

function navigationLinkClassName(
  style: Exclude<WebsiteNavigationStyle, "hidden">,
) {
  if (style === "pills") {
    return "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground";
  }

  if (style === "side") {
    return "rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground";
  }

  return "shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground";
}
