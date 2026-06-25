export type ShortcutModifier = "mod" | "shift" | "alt";

export type SpreadsheetShortcutCommand =
  | "workbook.save"
  | "workbook.previousSheet"
  | "workbook.nextSheet"
  | "history.undo"
  | "history.redo"
  | "clipboard.copy"
  | "selection.selectAll"
  | "selection.selectColumn"
  | "selection.selectRow"
  | "selection.selectSheet"
  | "edit.editCell"
  | "edit.clearSelection"
  | "edit.fillSelection"
  | "edit.fillDown"
  | "edit.fillRight"
  | "edit.flashFill"
  | "edit.autoSum"
  | "edit.insertDate"
  | "edit.insertTime"
  | "format.bold"
  | "format.italic"
  | "format.underline"
  | "format.strikethrough"
  | "format.numberGeneral"
  | "format.numberCurrency"
  | "format.numberPercent"
  | "format.numberDate";

export type SpreadsheetShortcutBinding = {
  key: string;
  modifiers: ShortcutModifier[];
};

export type SpreadsheetShortcutPreference = {
  command: SpreadsheetShortcutCommand;
  binding: SpreadsheetShortcutBinding | null;
  updatedAt: string;
};

export type SpreadsheetShortcutDefinition = {
  command: SpreadsheetShortcutCommand;
  defaultBindings: SpreadsheetShortcutBinding[];
  description: string;
  group:
    | "Workbook"
    | "History"
    | "Clipboard"
    | "Selection"
    | "Editing"
    | "Formatting";
  label: string;
};

export type EffectiveSpreadsheetShortcut = SpreadsheetShortcutDefinition & {
  bindings: SpreadsheetShortcutBinding[];
  customized: boolean;
};

type ShortcutEventLike = {
  altKey?: boolean;
  code?: string;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
};

const modifierOrder: ShortcutModifier[] = ["mod", "shift", "alt"];
const commandSet = new Set<SpreadsheetShortcutCommand>();
const pureModifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

function binding(
  key: string,
  modifiers: ShortcutModifier[] = [],
): SpreadsheetShortcutBinding {
  return {
    key,
    modifiers: [...modifiers].sort(
      (a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b),
    ),
  };
}

