import JSZip from "jszip";

import { resolveChartData } from "@/features/editor/chart-data-binding";
import {
  createBlobExportArtifact,
  downloadBlob,
  type ClientExportArtifact,
} from "@/features/editor/export-artifacts";
import { formatFileName } from "@/features/editor/export-design";
import { getTableCellStyle } from "@/features/editor/table-cell-format";
import { createTableView } from "@/features/editor/table-view";
import type { DesignDocument, DesignElement } from "@/features/editor/types";

const wordXmlNamespace =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const relationshipsNamespace =
  'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';

export async function exportDocumentAsDocx(input: {
  document: DesignDocument;
  onArtifact?: (artifact: ClientExportArtifact) => Promise<void> | void;
  projectName: string;
}) {
  const zip = new JSZip();

  zip.file("[Content_Types].xml", createContentTypesXml());
  zip.folder("_rels")?.file(".rels", createRootRelationshipsXml());
  const word = zip.folder("word");
  word?.file("document.xml", createDocumentXml(input.document));
  word?.file("styles.xml", createStylesXml());
  word?.folder("_rels")?.file("document.xml.rels", createDocumentRelationshipsXml());

  const blob = await zip.generateAsync({
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "blob",
  });

  const fileName = `${formatFileName(input.projectName)}.docx`;

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

function createDocumentXml(document: DesignDocument) {
  const pageBlocks = document.pages
    .map((page, pageIndex) => {
      const blocks = [
        createParagraph({
          style: "Heading1",
          text: page.name || `Page ${pageIndex + 1}`,
        }),
        ...page.elements
          .filter((element) => !element.hidden)
          .sort(compareElementsForDocumentFlow)
          .flatMap((element) => createElementBlocks(element, page.elements)),
      ];

      if (pageIndex < document.pages.length - 1) {
        blocks.push(createPageBreak());
      }

      return blocks.join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${wordXmlNamespace}>
  <w:body>
    ${pageBlocks}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function createElementBlocks(
  element: DesignElement,
  pageElements: readonly DesignElement[],
) {
  if (element.type === "text") {
    return element.content
      .split(/\r?\n/)
      .map((line) =>
        createParagraph({
          alignment: element.textAlign,
          color: element.color,
          fontSize: element.fontSize,
          text: line,
        }),
      );
  }

  if (element.type === "document") {
    return [
      createParagraph({
        style: "Heading2",
        text: element.title,
      }),
      ...element.blocks.flatMap((block) => {
        if (block.kind === "page-break") return createPageBreak();

        const blocks = [
          createParagraph({
            style:
              block.kind === "heading"
                ? "Heading1"
                : block.kind === "subheading"
                  ? "Heading2"
                  : undefined,
            text: block.content,
          }),
        ];

        if (block.comment) {
          blocks.push(createParagraph({ text: `Comment: ${block.comment}` }));
        }

        return blocks;
      }),
    ];
  }

  if (element.type === "table") {
    return [createTable(element)];
  }

  if (element.type === "chart") {
    const chartData = resolveChartData(element, pageElements);

    return [
      createParagraph({
        style: "Heading2",
        text: `${formatTitle(element.chartType)} chart`,
      }),
      createSimpleDataTable(
        ["Label", "Value"],
        chartData.map((item) => [item.label, String(item.value)]),
      ),
    ];
  }

  if (element.type === "form") {
    const value =
      element.fieldKind === "checkbox"
        ? element.checked
          ? "Checked"
          : "Unchecked"
        : element.value || element.placeholder;

    return [
      createParagraph({
        style: "Heading2",
        text: element.label || formatTitle(element.fieldKind),
      }),
      createParagraph({
        text: value || "Empty field",
      }),
    ];
  }

  if (element.type === "embed") {
    return [
      createParagraph({
        style: "Heading2",
        text: element.title || "Embedded link",
      }),
      createParagraph({
        text: element.url,
      }),
    ];
  }

  return [];
}

function createTable(element: Extract<DesignElement, { type: "table" }>) {
  const tableView = createTableView(element);
  const rows = tableView.rows.map((row) => {
    const cells = row.cells.map((text, columnIndex) => {
      const cellStyle =
        row.sourceRowIndex !== null
          ? getTableCellStyle(element, row.sourceRowIndex, columnIndex)
          : {};

      return createTableCell(text, {
        alignment: cellStyle.textAlign,
        bold: row.isHeader || (cellStyle.fontWeight ?? 0) >= 700,
        color: cellStyle.textColor,
        fill: cellStyle.fill ?? (row.isHeader ? element.headerFill : element.bodyFill),
      });
    }).join("");

    return `<w:tr>${cells}</w:tr>`;
  }).join("");

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      ${createTableBorders()}
    </w:tblPr>
    ${rows}
  </w:tbl>`;
}

function createSimpleDataTable(headers: string[], rows: string[][]) {
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      ${createTableBorders()}
    </w:tblPr>
    <w:tr>${headers.map((header) => createTableCell(header, { bold: true })).join("")}</w:tr>
    ${rows
      .map(
        (row) =>
          `<w:tr>${row.map((cell) => createTableCell(cell, {})).join("")}</w:tr>`,
      )
      .join("")}
  </w:tbl>`;
}

function createTableCell(
  text: string,
  options: {
    alignment?: "left" | "center" | "right";
    bold?: boolean;
    color?: string;
    fill?: string;
  },
) {
  const shading = options.fill
    ? `<w:shd w:fill="${normalizeHexColor(options.fill)}"/>`
    : "";

  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="2400" w:type="dxa"/>
      ${shading}
    </w:tcPr>
    ${createParagraph({
      alignment: options.alignment,
      bold: options.bold,
      color: options.color,
      text,
    })}
  </w:tc>`;
}

function createParagraph(input: {
  alignment?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
  fontSize?: number;
  style?: "Heading1" | "Heading2";
  text: string;
}) {
  const paragraphStyle = input.style
    ? `<w:pStyle w:val="${input.style}"/>`
    : "";
  const alignment =
    input.alignment && input.alignment !== "left"
      ? `<w:jc w:val="${input.alignment}"/>`
      : "";
  const runProperties = [
    input.bold ? "<w:b/>" : "",
    input.color ? `<w:color w:val="${normalizeHexColor(input.color)}"/>` : "",
    input.fontSize
      ? `<w:sz w:val="${Math.max(14, Math.round(input.fontSize * 2))}"/>`
      : "",
  ].join("");

  return `<w:p>
    <w:pPr>${paragraphStyle}${alignment}</w:pPr>
    <w:r>
      <w:rPr>${runProperties}</w:rPr>
      <w:t xml:space="preserve">${escapeXml(input.text)}</w:t>
    </w:r>
  </w:p>`;
}

function createPageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function createTableBorders() {
  return `<w:tblBorders>
    <w:top w:val="single" w:sz="6" w:space="0" w:color="D4D4D8"/>
    <w:left w:val="single" w:sz="6" w:space="0" w:color="D4D4D8"/>
    <w:bottom w:val="single" w:sz="6" w:space="0" w:color="D4D4D8"/>
    <w:right w:val="single" w:sz="6" w:space="0" w:color="D4D4D8"/>
    <w:insideH w:val="single" w:sz="6" w:space="0" w:color="D4D4D8"/>
    <w:insideV w:val="single" w:sz="6" w:space="0" w:color="D4D4D8"/>
  </w:tblBorders>`;
}

function createContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
}

function createRootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships ${relationshipsNamespace}>
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function createDocumentRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships ${relationshipsNamespace}/>`;
}

function createStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${wordXmlNamespace}>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

function compareElementsForDocumentFlow(
  first: DesignElement,
  second: DesignElement,
) {
  return first.y - second.y || first.x - second.x;
}

function normalizeHexColor(color: string) {
  const normalized = color.replace("#", "").trim();

  if (/^[0-9a-f]{6}$/i.test(normalized)) return normalized.toUpperCase();

  return "111827";
}

function formatTitle(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
