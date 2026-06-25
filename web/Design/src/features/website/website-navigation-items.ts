import type { WebsiteSection } from "@/features/editor/types";

export type WebsiteNavigationItem =
  | {
      kind: "section";
      id: string;
      section: WebsiteSection;
    }
  | {
      kind: "group";
      id: string;
      label: string;
      sections: WebsiteSection[];
    };

export function createWebsiteNavigationItems(
  sections: WebsiteSection[],
): WebsiteNavigationItem[] {
  const items: WebsiteNavigationItem[] = [];
  const groupIndexes = new Map<string, number>();

  sections.forEach((section) => {
    if (section.showInNavigation === false) return;

    const groupLabel = normalizeNavigationText(section.navigationGroup, 80);

    if (!groupLabel) {
      items.push({
        kind: "section",
        id: section.id,
        section,
      });
      return;
    }

    const groupKey = groupLabel.toLowerCase();
    const existingIndex = groupIndexes.get(groupKey);

    if (existingIndex !== undefined) {
      const existingItem = items[existingIndex];

      if (existingItem?.kind === "group") {
        existingItem.sections.push(section);
      }

      return;
    }

    groupIndexes.set(groupKey, items.length);
    items.push({
      kind: "group",
      id: `group-${slugify(groupLabel) || "menu"}-${items.length + 1}`,
      label: groupLabel,
      sections: [section],
    });
  });

  return items;
}

function normalizeNavigationText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