export const spreadsheetShortcutDefinitions: SpreadsheetShortcutDefinition[] = [
  {
    command: "workbook.save",
    group: "Workbook",
    label: "Save workbook",
    description: "Save the active workbook.",
    defaultBindings: [binding("s", ["mod"])],
  },
  {
    command: "workbook.previousSheet",
    group: "Workbook",
    label: "Previous worksheet",
    description: "Switch to the previous worksheet tab.",
    defaultBindings: [binding("PageUp", ["mod"])],
  },
  {
    command: "workbook.nextSheet",
    group: "Workbook",
    label: "Next worksheet",
    description: "Switch to the next worksheet tab.",
    defaultBindings: [binding("PageDown", ["mod"])],
  },
  {
    command: "history.undo",
    group: "History",
    label: "Undo",
    description: "Undo the last spreadsheet edit.",
    defaultBindings: [binding("z", ["mod"])],
  },
  {
    command: "history.redo",
    group: "History",
    label: "Redo",
    description: "Redo the last undone spreadsheet edit.",
    defaultBindings: [binding("y", ["mod"]), binding("z", ["mod", "shift"])],
  },
  {
    command: "clipboard.copy",
    group: "Clipboard",
    label: "Copy selection",
    description: "Copy the selected range as spreadsheet data.",
    defaultBindings: [binding("c", ["mod"])],
  },
  {
    command: "selection.selectAll",
    group: "Selection",
    label: "Select all cells",
    description: "Select every cell in the active sheet.",
    defaultBindings: [binding("a", ["mod"])],
  },
  {
    command: "selection.selectColumn",
    group: "Selection",
    label: "Select current columns",
    description: "Select the full columns touched by the current selection.",
    defaultBindings: [binding("Space", ["mod"])],
  },
  {
    command: "selection.selectRow",
    group: "Selection",
    label: "Select current rows",
    description: "Select the full rows touched by the current selection.",
    defaultBindings: [binding("Space", ["shift"])],
  },
  {
    command: "selection.selectSheet",
    group: "Selection",
    label: "Select whole sheet",
    description: "Select every row and column in the active sheet.",
    defaultBindings: [binding("Space", ["mod", "shift"])],
  },
  {
    command: "edit.editCell",
    group: "Editing",
    label: "Edit active cell",
    description: "Start editing the selected cell.",
    defaultBindings: [binding("F2")],
  },
  {
    command: "edit.clearSelection",
    group: "Editing",
    label: "Clear selected cells",
    description: "Clear values from the selected editable range.",
    defaultBindings: [binding("Delete"), binding("Backspace")],
  },
  {
    command: "edit.fillSelection",
    group: "Editing",
    label: "Fill selection from active cell",
    description:
      "Fill the selected range from the active cell, shifting relative formula references.",
    defaultBindings: [binding("Enter", ["mod"])],
  },
  {
    command: "edit.fillDown",
    group: "Editing",
    label: "Fill down",
    description: "Fill the selected range down from the top row.",
    defaultBindings: [binding("d", ["mod"])],
  },
  {
    command: "edit.fillRight",
    group: "Editing",
    label: "Fill right",
    description: "Fill the selected range right from the left column.",
    defaultBindings: [binding("r", ["mod"])],
  },
  {
    command: "edit.flashFill",
    group: "Editing",
    label: "Flash Fill",
    description: "Complete selected blank cells from nearby examples.",
    defaultBindings: [binding("e", ["mod"])],
  },
  {
    command: "edit.autoSum",
    group: "Editing",
    label: "AutoSum",
    description: "Insert a SUM formula for the nearest numeric range.",
    defaultBindings: [binding("=", ["alt"])],
  },
  {
    command: "edit.insertDate",
    group: "Editing",
    label: "Insert current date",
    description: "Write today's date into the selected cell.",
    defaultBindings: [binding(";", ["mod"])],
  },
  {
    command: "edit.insertTime",
    group: "Editing",
    label: "Insert current time",
    description: "Write the current time into the selected cell.",
    defaultBindings: [binding(";", ["mod", "shift"])],
  },
  {
    command: "format.bold",
    group: "Formatting",
    label: "Bold",
    description: "Toggle bold formatting for the selected cells.",
    defaultBindings: [binding("b", ["mod"])],
  },
  {
    command: "format.italic",
    group: "Formatting",
    label: "Italic",
    description: "Toggle italic formatting for the selected cells.",
    defaultBindings: [binding("i", ["mod"])],
  },
  {
    command: "format.underline",
    group: "Formatting",
    label: "Underline",
    description: "Toggle underline formatting for the selected cells.",
    defaultBindings: [binding("u", ["mod"])],
  },
  {
    command: "format.strikethrough",
    group: "Formatting",
    label: "Strikethrough",
    description: "Toggle strikethrough formatting for the selected cells.",
    defaultBindings: [binding("5", ["mod"])],
  },
  {
    command: "format.numberGeneral",
    group: "Formatting",
    label: "General number format",
    description: "Apply the general number format.",
    defaultBindings: [binding("`", ["mod", "shift"])],
  },
  {
    command: "format.numberCurrency",
    group: "Formatting",
    label: "Currency number format",
    description: "Apply the currency number format.",
    defaultBindings: [binding("4", ["mod", "shift"])],
  },
  {
    command: "format.numberPercent",
    group: "Formatting",
    label: "Percent number format",
    description: "Apply the percent number format.",
    defaultBindings: [binding("5", ["mod", "shift"])],
  },
  {
    command: "format.numberDate",
    group: "Formatting",
    label: "Date number format",
    description: "Apply the date number format.",
    defaultBindings: [binding("3", ["mod", "shift"])],
  },
];

spreadsheetShortcutDefinitions.forEach((definition) => {
  commandSet.add(definition.command);
});

export const spreadsheetShortcutGroups = [
  "Workbook",
  "History",
  "Clipboard",
  "Selection",
  "Editing",
  "Formatting",
] as const;

function normalizeKeyFromEvent(event: ShortcutEventLike) {
  if (event.code?.startsWith("Key")) {
    return event.code.slice(3).toLowerCase();
  }

  if (event.code?.startsWith("Digit")) {
    return event.code.slice(5);
  }

  if (event.code === "Semicolon") {
    return ";";
  }

  if (event.code === "Backquote") {
    return "`";
  }

  if (event.code === "Space" || event.key === " ") {
    return "Space";
  }

  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function normalizeShortcutBinding(
  value: unknown,
): SpreadsheetShortcutBinding | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<SpreadsheetShortcutBinding>;
  const key = typeof candidate.key === "string" ? candidate.key.trim() : "";

  if (!key) {
    return null;
  }

  const modifiers = Array.isArray(candidate.modifiers)
    ? candidate.modifiers.filter((modifier): modifier is ShortcutModifier =>
        modifier === "mod" || modifier === "shift" || modifier === "alt",
      )
    : [];

  return binding(key, Array.from(new Set(modifiers)));
}

export function shortcutBindingFromEvent(
  event: ShortcutEventLike,
): SpreadsheetShortcutBinding {
  const modifiers: ShortcutModifier[] = [];

  if (event.ctrlKey || event.metaKey) {
    modifiers.push("mod");
  }

  if (event.shiftKey) {
    modifiers.push("shift");
  }

  if (event.altKey) {
    modifiers.push("alt");
  }

  return binding(normalizeKeyFromEvent(event), modifiers);
}

