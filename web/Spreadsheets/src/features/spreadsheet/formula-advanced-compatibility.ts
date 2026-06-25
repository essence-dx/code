const identifierCharacterPattern = /[A-Za-z0-9_.]/;
const MAX_COMPATIBILITY_REWRITE_PASSES = 6;

export function rewriteAdvancedCompatibilityFormulas(formula: string) {
  let expression = formula.slice(1);

  for (let pass = 0; pass < MAX_COMPATIBILITY_REWRITE_PASSES; pass += 1) {
    const nextExpression = rewriteInlineLambdaCalls(rewriteLetCalls(expression));

    if (nextExpression === expression) {
      break;
    }

    expression = nextExpression;
  }

  return `=${expression}`;
}

function rewriteLetCalls(expression: string): string {
  return rewriteFormulaFunctionCalls(expression, "LET", (args) => {
    if (args.length < 3 || args.length % 2 === 0) {
      return null;
    }

    const bindings = new Map<string, string>();

    for (let index = 0; index < args.length - 1; index += 2) {
      const name = args[index]?.trim() ?? "";
      const value = args[index + 1]?.trim() ?? "";

      if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) || !value) {
        return null;
      }

      bindings.set(name.toUpperCase(), rewriteInlineLambdaCalls(value));
    }

    return substituteFormulaIdentifiers(args[args.length - 1] ?? "", bindings);
  });
}

function rewriteInlineLambdaCalls(expression: string): string {
  let rewritten = "";

  for (let index = 0; index < expression.length; index += 1) {
    const lambdaIndex = findFunctionCallAt(expression, index, "LAMBDA");

    if (!lambdaIndex) {
      rewritten += expression[index] ?? "";
      continue;
    }

    const afterLambda = skipSpaces(expression, lambdaIndex.endIndex + 1);

    if (expression[afterLambda] !== "(") {
      rewritten += expression.slice(index, lambdaIndex.endIndex + 1);
      index = lambdaIndex.endIndex;
      continue;
    }

    const callEndIndex = findClosingParen(expression, afterLambda);

    if (callEndIndex === null) {
      rewritten += expression[index] ?? "";
      continue;
    }

    const lambdaArgs = splitFormulaArgs(lambdaIndex.inner);
    const callArgs = splitFormulaArgs(
      expression.slice(afterLambda + 1, callEndIndex),
    );

    if (lambdaArgs.length < 2 || callArgs.length !== lambdaArgs.length - 1) {
      rewritten += expression.slice(index, callEndIndex + 1);
      index = callEndIndex;
      continue;
    }

    const bindings = new Map<string, string>();
    let hasInvalidParameter = false;

    for (let argIndex = 0; argIndex < lambdaArgs.length - 1; argIndex += 1) {
      const name = lambdaArgs[argIndex]?.trim() ?? "";

      if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name)) {
        hasInvalidParameter = true;
        break;
      }

      bindings.set(name.toUpperCase(), callArgs[argIndex]?.trim() ?? "");
    }

    if (hasInvalidParameter) {
      rewritten += expression.slice(index, callEndIndex + 1);
      index = callEndIndex;
      continue;
    }

    rewritten += substituteFormulaIdentifiers(
      lambdaArgs[lambdaArgs.length - 1] ?? "",
      bindings,
    );
    index = callEndIndex;
  }

  return rewritten;
}

function rewriteFormulaFunctionCalls(
  expression: string,
  functionName: string,
  rewrite: (args: string[]) => string | null,
) {
  let rewritten = "";

  for (let index = 0; index < expression.length; index += 1) {
    const call = findFunctionCallAt(expression, index, functionName);

    if (!call) {
      rewritten += expression[index] ?? "";
      continue;
    }

    const replacement = rewrite(splitFormulaArgs(call.inner));

    if (replacement === null) {
      rewritten += expression.slice(index, call.endIndex + 1);
    } else {
      rewritten += replacement;
    }

    index = call.endIndex;
  }

  return rewritten;
}

