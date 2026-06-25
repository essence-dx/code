import {
  cleanWorkbookCellStyleName,
  createManagedCellStyle,
  mergeWorkbookTheme,
  type WorkbookThemeUpdate,
} from "@/features/workbooks/workbook-themes";
import type {
  CellStyle,
  WorkbookDocument,
} from "@/features/workbooks/types";

export function updateWorkbookThemeInDocument(
  document: WorkbookDocument,
  updates: WorkbookThemeUpdate,
) {
  document.theme = mergeWorkbookTheme(document.theme, updates);
}

export function saveWorkbookCellStyleInDocument(
  document: WorkbookDocument,
  name: string,
  style: CellStyle,
) {
  const managedStyle = createManagedCellStyle(name, style);
  const existingStyle = (document.cellStyles ?? []).find(
    (item) => item.name === managedStyle.name && !item.builtIn,
  );

  document.cellStyles ??= [];
  document.cellStyles = [
    ...document.cellStyles.filter(
      (item) => item.name !== managedStyle.name || item.builtIn,
    ),
    existingStyle
      ? {
          ...managedStyle,
          id: existingStyle.id,
          description: existingStyle.description,
          builtIn: existingStyle.builtIn,
        }
      : managedStyle,
  ].slice(-24);

  return existingStyle?.id ?? managedStyle.id;
}

export function deleteWorkbookCellStyleFromDocument(
  document: WorkbookDocument,
  styleId: string,
) {
  document.cellStyles = (document.cellStyles ?? []).filter(
    (style) => style.id !== styleId || style.builtIn,
  );
}

export function updateWorkbookCellStyleInDocument(
  document: WorkbookDocument,
  styleId: string,
  updates: {
    name?: string;
    style?: CellStyle;
  },
) {
  const currentStyles = document.cellStyles ?? [];
  const currentStyle = currentStyles.find((style) => style.id === styleId);

  if (!currentStyle || currentStyle.builtIn) {
    return null;
  }

  const nextName =
    updates.name === undefined
      ? currentStyle.name
      : cleanWorkbookCellStyleName(updates.name);
  const nextStyle = createManagedCellStyle(
    nextName,
    updates.style ?? currentStyle.style,
  );

  document.cellStyles = currentStyles
    .filter((style) => style.id === styleId || style.name !== nextName)
    .map((style) =>
      style.id === styleId
        ? {
            ...nextStyle,
            id: currentStyle.id,
            description: currentStyle.description,
            builtIn: currentStyle.builtIn,
          }
        : style,
    );

  return currentStyle.id;
}
