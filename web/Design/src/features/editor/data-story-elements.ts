import { defaultChartData } from "@/features/editor/chart";
import { createChartDataFromTable } from "@/features/editor/chart-data-binding";
import {
  createChartElement,
  createShapeElement,
  createTableElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignElement, TableElement } from "@/features/editor/types";

const sampleStoryCells = [
  "Channel",
  "Revenue",
  "Leads",
  "Conversion",
  "Organic",
  "42000",
  "860",
  "8.4",
  "Email",
  "31000",
  "540",
  "7.1",
  "Paid",
  "52000",
  "920",
  "5.8",
  "Partner",
  "26000",
  "410",
  "6.6",
];

export function createDashboardDataStoryElements(canvasWidth = 1080) {
  const left = 80;
  const top = 72;
  const gap = 18;
  const contentWidth = Math.max(720, Math.min(980, canvasWidth - left * 2));
  const cardWidth = Math.floor((contentWidth - gap * 2) / 3);
  const table = createStoryTable(left, top + 378, contentWidth);

  return [
    createStoryTitle(left, top, contentWidth),
    ...createMetricCards({
      cardWidth,
      gap,
      left,
      table,
      top: top + 82,
    }),
    table,
  ] satisfies DesignElement[];
}

function createStoryTitle(left: number, top: number, width: number) {
  return createTextElement({
    content: "Revenue Data Story",
    x: left,
    y: top,
    width,
    height: 44,
    fontSize: 34,
    fontWeight: 800,
    color: "#0f172a",
  });
}

function createStoryTable(left: number, top: number, width: number) {
  return createTableElement({
    rows: 5,
    columns: 4,
    cells: sampleStoryCells,
    x: left,
    y: top,
    width,
    height: 226,
    fontSize: 14,
    headerFill: "#dbeafe",
    bodyFill: "#ffffff",
    borderColor: "#bfdbfe",
    textColor: "#172554",
    cellPadding: 10,
  });
}

function createMetricCards({
  cardWidth,
  gap,
  left,
  table,
  top,
}: {
  cardWidth: number;
  gap: number;
  left: number;
  table: TableElement;
  top: number;
}) {
  const cardHeight = 270;
  const cards = [
    {
      chartType: "bar" as const,
      label: "Revenue by channel",
      valueColumnIndex: 1,
    },
    {
      chartType: "donut" as const,
      label: "Lead mix",
      valueColumnIndex: 2,
    },
    {
      chartType: "line" as const,
      label: "Conversion rate",
      valueColumnIndex: 3,
    },
  ];

  return cards.flatMap((card, index) => {
    const x = left + index * (cardWidth + gap);
    const chartData = createChartDataFromTable({
      fallbackData: defaultChartData,
      labelColumnIndex: 0,
      table,
      useFilteredRows: true,
      valueColumnIndex: card.valueColumnIndex,
    });

    return [
      createShapeElement({
        shape: "rectangle",
        x,
        y: top,
        width: cardWidth,
        height: cardHeight,
        fill: "#f8fafc",
        stroke: "#dbeafe",
        strokeWidth: 2,
        radius: 8,
      }),
      createTextElement({
        content: card.label,
        x: x + 18,
        y: top + 18,
        width: cardWidth - 36,
        height: 28,
        fontSize: 18,
        fontWeight: 800,
        color: "#172554",
      }),
      createChartElement({
        chartType: card.chartType,
        data: chartData,
        dataSourceTableId: table.id,
        dataSourceLabelColumnIndex: 0,
        dataSourceValueColumnIndex: card.valueColumnIndex,
        dataSourceUseFilteredRows: true,
        x: x + 16,
        y: top + 58,
        width: cardWidth - 32,
        height: cardHeight - 76,
        backgroundColor: "#f8fafc",
        textColor: "#0f172a",
        axisColor: "#93c5fd",
        fontSize: 12,
        strokeWidth: 4,
        innerRadius: 60,
      }),
    ];
  });
}
