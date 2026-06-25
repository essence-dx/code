import type { SheetData } from "@/features/workbooks/types";

export const MAX_WORKBOOK_WINDOW_VIEWS = 4;
export const PRIMARY_WORKBOOK_WINDOW_ID = "workbook-window-main";

export type WorkbookWindowView = {
  id: string;
  sheetId: string;
};

export type WorkbookWindowState = {
  activeWindowId: string;
  views: WorkbookWindowView[];
};

export type WorkbookWindowViewModel = WorkbookWindowView & {
  isActive: boolean;
  sheetName: string;
};

type WorkbookWindowInput = WorkbookWindowState & {
  sheets: Pick<SheetData, "id" | "name">[];
};

type WorkbookWindowSheetInput = WorkbookWindowInput & {
  sheetId: string;
};

type WorkbookWindowTargetInput = WorkbookWindowInput & {
  windowId: string;
};

type WorkbookWindowTargetSheetInput = WorkbookWindowTargetInput & {
  sheetId: string;
};

export function createInitialWorkbookWindowState(
  sheets: Pick<SheetData, "id" | "name">[],
  activeSheetId: string,
): WorkbookWindowState {
  const sheetId = getValidSheetId(sheets, activeSheetId);

  return {
    activeWindowId: PRIMARY_WORKBOOK_WINDOW_ID,
    views: [{ id: PRIMARY_WORKBOOK_WINDOW_ID, sheetId }],
  };
}

export function normalizeWorkbookWindowState({
  activeWindowId,
  sheets,
  views,
}: WorkbookWindowInput): WorkbookWindowState {
  const fallbackSheetId = getValidSheetId(sheets, views[0]?.sheetId);
  const seenIds = new Set<string>();
  const seenSheetIds = new Set<string>();
  const normalizedViews: WorkbookWindowView[] = [];

  for (const view of views) {
    if (
      normalizedViews.length >= MAX_WORKBOOK_WINDOW_VIEWS ||
      seenIds.has(view.id) ||
      seenSheetIds.has(view.sheetId) ||
      !isValidSheetId(sheets, view.sheetId)
    ) {
      continue;
    }

    normalizedViews.push(view);
    seenIds.add(view.id);
    seenSheetIds.add(view.sheetId);
  }

  if (normalizedViews.length === 0) {
    normalizedViews.push({
      id: PRIMARY_WORKBOOK_WINDOW_ID,
      sheetId: fallbackSheetId,
    });
  }

  const nextActiveWindowId = normalizedViews.some(
    (view) => view.id === activeWindowId,
  )
    ? activeWindowId
    : normalizedViews[0]?.id ?? PRIMARY_WORKBOOK_WINDOW_ID;

  return {
    activeWindowId: nextActiveWindowId,
    views: normalizedViews,
  };
}

export function openWorkbookWindow({
  activeWindowId,
  sheetId,
  sheets,
  views,
}: WorkbookWindowSheetInput): WorkbookWindowState {
  const normalized = normalizeWorkbookWindowState({
    activeWindowId,
    sheets,
    views,
  });

  if (!isValidSheetId(sheets, sheetId)) {
    return normalized;
  }

  const existingView = normalized.views.find((view) => view.sheetId === sheetId);

  if (existingView) {
    return {
      ...normalized,
      activeWindowId: existingView.id,
    };
  }

  if (normalized.views.length >= MAX_WORKBOOK_WINDOW_VIEWS) {
    return normalized;
  }

  const nextView = {
    id: createWorkbookWindowId(sheetId, normalized.views),
    sheetId,
  };

  return {
    activeWindowId: nextView.id,
    views: [...normalized.views, nextView],
  };
}

export function closeWorkbookWindow({
  activeWindowId,
  sheets,
  views,
  windowId,
}: WorkbookWindowTargetInput): WorkbookWindowState {
  const normalized = normalizeWorkbookWindowState({
    activeWindowId,
    sheets,
    views,
  });

  if (normalized.views.length <= 1) {
    return normalized;
  }

  const nextViews = normalized.views.filter((view) => view.id !== windowId);

  return normalizeWorkbookWindowState({
    activeWindowId:
      normalized.activeWindowId === windowId
        ? (nextViews[0]?.id ?? PRIMARY_WORKBOOK_WINDOW_ID)
        : normalized.activeWindowId,
    sheets,
    views: nextViews,
  });
}

export function activateWorkbookWindow({
  activeWindowId,
  sheets,
  views,
  windowId,
}: WorkbookWindowTargetInput): WorkbookWindowState {
  const normalized = normalizeWorkbookWindowState({
    activeWindowId,
    sheets,
    views,
  });

  return normalized.views.some((view) => view.id === windowId)
    ? { ...normalized, activeWindowId: windowId }
    : normalized;
}

export function setWorkbookWindowSheet({
  activeWindowId,
  sheetId,
  sheets,
  views,
  windowId,
}: WorkbookWindowTargetSheetInput): WorkbookWindowState {
  const normalized = normalizeWorkbookWindowState({
    activeWindowId,
    sheets,
    views,
  });

  if (!isValidSheetId(sheets, sheetId)) {
    return normalized;
  }

  const duplicateView = normalized.views.find(
    (view) => view.id !== windowId && view.sheetId === sheetId,
  );

  if (duplicateView) {
    return {
      ...normalized,
      activeWindowId: duplicateView.id,
    };
  }

  return normalizeWorkbookWindowState({
    activeWindowId: windowId,
    sheets,
    views: normalized.views.map((view) =>
      view.id === windowId ? { ...view, sheetId } : view,
    ),
  });
}

export function createWorkbookWindowViewModels({
  activeWindowId,
  sheets,
  views,
}: WorkbookWindowInput): WorkbookWindowViewModel[] {
  const sheetNamesById = new Map(sheets.map((sheet) => [sheet.id, sheet.name]));
  const normalized = normalizeWorkbookWindowState({
    activeWindowId,
    sheets,
    views,
  });

  return normalized.views.map((view) => ({
    ...view,
    isActive: view.id === normalized.activeWindowId,
    sheetName: sheetNamesById.get(view.sheetId) ?? "Sheet",
  }));
}

export function areWorkbookWindowStatesEqual(
  left: WorkbookWindowState,
  right: WorkbookWindowState,
) {
  return (
    left.activeWindowId === right.activeWindowId &&
    left.views.length === right.views.length &&
    left.views.every((view, index) => {
      const nextView = right.views[index];

      return nextView?.id === view.id && nextView.sheetId === view.sheetId;
    })
  );
}

function getValidSheetId(
  sheets: Pick<SheetData, "id" | "name">[],
  preferredSheetId: string | undefined,
) {
  if (preferredSheetId && sheets.some((sheet) => sheet.id === preferredSheetId)) {
    return preferredSheetId;
  }

  return sheets[0]?.id ?? "";
}

function isValidSheetId(
  sheets: Pick<SheetData, "id" | "name">[],
  sheetId: string,
) {
  return sheets.some((sheet) => sheet.id === sheetId);
}

function createWorkbookWindowId(
  sheetId: string,
  existingViews: WorkbookWindowView[],
) {
  const existingIds = new Set(existingViews.map((view) => view.id));
  const normalizedSheetId = sheetId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const baseId = `workbook-window-${normalizedSheetId || "sheet"}`;

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  for (let index = 2; index <= MAX_WORKBOOK_WINDOW_VIEWS; index += 1) {
    const candidate = `${baseId}-${index}`;

    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }

  return `${baseId}-${existingIds.size + 1}`;
}
