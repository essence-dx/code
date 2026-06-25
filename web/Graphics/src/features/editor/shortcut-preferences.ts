import type { EditorTool } from "@/features/editor/types";

export type ToolShortcutPreferences = Record<EditorTool, string>;

export const defaultToolShortcutPreferences: ToolShortcutPreferences = {
  select: "v",
  hand: "h",
  pen: "p",
  pencil: "b",
  cutter: "x",
  measure: "m",
  frame: "f",
  rectangle: "r",
  ellipse: "o",
  text: "t",
  sticky: "n",
  comment: "c",
};

export function normalizeShortcutKey(value: string) {
  return value.trim().slice(0, 1).toLowerCase();
}

export function normalizeToolShortcutPreferences(
  input: unknown,
  fallback: ToolShortcutPreferences = defaultToolShortcutPreferences,
): ToolShortcutPreferences {
  const next = { ...fallback };

  if (!isRecord(input)) {
    return next;
  }

  for (const tool of Object.keys(defaultToolShortcutPreferences) as EditorTool[]) {
    const rawShortcut = input[tool];

    if (typeof rawShortcut !== "string") {
      continue;
    }

    const normalizedShortcut = normalizeShortcutKey(rawShortcut);

    if (normalizedShortcut) {
      next[tool] = normalizedShortcut;
    }
  }

  return next;
}

export function getToolForShortcut(
  shortcuts: ToolShortcutPreferences,
  key: string,
) {
  const normalizedKey = normalizeShortcutKey(key);
  const entry = Object.entries(shortcuts).find(
    ([, shortcut]) => normalizeShortcutKey(shortcut) === normalizedKey,
  );

  return entry?.[0] as EditorTool | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
