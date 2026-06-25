import type { WorkbookNativeChartMetadata } from "@/features/workbooks/types";

const chartTypePatterns: Array<[RegExp, string]> = [
  [/<c:bar3DChart\b/, "bar3D"],
  [/<c:line3DChart\b/, "line3D"],
  [/<c:pie3DChart\b/, "pie3D"],
  [/<c:area3DChart\b/, "area3D"],
  [/<c:surface3DChart\b/, "surface3D"],
  [/<c:barChart\b/, "bar"],
  [/<c:lineChart\b/, "line"],
  [/<c:pieChart\b/, "pie"],
  [/<c:areaChart\b/, "area"],
  [/<c:scatterChart\b/, "scatter"],
  [/<c:bubbleChart\b/, "bubble"],
  [/<c:surfaceChart\b/, "surface"],
];

export function readNativeChartMetadata(
  xml: string,
): WorkbookNativeChartMetadata | undefined {
  if (!xml.trim()) {
    return undefined;
  }

  const chartType = chartTypePatterns.find(([pattern]) => pattern.test(xml))?.[1];
  const threeDimensional = readThreeDimensionalChartMetadata(xml, chartType);
  const hasDataTable = /<c:dTable\b/.test(xml);
  const metadata: WorkbookNativeChartMetadata = {
    ...(chartType ? { chartType } : {}),
    ...(hasDataTable ? { hasDataTable: true } : {}),
    ...(threeDimensional ? { threeDimensional } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function readThreeDimensionalChartMetadata(
  xml: string,
  chartType: string | undefined,
): WorkbookNativeChartMetadata["threeDimensional"] | undefined {
  const view3D = /<c:view3D\b[\s\S]*?<\/c:view3D>/.exec(xml)?.[0] ?? "";
  const isThreeDimensional =
    Boolean(view3D) || Boolean(chartType && chartType.endsWith("3D"));

  if (!isThreeDimensional) {
    return undefined;
  }

  const metadata: NonNullable<WorkbookNativeChartMetadata["threeDimensional"]> = {
    enabled: true,
    ...definedNumber("depthPercent", readVal(view3D, "depthPercent")),
    ...definedNumber("perspective", readVal(view3D, "perspective")),
    ...definedBoolean("rightAngleAxes", readBooleanVal(view3D, "rAngAx")),
    ...definedNumber("rotationX", readVal(view3D, "rotX")),
    ...definedNumber("rotationY", readVal(view3D, "rotY")),
  };

  return metadata;
}

function readVal(xml: string, name: string) {
  const value = Number(
    new RegExp(`<c:${name}\\b[^>]*val="(-?\\d+)"`).exec(xml)?.[1],
  );

  return Number.isFinite(value) ? value : undefined;
}

function readBooleanVal(xml: string, name: string) {
  const value = new RegExp(`<c:${name}\\b[^>]*val="(0|1|true|false)"`, "i").exec(
    xml,
  )?.[1];

  if (!value) {
    return undefined;
  }

  return value === "1" || value.toLowerCase() === "true";
}

function definedNumber(key: string, value: number | undefined) {
  return value === undefined ? {} : { [key]: value };
}

function definedBoolean(key: string, value: boolean | undefined) {
  return value === undefined ? {} : { [key]: value };
}
