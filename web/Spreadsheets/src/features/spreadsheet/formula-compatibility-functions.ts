import {
  CellError,
  EmptyValue,
  ErrorType,
  FunctionArgumentType,
  FunctionPlugin,
  HyperFormula,
  SimpleRangeValue,
} from "hyperformula";

type FormulaProcedureAst = {
  args: never[];
};
type FormulaInterpreterState = Parameters<FunctionPlugin["evaluateAst"]>[1];
type FormulaInterpreterValue = ReturnType<FunctionPlugin["evaluateAst"]>;

const ESSENCE_FUNCTION_TRANSLATIONS = {
  enGB: {
    CONCAT: "CONCAT",
    CUBEMEMBER: "CUBEMEMBER",
    CUBERANKEDMEMBER: "CUBERANKEDMEMBER",
    CUBESET: "CUBESET",
    CUBESETCOUNT: "CUBESETCOUNT",
    CUBEVALUE: "CUBEVALUE",
    ENCODEURL: "ENCODEURL",
    TEXTJOIN: "TEXTJOIN",
    XMATCH: "XMATCH",
  },
};

let functionsRegistered = false;

export function ensureEssenceFormulaCompatibilityFunctionsRegistered() {
  if (functionsRegistered) {
    return;
  }

  const needsRegistration = ["CONCAT", "ENCODEURL", "TEXTJOIN", "XMATCH"].some(
    (functionId) => !HyperFormula.getFunctionPlugin(functionId),
  ) || ["CUBEMEMBER", "CUBEVALUE"].some(
    (functionId) => !HyperFormula.getFunctionPlugin(functionId),
  );

  if (needsRegistration) {
    HyperFormula.registerFunctionPlugin(
      EssenceFormulaCompatibilityPlugin,
      ESSENCE_FUNCTION_TRANSLATIONS,
    );
  }

  functionsRegistered = true;
}

function isCellError(value: unknown): value is CellError {
  return value instanceof CellError;
}

function flattenArgument(value: unknown): unknown[] {
  if (value instanceof SimpleRangeValue) {
    return value.valuesFromTopLeftCorner();
  }

  return [value];
}

function scalarToText(value: unknown) {
  if (value === EmptyValue) {
    return "";
  }

  if (isCellError(value)) {
    return value;
  }

  const raw = getRawScalarValue(value);

  if (raw === EmptyValue) {
    return "";
  }

  if (typeof raw === "boolean") {
    return raw ? "TRUE" : "FALSE";
  }

  return String(raw);
}

function compareValues(left: unknown, right: unknown) {
  const leftRaw = getRawScalarValue(left);
  const rightRaw = getRawScalarValue(right);

  if (typeof leftRaw === "number" && typeof rightRaw === "number") {
    return leftRaw - rightRaw;
  }

  return String(leftRaw).localeCompare(String(rightRaw), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function wildcardToRegExp(pattern: string) {
  let source = "";

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index] ?? "";

    if (character === "~") {
      const nextCharacter = pattern[index + 1] ?? "";
      source += nextCharacter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      index += 1;
      continue;
    }

    if (character === "*") {
      source += ".*";
      continue;
    }

    if (character === "?") {
      source += ".";
      continue;
    }

    source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return new RegExp(`^${source}$`, "i");
}

function findExactMatchIndex(
  lookupValue: unknown,
  candidates: unknown[],
  direction: 1 | -1,
) {
  const start = direction === 1 ? 0 : candidates.length - 1;
  const end = direction === 1 ? candidates.length : -1;

  for (let index = start; index !== end; index += direction) {
    if (compareValues(lookupValue, candidates[index]) === 0) {
      return index;
    }
  }

  return -1;
}

function findWildcardMatchIndex(
  lookupValue: unknown,
  candidates: unknown[],
  direction: 1 | -1,
) {
  const pattern = wildcardToRegExp(String(getRawScalarValue(lookupValue)));
  const start = direction === 1 ? 0 : candidates.length - 1;
  const end = direction === 1 ? candidates.length : -1;

  for (let index = start; index !== end; index += direction) {
    if (pattern.test(String(getRawScalarValue(candidates[index])))) {
      return index;
    }
  }

  return -1;
}

function findApproximateMatchIndex(
  lookupValue: unknown,
  candidates: unknown[],
  mode: -1 | 1,
) {
  let bestIndex = -1;
  let bestValue: unknown = null;

  candidates.forEach((candidate, index) => {
    const comparison = compareValues(candidate, lookupValue);
    const isCandidate =
      mode === -1 ? comparison <= 0 : comparison >= 0;

    if (!isCandidate) {
      return;
    }

    if (
      bestIndex === -1 ||
      (mode === -1
        ? compareValues(candidate, bestValue) > 0
        : compareValues(candidate, bestValue) < 0)
    ) {
      bestIndex = index;
      bestValue = candidate;
    }
  });

  return bestIndex;
}

function getRawScalarValue(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "val" in value &&
    typeof value.val === "number"
  ) {
    return value.val;
  }

  return value;
}

