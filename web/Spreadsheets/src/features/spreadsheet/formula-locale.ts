export type FormulaLocaleSettings = {
  argumentSeparator: "," | ";";
  decimalSeparator: "." | ",";
  functionLanguage: FormulaFunctionLanguage;
};

export type FormulaFunctionLanguage = "en-US" | "de-DE" | "fr-FR" | "es-ES";

type FormulaLocaleInput =
  | FormulaLocaleSettings
  | Intl.LocalesArgument
  | undefined;

const canonicalSettings: FormulaLocaleSettings = {
  argumentSeparator: ",",
  decimalSeparator: ".",
  functionLanguage: "en-US",
};

const translatedFunctionNames: Record<
  string,
  Partial<Record<FormulaFunctionLanguage, string>>
> = {
  AND: { "de-DE": "UND", "es-ES": "Y", "fr-FR": "ET" },
  AVERAGE: { "de-DE": "MITTELWERT", "es-ES": "PROMEDIO", "fr-FR": "MOYENNE" },
  COUNT: { "de-DE": "ANZAHL", "es-ES": "CONTAR", "fr-FR": "NB" },
  DATE: { "de-DE": "DATUM", "es-ES": "FECHA", "fr-FR": "DATE" },
  DAY: { "de-DE": "TAG", "es-ES": "DIA", "fr-FR": "JOUR" },
  IF: { "de-DE": "WENN", "es-ES": "SI", "fr-FR": "SI" },
  MONTH: { "de-DE": "MONAT", "es-ES": "MES", "fr-FR": "MOIS" },
  NOW: { "de-DE": "JETZT", "es-ES": "AHORA", "fr-FR": "MAINTENANT" },
  OR: { "de-DE": "ODER", "es-ES": "O", "fr-FR": "OU" },
  SUM: { "de-DE": "SUMME", "es-ES": "SUMA", "fr-FR": "SOMME" },
  TODAY: { "de-DE": "HEUTE", "es-ES": "HOY", "fr-FR": "AUJOURDHUI" },
  VLOOKUP: { "de-DE": "SVERWEIS", "es-ES": "BUSCARV", "fr-FR": "RECHERCHEV" },
  XLOOKUP: { "de-DE": "XVERWEIS", "es-ES": "BUSCARX", "fr-FR": "RECHERCHEX" },
  YEAR: { "de-DE": "JAHR", "es-ES": "AÑO", "fr-FR": "ANNEE" },
};

const canonicalFunctionByTranslation = new Map(
  Object.entries(translatedFunctionNames).flatMap(([canonicalName, translations]) =>
    Object.values(translations).map((translation) => [
      translation.toUpperCase(),
      canonicalName,
    ]),
  ),
);

export function getFormulaLocaleSettings(
  locale?: Intl.LocalesArgument,
): FormulaLocaleSettings {
  const decimalSeparator =
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value === ","
      ? ","
      : ".";

  return {
    argumentSeparator: decimalSeparator === "," ? ";" : ",",
    decimalSeparator,
    functionLanguage: getFormulaFunctionLanguage(locale),
  };
}

export function canonicalizeFormulaFunctionName(
  name: string,
  language: FormulaFunctionLanguage,
) {
  if (language === "en-US") {
    return name.toUpperCase();
  }

  return canonicalFunctionByTranslation.get(name.toUpperCase()) ?? name.toUpperCase();
}

export function localizeFormulaFunctionName(
  name: string,
  language: FormulaFunctionLanguage,
) {
  if (language === "en-US") {
    return name.toUpperCase();
  }

  return translatedFunctionNames[name.toUpperCase()]?.[language] ?? name.toUpperCase();
}

export function canonicalizeFormulaInput(
  value: string,
  locale?: FormulaLocaleInput,
) {
  if (!isFormula(value)) {
    return value;
  }

  const settings = resolveFormulaLocaleSettings(locale);

  return transformFormula(value, {
    decimalSeparator: settings.decimalSeparator,
    functionLanguage: settings.functionLanguage,
    mode: "canonicalize",
  });
}

export function localizeFormulaForDisplay(
  value: string,
  locale?: FormulaLocaleInput,
) {
  if (!isFormula(value)) {
    return value;
  }

  const settings = resolveFormulaLocaleSettings(locale);

  if (
    settings.argumentSeparator === canonicalSettings.argumentSeparator &&
    settings.decimalSeparator === canonicalSettings.decimalSeparator
  ) {
    return value;
  }

  return transformFormula(value, {
    decimalSeparator: settings.decimalSeparator,
    functionLanguage: settings.functionLanguage,
    mode: "localize",
  });
}

export function localizeFormulaSignature(
  signature: string,
  locale?: FormulaLocaleInput,
) {
  return localizeFormulaForDisplay(`=${signature}`, locale).slice(1);
}

function isFormula(value: string) {
  return value.startsWith("=");
}

