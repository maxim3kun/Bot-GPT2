type MassUnit = "g" | "kg" | "t";
const grams: Record<MassUnit, number> = { g: 1, kg: 1_000, t: 1_000_000 };

type ArithmeticToken = { kind: "number"; value: number; display: string } | { kind: "operator"; value: string };

/**
 * Recognizes only a plain arithmetic expression or a short, explicit calculation request.
 * The bounded parser below never evaluates JavaScript or accepts arbitrary input.
 */
export function simpleArithmeticReply(text: string, language: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 128 || /^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) return null;
  const request = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const prefixed = request.match(/^(?:combien\s+(?:font|fait)|calcule(?:r)?|calculate|what\s+is|what's|how\s+much\s+is)\s+(.+)$/);
  const expression = (prefixed?.[1] ?? ( /^[\d.,+\-−*/×÷x()\s]+$/i.test(trimmed) ? trimmed : "" ))
    .replace(/[?!.]+\s*$/, "")
    .trim();
  if (!expression || expression.length > 96 || !/[+\-−*/×÷x]/i.test(expression)) return null;

  const tokens: ArithmeticToken[] = [];
  let index = 0;
  while (index < expression.length) {
    if (/\s/.test(expression[index]!)) {
      index++;
      continue;
    }
    const number = expression.slice(index).match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/);
    if (number) {
      const value = Number(number[0].replace(",", "."));
      if (!Number.isFinite(value) || Math.abs(value) > 1e15) return null;
      tokens.push({ kind: "number", value, display: number[0].replace(",", ".") });
      index += number[0].length;
      continue;
    }
    const character = expression[index]!;
    if ("+-−*/×÷xX()".includes(character)) {
      tokens.push({ kind: "operator", value: character.toLowerCase() === "x" ? "×" : character });
      index++;
      continue;
    }
    return null;
  }
  if (tokens.length > 31) return null;

  let cursor = 0;
  let operands = 0;
  let operations = 0;
  let nesting = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];
  const bounded = (value: number): number => {
    if (!Number.isFinite(value) || Math.abs(value) > 1e30) throw new Error("Arithmetic result out of bounds");
    return value;
  };
  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek()?.kind === "operator" && ["+", "-", "−"].includes((peek() as Extract<ArithmeticToken, { kind: "operator" }>).value)) {
      const operator = (consume() as Extract<ArithmeticToken, { kind: "operator" }>).value;
      operations++;
      const right = parseTerm();
      value = bounded(operator === "+" ? value + right : value - right);
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseUnary();
    while (peek()?.kind === "operator" && ["*", "×", "/", "÷"].includes((peek() as Extract<ArithmeticToken, { kind: "operator" }>).value)) {
      const operator = (consume() as Extract<ArithmeticToken, { kind: "operator" }>).value;
      operations++;
      const right = parseUnary();
      if ((operator === "/" || operator === "÷") && right === 0) throw new Error("Division by zero");
      value = bounded(operator === "*" || operator === "×" ? value * right : value / right);
    }
    return value;
  };
  const parseUnary = (): number => {
    const token = peek();
    if (token?.kind === "operator" && ["+", "-", "−"].includes(token.value)) {
      consume();
      operations++;
      const value = parseUnary();
      return token.value === "+" ? value : -value;
    }
    if (token?.kind === "operator" && token.value === "(") {
      consume();
      nesting++;
      if (nesting > 6) throw new Error("Expression nesting exceeds limit");
      const value = parseExpression();
      if (peek()?.kind !== "operator" || (peek() as Extract<ArithmeticToken, { kind: "operator" }>).value !== ")") {
        throw new Error("Unclosed parenthesis");
      }
      consume();
      nesting--;
      return value;
    }
    if (token?.kind !== "number") throw new Error("Expected a number");
    consume();
    operands++;
    if (operands > 16) throw new Error("Too many operands");
    return token.value;
  };

  try {
    const result = parseExpression();
    if (cursor !== tokens.length || operations === 0 || operations > 24) return null;
    const rounded = Number(bounded(result).toPrecision(12));
    const display = tokens.map((token) => token.kind === "number" ? token.display : token.value).join(" ");
    const localizedResult = new Intl.NumberFormat(language, {
      maximumSignificantDigits: 12,
      useGrouping: false,
    }).format(rounded);
    return `${display} = ${localizedResult}.`;
  } catch {
    return null;
  }
}

/** Structured arithmetic only: no eval, code, URLs or arbitrary expressions. */
export function calculateVerified(input: unknown): { result: number; calculation: string; caveat: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid calculation");
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some((key) => !["operation", "values", "from", "to"].includes(key))) throw new Error("Unexpected calculation arguments");
  if (!Array.isArray(data.values) || !data.values.length || data.values.length > 16
    || data.values.some((value) => typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e15)) {
    throw new Error("Use 1–16 finite numeric operands, each at most 1e15");
  }
  const values = data.values as number[];
  let result: number;
  let calculation: string;
  switch (data.operation) {
    case "add": result = values.reduce((a, b) => a + b, 0); calculation = values.join(" + "); break;
    case "multiply": result = values.reduce((a, b) => a * b, 1); calculation = values.join(" × "); break;
    case "subtract":
    case "divide":
      if (values.length !== 2) throw new Error("Subtract/divide require exactly two operands");
      if (data.operation === "divide" && values[1] === 0) throw new Error("Division by zero");
      result = data.operation === "divide" ? values[0]! / values[1]! : values[0]! - values[1]!;
      calculation = values.join(data.operation === "divide" ? " ÷ " : " − ");
      break;
    case "convert_mass": {
      if (values.length !== 1 || typeof data.from !== "string" || typeof data.to !== "string"
        || !Object.hasOwn(grams, data.from) || !Object.hasOwn(grams, data.to)) throw new Error("Mass conversion requires one value and g, kg or t units");
      result = values[0]! * grams[data.from as MassUnit] / grams[data.to as MassUnit];
      calculation = `${values[0]} ${data.from} → ${data.to}`;
      break;
    }
    default: throw new Error("Unsupported calculation operation");
  }
  if (data.operation !== "convert_mass" && (data.from !== undefined || data.to !== undefined)) throw new Error("Units belong only to mass conversion");
  if (!Number.isFinite(result) || Math.abs(result) > 1e30) throw new Error("Calculation result exceeds safe bounds");
  return {
    result: Number(result.toPrecision(12)), calculation,
    caveat: "Arithmetic verified only. Input values, sources, uncertainty and comparable scopes must be checked separately.",
  };
}

export const CALCULATION_INSTRUCTIONS =
  "Use the verified_calculation tool for numerical comparisons, arithmetic and g/kg/t conversions. " +
  "It verifies arithmetic, NOT the truth of the operands. Identify each empirical input's supplied source or label it explicitly as a hypothetical assumption. " +
  "If comparable sourced inputs are missing, say the real-world estimate cannot be established; you may explain the formula without inventing a result. " +
  "Use a range when evidence supports a range.";
