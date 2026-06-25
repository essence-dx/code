import { nanoid } from "nanoid";

import { parseCsvRows } from "@/features/editor/csv-import";
import type {
  ChartDataPoint,
  DesignDocument,
  DesignElement,
  DesignPage,
} from "@/features/editor/types";

export const maxBulkCreateRows = 50;

export type BulkCreateResult =
  | {
      ok: true;
      document: DesignDocument;
      createdPages: number;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

type RowValues = Record<string, string>;

export function createBulkPagesFromCsv(
  document: DesignDocument,
  csvText: string,
): BulkCreateResult {
  const rows = parseCsvRows(csvText).filter((row) =>
    row.some((cell) => cell.trim()),
  );
  const headers = rows[0]?.map((cell) => cell.trim()).filter(Boolean) ?? [];

  if (rows.length < 2 || headers.length === 0) {
    return {
      ok: false,
      message:
        "Bulk create needs a header row and at least one data row, like Name,Title.",
    };
  }

  const sourcePage =
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0];

  if (!sourcePage) {
    return {
      ok: false,
      message: "Add a page before using bulk create.",
    };
  }

  const dataRows = rows.slice(1, maxBulkCreateRows + 1);
  const createdPages = dataRows.map((row, index) =>
    createPageFromRow(sourcePage, headers, row, index),
  );

  return {
    ok: true,
    document: {
      ...document,
      pages: [...document.pages, ...createdPages],
      activePageId: createdPages[0]?.id ?? document.activePageId,
    },
    createdPages: createdPages.length,
    truncated: rows.length - 1 > maxBulkCreateRows,
  };
}

function createPageFromRow(
  sourcePage: DesignPage,
  headers: string[],
  row: string[],
  rowIndex: number,
): DesignPage {
  const values = Object.fromEntries(
    headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
  );
  const groupIds = new Map<string, string>();
  const pageName = replacePlaceholders(sourcePage.name, values);
  const firstValue = row.find((cell) => cell.trim())?.trim();

  return {
    ...sourcePage,
    id: nanoid(),
    name:
      pageName !== sourcePage.name
        ? pageName
        : `${sourcePage.name} ${firstValue || rowIndex + 1}`,
    notes: replacePlaceholders(sourcePage.notes ?? "", values),
    elements: sourcePage.elements.map((element) =>
      replaceElementPlaceholders(element, values, groupIds),
    ),
  };
}

function replaceElementPlaceholders(
  element: DesignElement,
  values: RowValues,
  groupIds: Map<string, string>,
): DesignElement {
  const groupId = element.groupId
    ? getClonedGroupId(groupIds, element.groupId)
    : undefined;

  if (element.type === "text") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      content: replacePlaceholders(element.content, values),
    };
  }

  if (element.type === "qr") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      qrValue: replacePlaceholders(element.qrValue, values),
    };
  }

  if (element.type === "table") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      cells: element.cells.map((cell) => replacePlaceholders(cell, values)),
    };
  }

  if (element.type === "chart") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      data: element.data.map((point) =>
        replaceChartPointPlaceholders(point, values),
      ),
    };
  }

  if (element.type === "form") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      label: replacePlaceholders(element.label, values),
      value: replacePlaceholders(element.value, values),
      placeholder: replacePlaceholders(element.placeholder, values),
      options: element.options.map((option) =>
        replacePlaceholders(option, values),
      ),
    };
  }

  if (element.type === "image") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      alt: replacePlaceholders(element.alt, values),
    };
  }

  if (element.type === "video" || element.type === "audio") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      title: replacePlaceholders(element.title, values),
    };
  }

  if (element.type === "pdf") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      title: replacePlaceholders(element.title, values),
    };
  }

  if (element.type === "svg") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      name: replacePlaceholders(element.name, values),
    };
  }

  if (element.type === "embed") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      url: replacePlaceholders(element.url, values),
      title: replacePlaceholders(element.title, values),
      description: replacePlaceholders(element.description, values),
    };
  }

  if (element.type === "timer") {
    return {
      ...element,
      id: nanoid(),
      groupId,
      linkUrl: replaceLinkUrl(element, values),
      label: replacePlaceholders(element.label, values),
      running: false,
      startedAt: null,
      elapsedSeconds: 0,
    };
  }

  return {
    ...element,
    id: nanoid(),
    groupId,
    linkUrl: replaceLinkUrl(element, values),
  };
}

function replaceChartPointPlaceholders(
  point: ChartDataPoint,
  values: RowValues,
): ChartDataPoint {
  const label = replacePlaceholders(point.label, values);
  const color = replacePlaceholders(point.color, values);

  return {
    ...point,
    label,
    color: color.startsWith("#") ? color : point.color,
  };
}

function replacePlaceholders(value: string, values: RowValues) {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();

    return values[key] ?? "";
  });
}

function replaceLinkUrl(element: DesignElement, values: RowValues) {
  return element.linkUrl
    ? replacePlaceholders(element.linkUrl, values)
    : undefined;
}

function getClonedGroupId(groupIds: Map<string, string>, groupId: string) {
  const existingGroupId = groupIds.get(groupId);

  if (existingGroupId) return existingGroupId;

  const nextGroupId = nanoid();
  groupIds.set(groupId, nextGroupId);

  return nextGroupId;
}
