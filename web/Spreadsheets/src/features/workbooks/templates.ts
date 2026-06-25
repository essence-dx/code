import { cellKey } from "@/features/workbooks/addresses";
import { createBlankSheet } from "@/features/workbooks/default-workbook";
import { defaultWorkbookTheme } from "@/features/workbooks/workbook-themes";
import type { CellStyle, SheetData, WorkbookDocument } from "@/features/workbooks/types";

type WorkbookTemplate = {
  id: string;
  title: string;
  description: string;
  workbookName: string;
  createDocument: () => WorkbookDocument;
};

const titleStyle = {
  bold: true,
  fontSize: 18,
} satisfies CellStyle;
const headerStyle = {
  background: "#dbeafe",
  bold: true,
  foreground: "#1e3a8a",
} satisfies CellStyle;
const totalStyle = {
  background: "#dcfce7",
  bold: true,
  foreground: "#14532d",
  numberFormat: "currency",
} satisfies CellStyle;
const warningStyle = {
  background: "#fef3c7",
  bold: true,
  foreground: "#92400e",
} satisfies CellStyle;

function workbookDocument(sheet: SheetData): WorkbookDocument {
  return {
    version: 1,
    metadata: {
      description: "",
      favorite: false,
      folderName: "",
      isTemplate: false,
      lastOpenedAt: "",
      tags: [],
      updatedAt: "",
    },
    activeSheetId: sheet.id,
    versionHistory: [],
    versionRestores: [],
    customViews: [],
    formulaWatches: [],
    whatIfScenarios: [],
    theme: defaultWorkbookTheme,
    cellStyles: [],
    queries: [],
    macroProjects: [],
    unsupportedParts: [],
    nativeObjects: [],
    automationScripts: [],
    workbookProtection: null,
    sheets: [sheet],
    charts: [],
    sparklines: [],
    insertedObjects: [],
    tables: [],
    tableSlicers: [],
    tableTimelines: [],
    pivotTables: [],
    conditionalFormats: [],
    dataValidations: [],
    filters: [],
    filterPresets: [],
    cellNotes: [],
    commentNotifications: [],
    cellLinks: [],
    namedRanges: [],
    sheetProtections: [],
    sheetPrintSettings: [],
  };
}

function setCell(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
  raw: string,
  style?: CellStyle,
) {
  sheet.cells[cellKey(rowIndex, columnIndex)] = {
    raw,
    ...(style ? { style } : {}),
  };
}

function dateFromOffset(offset: number) {
  const date = new Date();

  date.setDate(date.getDate() + offset);

  return date;
}

function isoDateFromOffset(offset: number) {
  return dateFromOffset(offset).toISOString().slice(0, 10);
}

function weekdayFromOffset(offset: number) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    dateFromOffset(offset),
  );
}

function createBudgetDocument() {
  const sheet = createBlankSheet("Monthly Budget");
  const months = ["Jan", "Feb", "Mar", "Q1 total"];
  const rows = [
    ["Income", "4200", "4350", "4400"],
    ["Rent", "1200", "1200", "1200"],
    ["Utilities", "260", "280", "275"],
    ["Food", "520", "545", "560"],
    ["Transport", "180", "175", "190"],
    ["Savings", "900", "950", "1000"],
  ];

  sheet.rowCount = 40;
  sheet.columnCount = 8;
  sheet.columnWidths = { "0": 180, "1": 112, "2": 112, "3": 112, "4": 128 };
  setCell(sheet, 0, 0, "Monthly budget", titleStyle);
  months.forEach((month, index) => setCell(sheet, 2, index + 1, month, headerStyle));
  setCell(sheet, 2, 0, "Category", headerStyle);
  rows.forEach((row, rowOffset) => {
    const rowIndex = rowOffset + 3;

    setCell(sheet, rowIndex, 0, row[0]);
    row.slice(1).forEach((value, columnOffset) =>
      setCell(sheet, rowIndex, columnOffset + 1, value, { numberFormat: "currency" }),
    );
    setCell(sheet, rowIndex, 4, `=SUM(B${rowIndex + 1}:D${rowIndex + 1})`, totalStyle);
  });
  setCell(sheet, 10, 0, "Net cash", totalStyle);
  setCell(sheet, 10, 1, "=B4-SUM(B5:B9)", totalStyle);
  setCell(sheet, 10, 2, "=C4-SUM(C5:C9)", totalStyle);
  setCell(sheet, 10, 3, "=D4-SUM(D5:D9)", totalStyle);
  setCell(sheet, 10, 4, "=SUM(B11:D11)", totalStyle);

  return workbookDocument(sheet);
}

