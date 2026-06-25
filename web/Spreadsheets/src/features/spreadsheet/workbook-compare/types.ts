import type {
  ChartRange,
  WorkbookMetadata,
} from "@/features/workbooks/types";

export type WorkbookCompareCategory =
  | "metadata"
  | "sheet"
  | "cell"
  | "formula"
  | "table"
  | "chart";

export type WorkbookCompareStatus = "added" | "removed" | "changed";

export type WorkbookCompareSheetField =
  | "columnCount"
  | "columnWidths"
  | "hiddenColumns"
  | "hiddenRows"
  | "mergedCells"
  | "name"
  | "rowCount"
  | "showGridlines"
  | "tabColor";

export type WorkbookCompareSummary = {
  added: number;
  changed: number;
  removed: number;
  total: number;
  truncated: number;
  byCategory: Record<WorkbookCompareCategory, number>;
};

export type WorkbookCompareMergeTarget =
  | {
      kind: "metadata";
      field: keyof WorkbookMetadata;
    }
  | {
      kind: "sheet";
      action: "add" | "remove";
      baseSheetId?: string;
      incomingSheetId?: string;
    }
  | {
      kind: "sheetProperty";
      baseSheetId: string;
      field: WorkbookCompareSheetField;
      incomingSheetId: string;
    }
  | {
      kind: "cell";
      baseSheetId: string;
      cellKey: string;
      incomingSheetId: string;
    }
  | {
      kind: "collection";
      action: "add" | "remove" | "replace";
      baseId?: string;
      incomingId?: string;
      collection: "charts" | "tables";
    };

export type WorkbookCompareItem = {
  id: string;
  category: WorkbookCompareCategory;
  status: WorkbookCompareStatus;
  title: string;
  details: string;
  sheetId?: string;
  sheetName?: string;
  cellKey?: string;
  range?: ChartRange;
  baseValue?: string;
  incomingValue?: string;
  merge?: WorkbookCompareMergeTarget;
};

export type WorkbookCompareResult = {
  incomingName: string;
  items: WorkbookCompareItem[];
  summary: WorkbookCompareSummary;
};

export const compareCategories: WorkbookCompareCategory[] = [
  "metadata",
  "sheet",
  "cell",
  "formula",
  "table",
  "chart",
];

export const metadataFields = [
  "description",
  "favorite",
  "folderName",
  "isTemplate",
  "tags",
] satisfies Array<keyof WorkbookMetadata>;

export const sheetFields = [
  "name",
  "rowCount",
  "columnCount",
  "columnWidths",
  "hiddenRows",
  "hiddenColumns",
  "mergedCells",
  "showGridlines",
  "tabColor",
] satisfies WorkbookCompareSheetField[];
