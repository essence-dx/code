import type { SceneVariable, SceneVariableValue } from "../types";

function readNumber(value: SceneVariableValue) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function replaceVariableTokens(expression: string, variables: SceneVariable[]) {
  const variableByKey = new Map<string, SceneVariable>();

  for (const variable of variables) {
    variableByKey.set(variable.id.trim().toLowerCase(), variable);
    variableByKey.set(variable.name.trim().toLowerCase(), variable);
  }

  return expression.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) => {
    const variable = variableByKey.get(key.trim().toLowerCase());

    return variable ? String(readNumber(variable.value)) : "0";
  });
}

class NumericExpressionParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse() {
    const value = this.parseAdditive();

    this.skipWhitespace();

    return this.index === this.source.length && Number.isFinite(value) ? value : null;
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();

    while (true) {
      this.skipWhitespace();

      if (this.consume("+")) {
        value += this.parseMultiplicative();
      } else if (this.consume("-")) {
        value -= this.parseMultiplicative();
      } else {
        return value;
      }
    }
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();

    while (true) {
      this.skipWhitespace();

      if (this.consume("*")) {
        value *= this.parseUnary();
      } else if (this.consume("/")) {
        value /= this.parseUnary();
      } else if (this.consume("%")) {
        value %= this.parseUnary();
      } else {
        return value;
      }
    }
  }

  private parseUnary(): number {
    this.skipWhitespace();

    if (this.consume("+")) {
      return this.parseUnary();
    }

    if (this.consume("-")) {
      return -this.parseUnary();
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.skipWhitespace();

    if (this.consume("(")) {
      const value = this.parseAdditive();

      this.skipWhitespace();

      if (!this.consume(")")) {
        return Number.NaN;
      }

      return value;
    }

    return this.parseNumber();
  }

  private parseNumber() {
    this.skipWhitespace();

    const start = this.index;

    while (this.index < this.source.length && /[0-9.]/.test(this.source[this.index])) {
      this.index += 1;
    }

    if (start === this.index) {
      return Number.NaN;
    }

    const value = Number(this.source.slice(start, this.index));

    return Number.isFinite(value) ? value : Number.NaN;
  }

  private consume(token: string) {
    if (this.source[this.index] !== token) {
      return false;
    }

    this.index += token.length;

    return true;
  }

  private skipWhitespace() {
    while (this.index < this.source.length && /\s/.test(this.source[this.index])) {
      this.index += 1;
    }
  }
}

export function evaluateNumericExpression(expression: string | undefined, variables: SceneVariable[], fallback: number) {
  const prepared = replaceVariableTokens(expression?.trim() ?? "", variables);

  if (!prepared || /[^0-9+\-*/%().\s]/.test(prepared)) {
    return fallback;
  }

  const value = new NumericExpressionParser(prepared).parse();

  return value === null ? fallback : value;
}
