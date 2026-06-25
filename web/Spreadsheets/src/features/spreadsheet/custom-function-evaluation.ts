import { isFormulaBlockedBySecurityPolicy } from "@/features/workbooks/formula-security";
import type { WorkbookCustomFunction } from "@/features/workbooks/types";

const MAX_CUSTOM_FUNCTION_EXPANSION_DEPTH = 4;
const MAX_CUSTOM_FUNCTION_ARGS = 24;
const CUSTOM_FUNCTION_ERROR_BODY = "NA()";

const blockedCustomFunctionCalls = new Set([
  "CALL",
  "CELL",
  "FILTERXML",
  "HYPERLINK",
  "IMPORTDATA",
  "INDIRECT",
  "INFO",
  "NOW",
  "OFFSET",
  "RAND",
  "RANDBETWEEN",
  "TODAY",
  "WEBSERVICE",
]);

function normalizeFunctionName(value: string) {
  return value.trim().toUpperCase();
}

function expressionBody(expression: string) {
  return expression.trim().replace(/^=/, "").trim();
}

function stripFormulaStrings(formula: string) {
  return formula.replace(/"(?:""|[^"])*"/g, " ");
}

function isIdentifierStart(character: string) {
  return /[A-Z_]/i.test(character);
}

function isIdentifierPart(character: string) {
  return /[A-Z0-9_.]/i.test(character);
}

function readIdentifier(source: string, startIndex: number) {
  let index = startIndex;

  while (index < source.length && isIdentifierPart(source[index] ?? "")) {
    index += 1;
  }

  return {
    endIndex: index,
    name: source.slice(startIndex, index),
  };
}

function skipWhitespace(source: string, startIndex: number) {
  let index = startIndex;

  while (/\s/.test(source[index] ?? "")) {
    index += 1;
  }

  return index;
}

function readQuotedString(source: string, startIndex: number) {
  let index = startIndex + 1;

  while (index < source.length) {
    if (source[index] === '"') {
      if (source[index + 1] === '"') {
        index += 2;
        continue;
      }

      return index + 1;
    }

    index += 1;
  }

  return source.length;
}

function findClosingParenthesis(source: string, openIndex: number) {
  let depth = 0;

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index] ?? "";

    if (character === '"') {
      index = readQuotedString(source, index) - 1;
      continue;
    }

    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function splitFormulaArguments(source: string) {
  const args: string[] = [];
  let depth = 0;
  let startIndex = 0;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";

    if (character === '"') {
      index = readQuotedString(source, index) - 1;
      continue;
    }

    if (character === "(") {
      depth += 1;
      continue;
    }

    if (character === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (character === "," && depth === 0) {
      args.push(source.slice(startIndex, index).trim());
      startIndex = index + 1;
    }
  }

  const lastArgument = source.slice(startIndex).trim();

  if (lastArgument || source.trim()) {
    args.push(lastArgument);
  }

  return args.slice(0, MAX_CUSTOM_FUNCTION_ARGS);
}

function hasDirectCellReference(expression: string) {
  const stripped = stripFormulaStrings(expression).replace(
    /(^|[^A-Z0-9_.])ARG[1-9]\d*([^A-Z0-9_.]|$)/gi,
    "$1 $2",
  );

  return /(^|[^A-Z0-9_.])(?:'[^']+'!)?\$?[A-Z]{1,3}\$?\d+([^A-Z0-9_.]|$)/i.test(
    stripped,
  );
}

function hasBlockedFunctionCall(
  expression: string,
  customFunctionNames: Set<string>,
) {
  const stripped = stripFormulaStrings(expression);

  for (let index = 0; index < stripped.length; index += 1) {
    const character = stripped[index] ?? "";

    if (!isIdentifierStart(character)) {
      continue;
    }

    const identifier = readIdentifier(stripped, index);
    const openIndex = skipWhitespace(stripped, identifier.endIndex);
    const name = normalizeFunctionName(identifier.name);

    if (
      stripped[openIndex] === "(" &&
      (blockedCustomFunctionCalls.has(name) || customFunctionNames.has(name))
    ) {
      return true;
    }

    index = identifier.endIndex - 1;
  }

  return false;
}

