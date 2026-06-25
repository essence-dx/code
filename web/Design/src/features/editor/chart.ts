import type {
  ChartDataPoint,
  ChartElement,
  ChartType,
} from "@/features/editor/types";

export const maxChartDataPoints = 8;
export const chartTypeOptions = [
  {
    value: "bar",
    label: "Bar",
  },
  {
    value: "line",
    label: "Line",
  },
  {
    value: "donut",
    label: "Donut",
  },
] satisfies Array<{
  value: ChartType;
  label: string;
}>;

export const defaultChartData = [
  {
    label: "Design",
    value: 48,
    color: "#0ea5e9",
  },
  {
    label: "Assets",
    value: 32,
    color: "#22c55e",
  },
  {
    label: "Print",
    value: 24,
    color: "#f97316",
  },
  {
    label: "Share",
    value: 18,
    color: "#a855f7",
  },
] satisfies ChartDataPoint[];

export type ChartGeometry = {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  plot: {
    x: number;
    y: number;
    width: number;
    height: number;
    bottom: number;
  };
};

export type DonutSegment = ChartDataPoint & {
  path: string;
};

export function normalizeChartData(data: ChartDataPoint[]) {
  const source = data.length ? data : defaultChartData;

  return source.slice(0, maxChartDataPoints).map((item, index) => ({
    label: item.label || `Item ${index + 1}`,
    value: clampChartValue(item.value),
    color:
      item.color || defaultChartData[index % defaultChartData.length].color,
  }));
}

export function clampChartValue(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(999_999, value));
}

export function getChartMaxValue(data: ChartDataPoint[]) {
  return Math.max(1, ...data.map((item) => item.value));
}

export function createChartGeometry(element: ChartElement): ChartGeometry {
  const labelSpace = element.showLabels ? element.fontSize * 2.2 : 12;
  const valueSpace = element.showValues ? element.fontSize * 1.8 : 10;
  const left = element.showAxis ? Math.max(34, element.fontSize * 2.4) : 16;
  const right = 16;
  const top = Math.max(12, valueSpace);
  const bottom = Math.max(14, labelSpace);
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);

  return {
    width,
    height,
    padding: {
      top,
      right,
      bottom,
      left,
    },
    plot: {
      x: left,
      y: top,
      width: Math.max(1, width - left - right),
      height: Math.max(1, height - top - bottom),
      bottom: Math.max(1, height - bottom),
    },
  };
}

export function getLineChartPoints(
  data: ChartDataPoint[],
  geometry: ChartGeometry,
) {
  const maxValue = getChartMaxValue(data);
  const xStep = data.length > 1 ? geometry.plot.width / (data.length - 1) : 0;

  return data.map((item, index) => {
    const x =
      data.length > 1
        ? geometry.plot.x + index * xStep
        : geometry.plot.x + geometry.plot.width / 2;
    const y =
      geometry.plot.bottom - (item.value / maxValue) * geometry.plot.height;

    return {
      ...item,
      x,
      y,
    };
  });
}

export function getDonutSegments(element: ChartElement): DonutSegment[] {
  const data = normalizeChartData(element.data);
  const total = Math.max(
    1,
    data.reduce((sum, item) => sum + item.value, 0),
  );
  const radius = getDonutOuterRadius(element);
  const innerRadius =
    radius * (Math.max(35, Math.min(85, element.innerRadius)) / 100);
  const center = getDonutCenter(element);
  let cursor = -90;

  return data.map((item) => {
    const degrees = (item.value / total) * 360;
    const startAngle = cursor;
    const endAngle = cursor + degrees;

    cursor = endAngle;

    return {
      ...item,
      path: describeDonutSegment({
        centerX: center.x,
        centerY: center.y,
        radius,
        innerRadius,
        startAngle,
        endAngle,
      }),
    };
  });
}

export function getDonutOuterRadius(element: ChartElement) {
  return Math.max(12, Math.min(element.width * 0.24, element.height * 0.36));
}

export function getDonutCenter(element: ChartElement) {
  return {
    x: element.width * 0.34,
    y: element.height / 2,
  };
}

export function getChartTotal(data: ChartDataPoint[]) {
  return data.reduce((sum, item) => sum + clampChartValue(item.value), 0);
}

function describeDonutSegment({
  centerX,
  centerY,
  radius,
  innerRadius,
  startAngle,
  endAngle,
}: {
  centerX: number;
  centerY: number;
  radius: number;
  innerRadius: number;
  startAngle: number;
  endAngle: number;
}) {
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(centerX, centerY, radius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, radius, startAngle);
  const innerStart = polarToCartesian(
    centerX,
    centerY,
    innerRadius,
    startAngle,
  );
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