function resolveFormulaLocaleSettings(
  locale?: FormulaLocaleInput,
): FormulaLocaleSettings {
  if (
    locale &&
    typeof locale === "object" &&
    "argumentSeparator" in locale &&
    "decimalSeparator" in locale
  ) {
    return {
      argumentSeparator: locale.argumentSeparator,
      decimalSeparator: locale.decimalSeparator,
      functionLanguage:
        "functionLanguage" in locale ? locale.functionLanguage : "en-US",
    };
  }

  return getFormulaLocaleSettings(locale as Intl.LocalesArgument | undefined);
}

function getFormulaFunctionLanguage(
  locale?: Intl.LocalesArgument,
): FormulaFunctionLanguage {
  const languageTag = Array.isArray(locale)
    ? locale[0]
    : typeof locale === "string"
      ? locale
      : undefined;

  if (languageTag?.toLowerCase().startsWith("de")) {
    return "de-DE";
  }

  if (languageTag?.toLowerCase().startsWith("fr")) {
    return "fr-FR";
  }

  if (languageTag?.toLowerCase().startsWith("es")) {
    return "es-ES";
  }

  return "en-US";
}

function transformFormula(
  formula: string,
  {
    decimalSeparator,
    functionLanguage,
    mode,
  }: {
    decimalSeparator: "." | ",";
    functionLanguage: FormulaFunctionLanguage;
    mode: "canonicalize" | "localize";
  },
) {
  const hasLocalizedArgumentSeparators = hasTransformableCharacter(formula, ";");
  let transformed = "";
  let bracketDepth = 0;
  let parenDepth = 0;
  let inString = false;
  let inSheetName = false;

  for (let index = 0; index < formula.length; index += 1) {
    const character = formula[index];
    const previousCharacter = formula[index - 1] ?? "";
    const nextCharacter = formula[index + 1] ?? "";

    if (inString) {
      transformed += character;

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (inSheetName) {
      transformed += character;

      if (character === "'" && nextCharacter === "'") {
        transformed += nextCharacter;
        index += 1;
        continue;
      }

      if (character === "'") {
        inSheetName = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      transformed += character;
      continue;
    }

    if (character === "'") {
      inSheetName = true;
      transformed += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      transformed += character;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      transformed += character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      transformed += character;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      transformed += character;
      continue;
    }

    if (bracketDepth > 0) {
      transformed += character;
      continue;
    }

    if (isFormulaNameStart(character)) {
      const tokenEndIndex = readFormulaNameEnd(formula, index);
      const token = formula.slice(index, tokenEndIndex);
      const nextIndex = skipSpaces(formula, tokenEndIndex);

      if (formula[nextIndex] === "(") {
        transformed +=
          mode === "canonicalize"
            ? canonicalizeFormulaFunctionName(token, functionLanguage)
            : localizeFormulaFunctionName(token, functionLanguage);
        index = tokenEndIndex - 1;
        continue;
      }
    }

    if (mode === "canonicalize") {
      if (
        (decimalSeparator === "," || hasLocalizedArgumentSeparators) &&
        character === "," &&
        isDigit(previousCharacter) &&
        isDigit(nextCharacter) &&
        (hasLocalizedArgumentSeparators || parenDepth === 0)
      ) {
        transformed += ".";
        continue;
      }

      transformed += character === ";" ? "," : character;
      continue;
    }

    if (
      decimalSeparator === "," &&
      character === "." &&
      isDigit(previousCharacter) &&
      isDigit(nextCharacter)
    ) {
      transformed += ",";
      continue;
    }

    transformed += character === "," ? ";" : character;
  }

  return transformed;
}

function hasTransformableCharacter(formula: string, target: string) {
  let bracketDepth = 0;
  let inString = false;
  let inSheetName = false;

  for (let index = 0; index < formula.length; index += 1) {
    const character = formula[index];
    const nextCharacter = formula[index + 1] ?? "";

    if (inString) {
      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (inSheetName) {
      if (character === "'" && nextCharacter === "'") {
        index += 1;
        continue;
      }

      if (character === "'") {
        inSheetName = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "'") {
      inSheetName = true;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (bracketDepth === 0 && character === target) {
      return true;
    }
  }

  return false;
}

function isDigit(value: string) {
  return /\d/.test(value);
}

function isFormulaNameStart(value: string) {
  return /[\p{L}_]/u.test(value);
}

function isFormulaNameCharacter(value: string) {
  return /[\p{L}\p{N}_.]/u.test(value);
}

function readFormulaNameEnd(formula: string, startIndex: number) {
  let index = startIndex;

  while (index < formula.length && isFormulaNameCharacter(formula[index] ?? "")) {
    index += 1;
  }

  return index;
}

function skipSpaces(formula: string, startIndex: number) {
  let index = startIndex;

  while (formula[index] === " ") {
    index += 1;
  }

  return index;
}