function createInvoiceDocument() {
  const sheet = createBlankSheet("Invoice");

  sheet.rowCount = 40;
  sheet.columnCount = 8;
  sheet.columnWidths = { "0": 220, "1": 90, "2": 110, "3": 120 };
  setCell(sheet, 0, 0, "Invoice", titleStyle);
  setCell(sheet, 2, 0, "Client");
  setCell(sheet, 2, 1, "Acme Ltd.");
  setCell(sheet, 3, 0, "Invoice date");
  setCell(sheet, 3, 1, new Date().toISOString().slice(0, 10), { numberFormat: "date" });
  ["Item", "Qty", "Rate", "Amount"].forEach((label, index) =>
    setCell(sheet, 6, index, label, headerStyle),
  );
  [
    ["Design work", "12", "75"],
    ["Spreadsheet setup", "6", "85"],
    ["Review call", "2", "60"],
  ].forEach((row, rowOffset) => {
    const rowIndex = rowOffset + 7;

    setCell(sheet, rowIndex, 0, row[0]);
    setCell(sheet, rowIndex, 1, row[1]);
    setCell(sheet, rowIndex, 2, row[2], { numberFormat: "currency" });
    setCell(sheet, rowIndex, 3, `=B${rowIndex + 1}*C${rowIndex + 1}`, {
      numberFormat: "currency",
    });
  });
  setCell(sheet, 12, 2, "Subtotal", headerStyle);
  setCell(sheet, 12, 3, "=SUM(D8:D10)", totalStyle);
  setCell(sheet, 13, 2, "Tax 10%", headerStyle);
  setCell(sheet, 13, 3, "=D13*0.1", totalStyle);
  setCell(sheet, 14, 2, "Total", totalStyle);
  setCell(sheet, 14, 3, "=D13+D14", totalStyle);

  return workbookDocument(sheet);
}

function createCalendarDocument() {
  const sheet = createBlankSheet("Calendar");
  const headers = ["Date", "Day", "Event", "Category", "Owner", "Status"];
  const events = [
    [0, "Weekly planning", "Work", "Essence", "Planned"],
    [1, "Invoice follow-up", "Finance", "Essence", "Planned"],
    [3, "Product review", "Work", "Essence", "In progress"],
    [5, "Personal reset", "Personal", "Essence", "Planned"],
    [7, "Metrics review", "Finance", "Essence", "Planned"],
    [10, "Release checkpoint", "Work", "Essence", "Planned"],
  ];

  sheet.rowCount = 60;
  sheet.columnCount = 8;
  sheet.columnWidths = {
    "0": 120,
    "1": 120,
    "2": 220,
    "3": 120,
    "4": 120,
    "5": 120,
  };
  setCell(sheet, 0, 0, "Calendar planner", titleStyle);
  headers.forEach((label, index) => setCell(sheet, 2, index, label, headerStyle));
  events.forEach((event, rowOffset) => {
    const rowIndex = rowOffset + 3;

    setCell(sheet, rowIndex, 0, isoDateFromOffset(event[0] as number), {
      numberFormat: "date",
    });
    setCell(sheet, rowIndex, 1, weekdayFromOffset(event[0] as number));
    setCell(sheet, rowIndex, 2, String(event[1]));
    setCell(sheet, rowIndex, 3, String(event[2]));
    setCell(sheet, rowIndex, 4, String(event[3]));
    setCell(sheet, rowIndex, 5, String(event[4]));
  });
  setCell(sheet, 12, 0, "Calendar summary", warningStyle);
  setCell(sheet, 13, 0, "Events", headerStyle);
  setCell(sheet, 13, 1, "=COUNTA(C4:C9)", warningStyle);
  setCell(sheet, 14, 0, "Planned", headerStyle);
  setCell(sheet, 14, 1, '=COUNTIF(F4:F9,"Planned")', warningStyle);

  return workbookDocument(sheet);
}