function getSafeCustomFunctionBody(
  customFunction: WorkbookCustomFunction,
  customFunctionNames: Set<string>,
) {
  if (!customFunction.enabled) {
    return null;
  }

  const formula = customFunction.expression.trim().startsWith("=")
    ? customFunction.expression.trim()
    : `=${customFunction.expression.trim()}`;
  const body = expressionBody(formula);

  if (
    !body ||
    body.length > 1200 ||
    isFormulaBlockedBySecurityPolicy(formula) ||
    hasDirectCellReference(body) ||
    hasBlockedFunctionCall(body, customFunctionNames)
  ) {
    return null;
  }

  return body;
}

function replaceArgumentPlaceholders(source: string, args: string[]) {
  let output = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";

    if (character === '"') {
      const endIndex = readQuotedString(source, index);

      output += source.slice(index, endIndex);
      index = endIndex - 1;
      continue;
    }

    if (!isIdentifierStart(character)) {
      output += character;
      continue;
    }

    const identifier = readIdentifier(source, index);
    const match = /^ARG([1-9]\d*)$/i.exec(identifier.name);

    if (!match) {
      output += identifier.name;
      index = identifier.endIndex - 1;
      continue;
    }

    const argumentIndex = Number(match[1]) - 1;
    const argument = args[argumentIndex]?.trim() || '""';

    output += `(${argument})`;
    index = identifier.endIndex - 1;
  }

  return output;
}

function getCustomFunctionMap(customFunctions: WorkbookCustomFunction[]) {
  const entries = customFunctions
    .filter((customFunction) => customFunction.enabled)
    .map((customFunction) => [
      normalizeFunctionName(customFunction.name),
      customFunction,
    ] as const);

  return new Map(entries);
}

function rewriteCustomFunctionBody({
  body,
  customFunctionMap,
  customFunctionNames,
  depth,
}: {
  body: string;
  customFunctionMap: Map<string, WorkbookCustomFunction>;
  customFunctionNames: Set<string>;
  depth: number;
}) {
  if (depth > MAX_CUSTOM_FUNCTION_EXPANSION_DEPTH) {
    return CUSTOM_FUNCTION_ERROR_BODY;
  }

  let output = "";

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index] ?? "";

    if (character === '"') {
      const endIndex = readQuotedString(body, index);

      output += body.slice(index, endIndex);
      index = endIndex - 1;
      continue;
    }

    if (!isIdentifierStart(character)) {
      output += character;
      continue;
    }

    const identifier = readIdentifier(body, index);
    const openIndex = skipWhitespace(body, identifier.endIndex);
    const functionName = normalizeFunctionName(identifier.name);
    const customFunction = customFunctionMap.get(functionName);

    if (!customFunction || body[openIndex] !== "(") {
      output += identifier.name;
      index = identifier.endIndex - 1;
      continue;
    }

    const closeIndex = findClosingParenthesis(body, openIndex);

    if (closeIndex < 0) {
      output += CUSTOM_FUNCTION_ERROR_BODY;
      index = body.length;
      continue;
    }

    const args = splitFormulaArguments(body.slice(openIndex + 1, closeIndex));
    const customBody = getSafeCustomFunctionBody(
      customFunction,
      customFunctionNames,
    );

    if (!customBody) {
      output += CUSTOM_FUNCTION_ERROR_BODY;
      index = closeIndex;
      continue;
    }

    const expanded = replaceArgumentPlaceholders(customBody, args);

    output += `(${rewriteCustomFunctionBody({
      body: expanded,
      customFunctionMap,
      customFunctionNames,
      depth: depth + 1,
    })})`;
    index = closeIndex;
  }

  return output;
}

export function rewriteWorkbookCustomFunctions({
  customFunctions = [],
  formula,
}: {
  customFunctions?: WorkbookCustomFunction[];
  formula: string;
}) {
  if (!formula.trim().startsWith("=") || customFunctions.length === 0) {
    return formula;
  }

  const customFunctionMap = getCustomFunctionMap(customFunctions);

  if (customFunctionMap.size === 0) {
    return formula;
  }

  const customFunctionNames = new Set(customFunctionMap.keys());
  const body = expressionBody(formula);

  return `=${rewriteCustomFunctionBody({
    body,
    customFunctionMap,
    customFunctionNames,
    depth: 0,
  })}`;
}

export function getEnabledWorkbookCustomFunctionNames(
  customFunctions: WorkbookCustomFunction[] | undefined,
) {
  return Array.from(getCustomFunctionMap(customFunctions ?? []).keys()).sort();
}
