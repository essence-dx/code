export function parseSolverFormNumber(value: string) {
  const numericValue = Number(value.trim().replace(/[$,\s]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function createSolverRowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