function createTimesheetDocument() {
  const sheet = createBlankSheet("Timesheet");
  const headers = [
    "Date",
    "Workstream",
    "Start hour",
    "End hour",
    "Break",
    "Billable hours",
    "Rate",
    "Amount",
    "Notes",
  ];
  const rows = [
    [0, "Spreadsheet engine", "9", "17", "1", "85", "Formula and import work"],
    [1, "Interface polish", "10", "18", "1", "75", "Toolbar and grid flow"],
    [2, "Desktop shell", "9", "15", "0.5", "90", "Tauri packaging work"],
    [3, "Testing", "11", "16", "0.5", "80", "Regression pass"],
    [4, "Documentation", "10", "14", "0", "65", "Release notes"],
  ];

  sheet.rowCount = 60;
  sheet.columnCount = 10;
  sheet.columnWidths = {
    "0": 118,
    "1": 180,
    "2": 92,
    "3": 92,
    "4": 86,
    "5": 118,
    "6": 96,
    "7": 112,
    "8": 220,
  };
  setCell(sheet, 0, 0, "Weekly timesheet", titleStyle);
  headers.forEach((label, index) => setCell(sheet, 2, index, label, headerStyle));
  rows.forEach((row, rowOffset) => {
    const rowIndex = rowOffset + 3;

    setCell(sheet, rowIndex, 0, isoDateFromOffset(row[0] as number), {
      numberFormat: "date",
    });
    setCell(sheet, rowIndex, 1, String(row[1]));
    setCell(sheet, rowIndex, 2, String(row[2]));
    setCell(sheet, rowIndex, 3, String(row[3]));
    setCell(sheet, rowIndex, 4, String(row[4]));
    setCell(sheet, rowIndex, 5, `=MAX(0,D${rowIndex + 1}-C${rowIndex + 1}-E${rowIndex + 1})`);
    setCell(sheet, rowIndex, 6, String(row[5]), { numberFormat: "currency" });
    setCell(sheet, rowIndex, 7, `=F${rowIndex + 1}*G${rowIndex + 1}`, {
      numberFormat: "currency",
    });
    setCell(sheet, rowIndex, 8, String(row[6]));
  });
  setCell(sheet, 10, 4, "Totals", totalStyle);
  setCell(sheet, 10, 5, "=SUM(F4:F8)", warningStyle);
  setCell(sheet, 10, 7, "=SUM(H4:H8)", totalStyle);

  return workbookDocument(sheet);
}

function createFinanceDocument() {
  const sheet = createBlankSheet("Cashflow Forecast");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const rows = [
    ["Opening cash", "18000", "=G4", "=H4", "=I4", "=J4", "=K4"],
    ["Revenue", "8500", "9200", "9800", "10400", "11200", "11800"],
    ["Payroll", "4200", "4300", "4400", "4550", "4650", "4800"],
    ["Software", "650", "650", "700", "700", "760", "760"],
    ["Marketing", "800", "900", "900", "1000", "1200", "1200"],
    ["Other", "500", "450", "550", "500", "600", "550"],
  ];

  sheet.rowCount = 50;
  sheet.columnCount = 10;
  sheet.columnWidths = {
    "0": 180,
    "1": 112,
    "2": 112,
    "3": 112,
    "4": 112,
    "5": 112,
    "6": 112,
    "7": 130,
  };
  setCell(sheet, 0, 0, "Cashflow forecast", titleStyle);
  months.forEach((month, index) => setCell(sheet, 2, index + 1, month, headerStyle));
  setCell(sheet, 2, 0, "Line item", headerStyle);
  rows.forEach((row, rowOffset) => {
    const rowIndex = rowOffset + 3;

    setCell(sheet, rowIndex, 0, row[0]);
    row.slice(1).forEach((value, columnOffset) =>
      setCell(sheet, rowIndex, columnOffset + 1, value, {
        numberFormat: "currency",
      }),
    );
  });
  setCell(sheet, 10, 0, "Total expenses", totalStyle);
  setCell(sheet, 11, 0, "Net cashflow", totalStyle);
  setCell(sheet, 12, 0, "Closing cash", totalStyle);
  months.forEach((_, monthIndex) => {
    const columnLetter = String.fromCharCode("B".charCodeAt(0) + monthIndex);
    const nextColumnLetter = String.fromCharCode("C".charCodeAt(0) + monthIndex);
    const expenseColumnLetter =
      monthIndex < months.length - 1 ? nextColumnLetter : columnLetter;

    setCell(sheet, 10, monthIndex + 1, `=SUM(${columnLetter}6:${columnLetter}9)`, totalStyle);
    setCell(sheet, 11, monthIndex + 1, `=${columnLetter}5-${columnLetter}11`, totalStyle);
    setCell(sheet, 12, monthIndex + 1, `=${columnLetter}4+${columnLetter}12`, totalStyle);
    if (monthIndex < months.length - 1) {
      setCell(sheet, 3, monthIndex + 2, `=${columnLetter}13`, {
        numberFormat: "currency",
      });
    }
    setCell(
      sheet,
      14,
      monthIndex + 1,
      `=${columnLetter}13/${expenseColumnLetter}11`,
      warningStyle,
    );
  });
  setCell(sheet, 14, 0, "Runway months at next expense rate", warningStyle);

  return workbookDocument(sheet);
}

