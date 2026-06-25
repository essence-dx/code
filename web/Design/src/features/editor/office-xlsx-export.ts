import JSZip from "jszip";

import { resolveChartData } from "@/features/editor/chart-data-binding";
import {
  createBlobExportArtifact,
  downloadBlob,
  type ClientExportArtifact,
} from "@/features/editor/export-artifacts";
import { formatFileName } from "@/features/editor/export-design";
import { getTableCellStyle } from "@/features/editor/table-cell-format";
import { isFormulaCell } from "@/features/editor/table-formulas";
import {
  getTableSheets,
  sheetToTableFields,
} from "@/features/editor/table-sheets";
import {
  getTableRawRows,
  hasActiveTableFilter,
  hasActiveTableSort,
} from "@/features/editor/table-view";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  TableElement,
} from "@/features/editor/types";

const spreadsheetNamespace =
  'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const officeRelationshipsNamespace =
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const packageRelationshipsNamespace =
  'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';

type WorkbookSheet = {
  name: string;
  rows: string[][];
  table?: TableElement;
};

type CellExportStyle = {
  bold?: boolean;
  fill?: string;
  textAlign?: "left" | "center" | "right";
  textColor?: string;
};

type CellStyleRegistry = {
  getStyleId: (style: CellExportStyle) => number;
  styles: CellExportStyle[];
};

export async function exportDocumentAsXlsx(input: {
  document: DesignDocument;
  onArtifact?: (artifact: ClientExportArtifact) => Promise<void> | void;
  projectName: string;
}) {
  const sheets = createWorkbookSheets(input.document, input.projectName);
  const cellStyleRegistry = createCellStyleRegistry(sheets);
  const zip = new JSZip();

  zip.file("[Content_Types].xml", createContentTypesXml(sheets.length));
  zip.folder("_rels")?.file(".rels", createRootRelationshipsXml());
  zip.folder("docProps")?.file("core.xml", createCorePropertiesXml(input.projectName));
  zip.folder("docProps")?.file("app.xml", createAppPropertiesXml(sheets));

  const workbook = zip.folder("xl");
  workbook?.file("workbook.xml", createWorkbookXml(sheets));
  workbook?.file("styles.xml", createStylesXml(cellStyleRegistry.styles));
  workbook?.folder("_rels")?.file("workbook.xml.rels", createWorkbookRelationshipsXml(sheets.length));

  const worksheets = workbook?.folder("worksheets");
  sheets.forEach((sheet, index) => {
    worksheets?.file(
      `sheet${index + 1}.xml`,
      createWorksheetXml(sheet, cellStyleRegistry),
    );
  });

  const blob = await zip.generateAsync({
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    type: "blob",
  });

  const fileName = `${formatFileName(input.projectName)}.xlsx`;

  await input.onArtifact?.(
    await createBlobExportArtifact({
      blob,
      fileName,
    }),
  );
  downloadBlob({
    blob,
    fileName,
  });
}

function createWorkbookSheets(document: DesignDocument, projectName: string) {
  const tableSheets = document.pages.flatMap((page, pageIndex) => {
    return page.elements
      .filter(isVisibleTableElement)
      .sort(compareElementsForDocumentFlow)
      .flatMap((table, tableIndex) => {
        const sheets = getTableSheets(table);

        return sheets.map((sheet) => {
          const sheetTable = {
            ...table,
            ...sheetToTableFields(sheet),
            activeSheetId: sheet.id,
            sheets,
          };

          return {
            name: createSheetName(
              sheets.length > 1
                ? `${sheet.name}`
                : `${page.name || `Page ${pageIndex + 1}`} table ${tableIndex + 1}`,
            ),
            rows: createRowsFromTable(sheetTable),
            table: sheetTable,
          };
        });
      });
  });

  if (tableSheets.length > 0) return ensureUniqueSheetNames(tableSheets);

  const summarySheets = document.pages.map((page, index) => ({
    name: createSheetName(page.name || `Page ${index + 1}`),
    rows: createRowsFromPage(page),
  }));

  if (summarySheets.some((sheet) => sheet.rows.length > 1)) {
    return ensureUniqueSheetNames(summarySheets);
  }

  return [
    {
      name: createSheetName(projectName || "Design"),
      rows: [
        ["Project", projectName],
        ["Pages", String(document.pages.length)],
      ],
    },
  ];
}

function createRowsFromTable(table: TableElement) {
  return getTableRawRows(table);
}

function createRowsFromPage(page: DesignPage) {
  const rows = [["Layer", "Content", "Value"]];

  page.elements
    .filter((element) => !element.hidden)
    .sort(compareElementsForDocumentFlow)
    .forEach((element) => {
      rows.push(...createRowsFromElement(element, page.elements));
    });

  return rows;
}

