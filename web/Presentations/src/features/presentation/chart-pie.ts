import type { ChartDatum } from "./types"

export type PieSlice = {
  datum: ChartDatum
  index: number
  percent: number
  startAngle: number
  endAngle: number
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

export function pieSlices(data: ChartDatum[]): PieSlice[] {
  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0)
  const fallbackWeight = data.length ? 1 / data.length : 0
  let cursor = 0

  return data.map((datum, index) => {
    const percent = total > 0 ? Math.max(0, datum.value) / total : fallbackWeight
    const startAngle = cursor * 360
    cursor += percent

    return {
      datum,
      index,
      percent,
      startAngle,
      endAngle: cursor * 360,
    }
  })
}

export function pieSlicePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarPoint(cx, cy, radius, endAngle)
  const end = polarPoint(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ")
}

export function pieLabelPoint(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  return polarPoint(cx, cy, radius, startAngle + (endAngle - startAngle) / 2)
}
