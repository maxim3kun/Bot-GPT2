type MassUnit = "g" | "kg" | "t";
const grams: Record<MassUnit, number> = { g: 1, kg: 1_000, t: 1_000_000 };

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