class EssenceFormulaCompatibilityPlugin extends FunctionPlugin {
  static implementedFunctions = {
    CONCAT: {
      method: "concat",
      parameters: [{ argumentType: FunctionArgumentType.ANY }],
      repeatLastArgs: 1,
    },
    CUBEMEMBER: {
      method: "cubemember",
      parameters: [
        { argumentType: FunctionArgumentType.STRING },
        { argumentType: FunctionArgumentType.ANY },
        { argumentType: FunctionArgumentType.STRING, optionalArg: true },
      ],
    },
    CUBERANKEDMEMBER: {
      method: "cuberankedmember",
      parameters: [
        { argumentType: FunctionArgumentType.STRING },
        { argumentType: FunctionArgumentType.ANY },
        { argumentType: FunctionArgumentType.INTEGER, minValue: 1 },
        { argumentType: FunctionArgumentType.STRING, optionalArg: true },
      ],
    },
    CUBESET: {
      method: "cubeset",
      parameters: [
        { argumentType: FunctionArgumentType.STRING },
        { argumentType: FunctionArgumentType.ANY },
        { argumentType: FunctionArgumentType.STRING, optionalArg: true },
      ],
    },
    CUBESETCOUNT: {
      method: "cubesetcount",
      parameters: [{ argumentType: FunctionArgumentType.ANY }],
    },
    CUBEVALUE: {
      method: "cubevalue",
      parameters: [
        { argumentType: FunctionArgumentType.STRING },
        { argumentType: FunctionArgumentType.ANY },
      ],
      repeatLastArgs: 1,
    },
    ENCODEURL: {
      method: "encodeurl",
      parameters: [{ argumentType: FunctionArgumentType.STRING }],
    },
    TEXTJOIN: {
      method: "textjoin",
      parameters: [
        { argumentType: FunctionArgumentType.STRING },
        { argumentType: FunctionArgumentType.BOOLEAN },
        { argumentType: FunctionArgumentType.ANY },
      ],
      repeatLastArgs: 1,
    },
    XMATCH: {
      method: "xmatch",
      parameters: [
        { argumentType: FunctionArgumentType.ANY },
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.INTEGER, defaultValue: 0 },
        { argumentType: FunctionArgumentType.INTEGER, defaultValue: 1 },
      ],
    },
  };

  concat(
    ast: FormulaProcedureAst,
    state: FormulaInterpreterState,
  ): FormulaInterpreterValue {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CONCAT"),
      (...args: unknown[]) => {
        const values = args.flatMap(flattenArgument);
        let text = "";

        for (const value of values) {
          const cellText = scalarToText(value);

          if (isCellError(cellText)) {
            return cellText;
          }

          text += cellText;
        }

        return text;
      },
    );
  }

  cubemember(ast: FormulaProcedureAst, state: FormulaInterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CUBEMEMBER"),
      (_connection: string, memberExpression: unknown, caption?: string) =>
        caption || scalarToText(memberExpression) || new CellError(ErrorType.NA),
    );
  }

  cuberankedmember(ast: FormulaProcedureAst, state: FormulaInterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CUBERANKEDMEMBER"),
      (
        _connection: string,
        setExpression: unknown,
        _rank: number,
        caption?: string,
      ) => caption || scalarToText(setExpression) || new CellError(ErrorType.NA),
    );
  }

  cubeset(ast: FormulaProcedureAst, state: FormulaInterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CUBESET"),
      (_connection: string, setExpression: unknown, caption?: string) =>
        caption || scalarToText(setExpression) || "",
    );
  }

  cubesetcount(ast: FormulaProcedureAst, state: FormulaInterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CUBESETCOUNT"),
      () => 0,
    );
  }

  cubevalue(ast: FormulaProcedureAst, state: FormulaInterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CUBEVALUE"),
      () => new CellError(ErrorType.NA),
    );
  }

  encodeurl(
    ast: FormulaProcedureAst,
    state: FormulaInterpreterState,
  ): FormulaInterpreterValue {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("ENCODEURL"),
      (value: string) => encodeURIComponent(value),
    );
  }

  textjoin(
    ast: FormulaProcedureAst,
    state: FormulaInterpreterState,
  ): FormulaInterpreterValue {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("TEXTJOIN"),
      (delimiter: string, ignoreEmpty: boolean, ...args: unknown[]) => {
        const parts: string[] = [];

        for (const value of args.flatMap(flattenArgument)) {
          const cellText = scalarToText(value);

          if (isCellError(cellText)) {
            return cellText;
          }

          if (ignoreEmpty && cellText === "") {
            continue;
          }

          parts.push(cellText);
        }

        return parts.join(delimiter);
      },
    );
  }

  xmatch(
    ast: FormulaProcedureAst,
    state: FormulaInterpreterState,
  ): FormulaInterpreterValue {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("XMATCH"),
      (
        lookupValue: unknown,
        lookupArray: SimpleRangeValue,
        matchMode: number,
        searchMode: number,
      ) => {
        const candidates = lookupArray.valuesFromTopLeftCorner();
        const direction = searchMode === -1 || searchMode === -2 ? -1 : 1;
        const index =
          matchMode === 2
            ? findWildcardMatchIndex(lookupValue, candidates, direction)
            : matchMode === -1 || matchMode === 1
              ? findApproximateMatchIndex(lookupValue, candidates, matchMode)
              : findExactMatchIndex(lookupValue, candidates, direction);

        return index >= 0 ? index + 1 : new CellError(ErrorType.NA);
      },
    );
  }
}
