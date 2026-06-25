"use client";

import { Badge } from "@/components/ui/badge";
import type { WorkbookStatistics } from "@/features/spreadsheet/workbook-statistics";

type StatisticItem = {
  label: string;
  value: number | string;
};

type StatisticSection = {
  title: string;
  items: StatisticItem[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function renderValue(value: StatisticItem["value"]) {
  return typeof value === "number" ? formatCount(value) : value;
}

export function WorkbookStatisticsPanel({
  statistics,
}: {
  statistics: WorkbookStatistics;
}) {
  const sections: StatisticSection[] = [
    {
      title: "Structure",
      items: [
        { label: "Sheets", value: statistics.sheetCount },
        { label: "Rows", value: statistics.rowCapacity },
        { label: "Columns", value: statistics.columnCapacity },
        { label: "Cell slots", value: statistics.cellCapacity },
        { label: "Hidden rows", value: statistics.hiddenRowCount },
        { label: "Hidden columns", value: statistics.hiddenColumnCount },
        { label: "Outline groups", value: statistics.outlineGroupCount },
        { label: "Merged ranges", value: statistics.mergedCellCount },
      ],
    },
    {
      title: "Cells",
      items: [
        { label: "Populated cells", value: statistics.populatedCellCount },
        { label: "Formula cells", value: statistics.formulaCellCount },
        { label: "Styled cells", value: statistics.styledCellCount },
      ],
    },
    {
      title: "Workbook objects",
      items: [
        { label: "Tables", value: statistics.tableCount },
        { label: "Table slicers", value: statistics.tableSlicerCount },
        { label: "Timelines", value: statistics.tableTimelineCount },
        { label: "PivotTables", value: statistics.pivotTableCount },
        { label: "Charts", value: statistics.chartCount },
        { label: "Chart data tables", value: statistics.chartDataTableCount },
        { label: "3D chart metadata", value: statistics.chart3DMetadataCount },
        { label: "Sparklines", value: statistics.sparklineCount },
        { label: "Objects", value: statistics.insertedObjectCount },
        { label: "Images", value: statistics.insertedImageCount },
        { label: "Native Excel objects", value: statistics.nativeObjectCount },
        { label: "Theme", value: statistics.themeName },
        { label: "Cell styles", value: statistics.managedCellStyleCount },
        { label: "Named ranges", value: statistics.namedRangeCount },
        { label: "Comments", value: statistics.noteCount },
        { label: "Links", value: statistics.linkCount },
      ],
    },
    {
      title: "Rules and review",
      items: [
        {
          label: "Conditional formats",
          value: statistics.conditionalFormatCount,
        },
        { label: "Data validations", value: statistics.dataValidationCount },
        { label: "Filters", value: statistics.filterCount },
        { label: "Filter presets", value: statistics.filterPresetCount },
        { label: "Print areas", value: statistics.printAreaCount },
        { label: "Page breaks", value: statistics.pageBreakCount },
      ],
    },
    {
      title: "Governance",
      items: [
        { label: "Protected sheets", value: statistics.protectedSheetCount },
        {
          label: "Workbook protection",
          value: statistics.workbookProtected ? "On" : "Off",
        },
        { label: "Custom views", value: statistics.customViewCount },
        { label: "Version snapshots", value: statistics.versionCount },
        { label: "Restores", value: statistics.restoreCount },
      ],
    },
  ];

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Workbook statistics</h2>
        <Badge variant="secondary" className="font-mono">
          {formatCount(statistics.populatedCellCount)}
        </Badge>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              {section.title}
            </h3>
            <dl className="grid grid-cols-2 gap-2">
              {section.items.map((item) => (
                <div
                  key={`${section.title}-${item.label}`}
                  className="rounded-md border bg-background/70 p-2"
                >
                  <dt className="truncate text-xs text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="truncate font-mono text-sm font-medium">
                    {renderValue(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
