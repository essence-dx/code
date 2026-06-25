import { rewriteAdvancedCompatibilityFormulas } from "@/features/spreadsheet/formula-advanced-compatibility";

const identifierCharacterPattern = /[A-Za-z0-9_.]/;

export function normalizeExcelFormulaCompatibility(formula: string) {
  if (!formula.startsWith("=")) {
    return formula;
  }

  const advancedFormula = rewriteAdvancedCompatibilityFormulas(formula);
  let normalized = "";
  let inString = false;
  let inSheetName = false;
  let bracketDepth = 0;

  for (let index = 0; index < advancedFormula.length; index += 1) {
    const character = advancedFormula[index] ?? "";
    const nextCharacter = advancedFormula[index + 1] ?? "";

    if (inString) {
      normalized += character;

      if (character === '"' && nextCharacter === '"') {
        normalized += nextCharacter;
        index += 1;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (inSheetName) {
      normalized += character;

      if (character === "'" && nextCharacter === "'") {
        normalized += nextCharacter;
        index += 1;
      } else if (character === "'") {
        inSheetName = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      normalized += character;
      continue;
    }

    if (character === "'") {
      inSheetName = true;
      normalized += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      normalized += character;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      normalized += character;
      continue;
    }

    if (
      bracketDepth === 0 &&
      /[A-Za-z]/.test(character) &&
      !identifierCharacterPattern.test(advancedFormula[index - 1] ?? "")
    ) {
      const tokenMatch = /^[A-Za-z][A-Za-z0-9_.]*/.exec(
        advancedFormula.slice(index),
      );
      const token = tokenMatch?.[0] ?? "";
      const upperToken = token.toUpperCase();
      const nextNonSpace = advancedFormula
        .slice(index + token.length)
        .trimStart()[0];

      if (
        (upperToken === "TRUE" || upperToken === "FALSE") &&
        nextNonSpace !== "("
      ) {
        normalized += `${upperToken}()`;
        index += token.length - 1;
        continue;
      }
    }

    normalized += character;
  }

  return normalized;
}