function createProjectTrackerDocument() {
  const sheet = createBlankSheet("Project Tracker");
  const headers = ["Task", "Owner", "Status", "Due date", "Progress"];
  const tasks = [
    ["Workbook shell", "Essence", "Done", "2026-05-15", "1"],
    ["Formula polish", "Essence", "In progress", "2026-05-20", "0.65"],
    ["Desktop packaging", "Essence", "Planned", "2026-05-27", "0.15"],
  ];

  sheet.rowCount = 80;
  sheet.columnCount = 8;
  sheet.columnWidths = { "0": 220, "1": 130, "2": 130, "3": 130, "4": 120 };
  setCell(sheet, 0, 0, "Project tracker", titleStyle);
  headers.forEach((label, index) => setCell(sheet, 2, index, label, headerStyle));
  tasks.forEach((row, rowOffset) => {
    const rowIndex = rowOffset + 3;

    setCell(sheet, rowIndex, 0, row[0]);
    setCell(sheet, rowIndex, 1, row[1]);
    setCell(sheet, rowIndex, 2, row[2]);
    setCell(sheet, rowIndex, 3, row[3], { numberFormat: "date" });
    setCell(sheet, rowIndex, 4, row[4], { numberFormat: "percent" });
  });
  setCell(sheet, 8, 3, "Average progress", totalStyle);
  setCell(sheet, 8, 4, "=AVERAGE(E4:E6)", {
    ...totalStyle,
    numberFormat: "percent",
  });

  return workbookDocument(sheet);
}

export const workbookTemplates: WorkbookTemplate[] = [
  {
    id: "budget",
    title: "Budget",
    description: "Monthly income, expense, savings, and net-cash formulas.",
    workbookName: "Monthly Budget",
    createDocument: createBudgetDocument,
  },
  {
    id: "invoice",
    title: "Invoice",
    description: "Line items, quantity, rate, subtotal, tax, and total formulas.",
    workbookName: "Invoice",
    createDocument: createInvoiceDocument,
  },
  {
    id: "project-tracker",
    title: "Project Tracker",
    description: "Task ownership, status, due dates, and progress summary.",
    workbookName: "Project Tracker",
    createDocument: createProjectTrackerDocument,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Event dates, categories, ownership, status counts, and schedule summary.",
    workbookName: "Calendar Planner",
    createDocument: createCalendarDocument,
  },
  {
    id: "timesheet",
    title: "Timesheet",
    description: "Weekly billable hours, rates, amount formulas, and total billing.",
    workbookName: "Weekly Timesheet",
    createDocument: createTimesheetDocument,
  },
  {
    id: "cashflow-forecast",
    title: "Cashflow Forecast",
    description: "Six-month revenue, expense, net cashflow, closing cash, and runway formulas.",
    workbookName: "Cashflow Forecast",
    createDocument: createFinanceDocument,
  },
];

export function getWorkbookTemplate(templateId: string) {
  return workbookTemplates.find((template) => template.id === templateId) ?? null;
}
