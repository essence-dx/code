export function parseComparableNumber(value: string) {
  const normalized = value.replace(/[$,%\s]/g, "");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}