export function getShortcutSignature(bindingValue: SpreadsheetShortcutBinding) {
  const normalized = binding(bindingValue.key, bindingValue.modifiers);
  return `${normalized.modifiers.join("+")}:${normalized.key}`;
}

export function formatShortcutBinding(bindingValue: SpreadsheetShortcutBinding) {
  const normalized = binding(bindingValue.key, bindingValue.modifiers);
  const modifierLabels = normalized.modifiers.map((modifier) =>
    modifier === "mod"
      ? "Ctrl"
      : modifier.charAt(0).toUpperCase() + modifier.slice(1),
  );
  const keyLabel =
    normalized.key.length === 1 ? normalized.key.toUpperCase() : normalized.key;

  return [...modifierLabels, keyLabel].join("+");
}

export function formatShortcutBindings(
  bindings: SpreadsheetShortcutBinding[],
) {
  return bindings.length > 0
    ? bindings.map(formatShortcutBinding).join(" / ")
    : "Disabled";
}

export function isSafeCustomShortcut(bindingValue: SpreadsheetShortcutBinding) {
  if (pureModifierKeys.has(bindingValue.key)) {
    return false;
  }

  const hasCommandModifier =
    bindingValue.modifiers.includes("mod") ||
    bindingValue.modifiers.includes("alt");
  const isPlainTextKey = bindingValue.key.length === 1;

  return hasCommandModifier || !isPlainTextKey;
}

export function normalizeShortcutPreferences(
  value: unknown,
): SpreadsheetShortcutPreference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const preferences = new Map<
    SpreadsheetShortcutCommand,
    SpreadsheetShortcutPreference
  >();

  value.forEach((item) => {
    if (typeof item !== "object" || item === null) {
      return;
    }

    const candidate = item as Partial<SpreadsheetShortcutPreference>;

    if (!candidate.command || !commandSet.has(candidate.command)) {
      return;
    }

    const bindingValue =
      candidate.binding === null
        ? null
        : normalizeShortcutBinding(candidate.binding);

    if (candidate.binding !== null && !bindingValue) {
      return;
    }

    preferences.set(candidate.command, {
      command: candidate.command,
      binding: bindingValue,
      updatedAt:
        typeof candidate.updatedAt === "string"
          ? candidate.updatedAt.slice(0, 40)
          : new Date().toISOString(),
    });
  });

  return Array.from(preferences.values());
}

export function getEffectiveShortcutDefinitions(
  preferences: SpreadsheetShortcutPreference[],
): EffectiveSpreadsheetShortcut[] {
  const preferenceMap = new Map(
    preferences.map((preference) => [preference.command, preference]),
  );

  return spreadsheetShortcutDefinitions.map((definition) => {
    const preference = preferenceMap.get(definition.command);

    if (preference) {
      return {
        ...definition,
        bindings: preference.binding ? [preference.binding] : [],
        customized: true,
      };
    }

    return {
      ...definition,
      bindings: definition.defaultBindings,
      customized: false,
    };
  });
}

export function getShortcutCommandForEvent(
  event: ShortcutEventLike,
  preferences: SpreadsheetShortcutPreference[],
) {
  const signature = getShortcutSignature(shortcutBindingFromEvent(event));

  return (
    getEffectiveShortcutDefinitions(preferences).find((shortcut) =>
      shortcut.bindings.some(
        (bindingValue) => getShortcutSignature(bindingValue) === signature,
      ),
    )?.command ?? null
  );
}

export function setShortcutPreference(
  preferences: SpreadsheetShortcutPreference[],
  command: SpreadsheetShortcutCommand,
  shortcutBinding: SpreadsheetShortcutBinding | null,
) {
  return [
    ...preferences.filter((preference) => preference.command !== command),
    {
      command,
      binding: shortcutBinding,
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function resetShortcutPreference(
  preferences: SpreadsheetShortcutPreference[],
  command: SpreadsheetShortcutCommand,
) {
  return preferences.filter((preference) => preference.command !== command);
}

export function getShortcutBindingConflict(
  command: SpreadsheetShortcutCommand,
  shortcutBinding: SpreadsheetShortcutBinding,
  preferences: SpreadsheetShortcutPreference[],
) {
  const signature = getShortcutSignature(shortcutBinding);

  return (
    getEffectiveShortcutDefinitions(preferences).find(
      (shortcut) =>
        shortcut.command !== command &&
        shortcut.bindings.some(
          (bindingValue) => getShortcutSignature(bindingValue) === signature,
        ),
    ) ?? null
  );
}
