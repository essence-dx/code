export const FORMULA_SECURITY_BLOCKED_RESULT = "#BLOCKED!";

const riskyFormulaPattern =
  /\b(?:CALL|DDE|HYPERLINK|IMPORTDATA|IMPORTFEED|IMPORTHTML|IMPORTRANGE|IMPORTXML|REGISTER\.ID|RTD|WEBSERVICE)\s*\(|\[[^\]]+\.(?:csv|ods|xls|xlsx|xlsm|xlsb)[^\]]*\]|(?:data|file|ftp|javascript|vbscript):/i;

function stripFormulaStringLiterals(value: string) {
  return value.replace(/"(?:""|[^"])*"/g, " ");
}

export function hasFormulaSecurityRisk(value: string) {
  return riskyFormulaPattern.test(stripFormulaStringLiterals(value));
}

export function isFormulaBlockedBySecurityPolicy(value: string) {
  return value.trimStart().startsWith("=") && hasFormulaSecurityRisk(value);
}

export function neutralizeFormulaForStorage(value: string) {
  return isFormulaBlockedBySecurityPolicy(value) ? `'${value}` : value;
}
