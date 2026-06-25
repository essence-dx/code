import {
  EXCEL_MAX_COLUMNS,
  EXCEL_MAX_ROWS,
} from "@/features/spreadsheet/sheet-scale";

export const HISTORY_LIMIT = 50;
export const MAX_ROWS = EXCEL_MAX_ROWS;
export const MAX_COLUMNS = EXCEL_MAX_COLUMNS;
export const VERSION_HISTORY_LIMIT = 20;
export const VERSION_RESTORE_LOG_LIMIT = 50;
export const AUTO_VERSION_LABEL_PREFIX = "Auto checkpoint";
export const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000;