function createRowsFromElement(
  element: DesignElement,
  pageElements: readonly DesignElement[],
) {
  if (element.type === "text") {
    return [["Text", element.content, ""]];
  }

  if (element.type === "chart") {
    return resolveChartData(element, pageElements).map((item) => [
      `${formatTitle(element.chartType)} chart`,
      item.label,
      String(item.value),
    ]);
  }

  if (element.type === "form") {
    const value =
      element.fieldKind === "checkbox"
        ? element.checked
          ? "Checked"
          : "Unchecked"
        : element.value || element.placeholder;

    return [["Form", element.label || formatTitle(element.fieldKind), value]];
  }

  if (element.type === "embed") {
    return [["Embed", element.title || "Embedded link", element.url]];
  }

  if (element.type === "timer") {
    return [["Timer", element.label, String(element.durationSeconds)]];
  }

  return [];
}

function createContentTypesXml(sheetCount: number) {
  const worksheetOverrides = Array.from({ length: sheetCount }, (_, index) => {
    return `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${worksheetOverrides}
</Types>`;
}

function createRootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships ${packageRelationshipsNamespace}>
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function createWorkbookXml(sheets: WorkbookSheet[]) {
  const sheetEntries = sheets
    .map((sheet, index) => {
      return `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook ${spreadsheetNamespace} ${officeRelationshipsNamespace}>
  <sheets>
    ${sheetEntries}
  </sheets>
</workbook>`;
}

function createWorkbookRelationshipsXml(sheetCount: number) {
  const sheetRelationships = Array.from({ length: sheetCount }, (_, index) => {
    return `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`;
  }).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships ${packageRelationshipsNamespace}>
  ${sheetRelationships}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function createWorksheetXml(
  sheet: WorkbookSheet,
  cellStyleRegistry: CellStyleRegistry,
) {
  const maxColumns = Math.max(...sheet.rows.map((row) => row.length), 1);
  const lastCell = `${getColumnName(maxColumns)}${Math.max(sheet.rows.length, 1)}`;
  const sheetViews = createSheetViewsXml(sheet.table);
  const autoFilter = createAutoFilterXml(sheet.table, maxColumns, sheet.rows.length);
  const rows = sheet.rows
    .map((row, rowIndex) => createWorksheetRow(row, rowIndex, sheet, cellStyleRegistry))
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${spreadsheetNamespace} ${officeRelationshipsNamespace}>
  <dimension ref="A1:${lastCell}"/>
  ${sheetViews}
  <sheetFormatPr defaultRowHeight="18"/>
  <sheetData>
    ${rows}
  </sheetData>
  ${autoFilter}
</worksheet>`;
}

function createWorksheetRow(
  row: string[],
  rowIndex: number,
  sheet: WorkbookSheet,
  cellStyleRegistry: CellStyleRegistry,
) {
  const rowNumber = rowIndex + 1;
  const cells = row
    .map((cell, columnIndex) =>
      createWorksheetCell(
        cell,
        rowNumber,
        columnIndex,
        getCellStyleId(sheet, rowIndex, columnIndex, cellStyleRegistry),
      ),
    )
    .join("");

  return `<row r="${rowNumber}">${cells}</row>`;
}

function createWorksheetCell(
  value: string,
  rowNumber: number,
  columnIndex: number,
  styleId: number,
) {
  const reference = `${getColumnName(columnIndex + 1)}${rowNumber}`;
  const style = styleId > 0 ? ` s="${styleId}"` : "";

  if (isFormulaCell(value)) {
    return `<c r="${reference}"${style}><f>${escapeXml(value.trim().slice(1))}</f></c>`;
  }

  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function createCellStyleRegistry(sheets: WorkbookSheet[]): CellStyleRegistry {
  const styles: CellExportStyle[] = [{}];
  const styleIds = new Map<string, number>([[createStyleKey({}), 0]]);
  const registry = {
    getStyleId(style: CellExportStyle) {
      const normalizedStyle = normalizeCellStyle(style);
      const key = createStyleKey(normalizedStyle);
      const existingId = styleIds.get(key);

      if (typeof existingId === "number") return existingId;

      const nextId = styles.length;
      styles.push(normalizedStyle);
      styleIds.set(key, nextId);

      return nextId;
    },
    styles,
  };

  sheets.forEach((sheet) => {
    sheet.rows.forEach((row, rowIndex) => {
      row.forEach((_, columnIndex) => {
        registry.getStyleId(createCellExportStyle(sheet, rowIndex, columnIndex));
      });
    });
  });

  return registry;
}

function getCellStyleId(
  sheet: WorkbookSheet,
  rowIndex: number,
  columnIndex: number,
  registry: CellStyleRegistry,
) {
  return registry.getStyleId(createCellExportStyle(sheet, rowIndex, columnIndex));
}

function createCellExportStyle(
  sheet: WorkbookSheet,
  rowIndex: number,
  columnIndex: number,
): CellExportStyle {
  const table = sheet.table;

  if (!table) return rowIndex === 0 ? { bold: true } : {};

  const cellStyle = getTableCellStyle(table, rowIndex, columnIndex);
  const isHeader = table.headerRow && rowIndex === 0;

  return normalizeCellStyle({
    bold: isHeader || (cellStyle.fontWeight ?? 0) >= 700,
    fill: cellStyle.fill ?? (isHeader ? table.headerFill : undefined),
    textAlign: cellStyle.textAlign,
    textColor: cellStyle.textColor,
  });
}

function normalizeCellStyle(style: CellExportStyle) {
  return {
    bold: style.bold || undefined,
    fill: style.fill ? normalizeHexColor(style.fill) : undefined,
    textAlign: style.textAlign,
    textColor: style.textColor ? normalizeHexColor(style.textColor) : undefined,
  };
}

function createStyleKey(style: CellExportStyle) {
  return [
    style.bold ? "1" : "0",
    style.fill ?? "",
    style.textAlign ?? "",
    style.textColor ?? "",
  ].join("|");
}

function createSheetViewsXml(table: TableElement | undefined) {
  const freezeHeader = table?.headerRow && (table.freezeHeaderRow ?? true);

  if (!freezeHeader) {
    return `<sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>`;
  }

  return `<sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>`;
}

function createAutoFilterXml(
  table: TableElement | undefined,
  columns: number,
  rowCount: number,
) {
  if (!table?.headerRow || rowCount < 2) return "";
  if (!hasActiveTableFilter(table) && !hasActiveTableSort(table)) return "";

  const range = `A1:${getColumnName(columns)}${rowCount}`;
  const sortState =
    hasActiveTableSort(table) && typeof table.sortColumnIndex === "number"
      ? `<sortState ref="A2:${getColumnName(columns)}${rowCount}">
      <sortCondition ref="${getColumnName(table.sortColumnIndex + 1)}2:${getColumnName(table.sortColumnIndex + 1)}${rowCount}"${table.sortDirection === "desc" ? ' descending="1"' : ""}/>
    </sortState>`
      : "";

  return `<autoFilter ref="${range}">
    ${sortState}
  </autoFilter>`;
}

function createStylesXml(styles: CellExportStyle[]) {
  const fonts = styles
    .map((style) => {
      const bold = style.bold ? "<b/>" : "";
      const color = style.textColor
        ? `<color rgb="FF${normalizeHexColor(style.textColor)}"/>`
        : "";

      return `<font>${bold}${color}<sz val="11"/><name val="Aptos"/><family val="2"/></font>`;
    })
    .join("\n    ");
  const fills: string[] = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  const fillIds = styles.map(() => 0);

  styles.forEach((style, index) => {
    if (!style.fill) return;

    fillIds[index] = fills.length;
    fills.push(
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${normalizeHexColor(style.fill)}"/><bgColor indexed="64"/></patternFill></fill>`,
    );
  });

  const cellXfs = styles
    .map((style, index) => {
      const alignment = style.textAlign
        ? `<alignment horizontal="${style.textAlign}"/>`
        : "";

      return `<xf numFmtId="0" fontId="${index}" fillId="${fillIds[index]}" borderId="0" xfId="0" applyFont="1" applyFill="${fillIds[index] > 0 ? 1 : 0}"${alignment ? ' applyAlignment="1"' : ""}>${alignment}</xf>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet ${spreadsheetNamespace}>
  <fonts count="${styles.length}">
    ${fonts}
  </fonts>
  <fills count="${fills.length}">
    ${fills.join("\n    ")}
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${styles.length}">
    ${cellXfs}
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function createCorePropertiesXml(projectName: string) {
  const createdAt = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(projectName)}</dc:title>
  <dc:creator>Essence Studio</dc:creator>
  <cp:lastModifiedBy>Essence Studio</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`;
}

function createAppPropertiesXml(sheets: WorkbookSheet[]) {
  const sheetCount = sheets.length;
  const sheetNames = sheets
    .map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Essence Studio</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheetCount}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheetCount}" baseType="lpstr">${sheetNames}</vt:vector>
  </TitlesOfParts>
</Properties>`;
}

function isVisibleTableElement(
  element: DesignElement,
): element is TableElement {
  return element.type === "table" && !element.hidden;
}

function compareElementsForDocumentFlow(
  first: DesignElement,
  second: DesignElement,
) {
  return first.y - second.y || first.x - second.x;
}

function createSheetName(value: string) {
  return (
    value
      .replace(/[\\/?*:[\]]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^'+|'+$/g, "")
      .trim()
      .slice(0, 31) || "Sheet"
  );
}

function ensureUniqueSheetNames(sheets: WorkbookSheet[]) {
  const usedNames = new Set<string>();

  return sheets.map((sheet, index) => {
    const baseName = sheet.name || `Sheet ${index + 1}`;
    let name = baseName;
    let duplicateIndex = 2;

    while (usedNames.has(name.toLowerCase())) {
      const suffix = ` ${duplicateIndex}`;
      name = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
      duplicateIndex += 1;
    }

    usedNames.add(name.toLowerCase());

    return {
      ...sheet,
      name,
    };
  });
}

function getColumnName(columnNumber: number) {
  let value = columnNumber;
  let name = "";

  while (value > 0) {
    const modulo = (value - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    value = Math.floor((value - modulo) / 26);
  }

  return name;
}

function formatTitle(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeHexColor(color: string) {
  const normalized = color.replace("#", "").trim();

  if (/^[0-9a-f]{6}$/i.test(normalized)) return normalized.toUpperCase();

  return "111827";
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };

    return entities[character] ?? character;
  });
}