function findFunctionCallAt(
  expression: string,
  index: number,
  functionName: string,
) {
  if (!startsWithFunctionName(expression, index, functionName)) {
    return null;
  }

  const openParenIndex = skipSpaces(expression, index + functionName.length);

  if (expression[openParenIndex] !== "(") {
    return null;
  }

  const endIndex = findClosingParen(expression, openParenIndex);

  if (endIndex === null) {
    return null;
  }

  return {
    endIndex,
    inner: expression.slice(openParenIndex + 1, endIndex),
  };
}

function startsWithFunctionName(
  expression: string,
  index: number,
  functionName: string,
) {
  const token = expression.slice(index, index + functionName.length);

  return (
    token.toUpperCase() === functionName &&
    !identifierCharacterPattern.test(expression[index - 1] ?? "") &&
    !identifierCharacterPattern.test(expression[index + functionName.length] ?? "")
  );
}

function findClosingParen(expression: string, openParenIndex: number) {
  let depth = 0;
  let inString = false;
  let inSheetName = false;
  let bracketDepth = 0;

  for (let index = openParenIndex; index < expression.length; index += 1) {
    const character = expression[index] ?? "";
    const nextCharacter = expression[index + 1] ?? "";

    if (inString) {
      if (character === '"' && nextCharacter === '"') {
        index += 1;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (inSheetName) {
      if (character === "'" && nextCharacter === "'") {
        index += 1;
      } else if (character === "'") {
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

    if (bracketDepth > 0) {
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

  return null;
}

function splitFormulaArgs(input: string) {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let bracketDepth = 0;
  let inString = false;
  let inSheetName = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index] ?? "";
    const nextCharacter = input[index + 1] ?? "";

    if (inString) {
      current += character;

      if (character === '"' && nextCharacter === '"') {
        current += nextCharacter;
        index += 1;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (inSheetName) {
      current += character;

      if (character === "'" && nextCharacter === "'") {
        current += nextCharacter;
        index += 1;
      } else if (character === "'") {
        inSheetName = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      current += character;
      continue;
    }

    if (character === "'") {
      inSheetName = true;
      current += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    if (bracketDepth === 0) {
      if (character === "(") {
        depth += 1;
      }

      if (character === ")") {
        depth = Math.max(0, depth - 1);
      }

      if (character === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }

    current += character;
  }

  args.push(current.trim());
  return args;
}

function substituteFormulaIdentifiers(
  expression: string,
  bindings: Map<string, string>,
) {
  let rewritten = "";
  let inString = false;
  let inSheetName = false;
  let bracketDepth = 0;

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index] ?? "";
    const nextCharacter = expression[index + 1] ?? "";

    if (inString) {
      rewritten += character;

      if (character === '"' && nextCharacter === '"') {
        rewritten += nextCharacter;
        index += 1;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (inSheetName) {
      rewritten += character;

      if (character === "'" && nextCharacter === "'") {
        rewritten += nextCharacter;
        index += 1;
      } else if (character === "'") {
        inSheetName = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      rewritten += character;
      continue;
    }

    if (character === "'") {
      inSheetName = true;
      rewritten += character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      rewritten += character;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      rewritten += character;
      continue;
    }

    if (
      bracketDepth === 0 &&
      /[A-Za-z_]/.test(character) &&
      !identifierCharacterPattern.test(expression[index - 1] ?? "")
    ) {
      const tokenMatch = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(
        expression.slice(index),
      );
      const token = tokenMatch?.[0] ?? "";
      const replacement = bindings.get(token.toUpperCase());

      if (replacement !== undefined) {
        const nextNonSpace = expression.slice(index + token.length).trimStart()[0];
        rewritten += nextNonSpace === "(" ? replacement : `(${replacement})`;
        index += token.length - 1;
        continue;
      }
    }

    rewritten += character;
  }

  return rewritten;
}

function skipSpaces(expression: string, startIndex: number) {
  let index = startIndex;

  while (expression[index] === " ") {
    index += 1;
  }

  return index;
}
