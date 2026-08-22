// A small, safe arithmetic expression evaluator for admin-authored scoring
// formulas. Deliberately does NOT use eval()/Function() — expressions come
// from admin input and must never reach a JS interpreter directly.
//
// Grammar:
//   expr    := term (('+' | '-') term)*
//   term    := factor (('*' | '×' | '/' | '÷') factor)*
//   factor  := number | fieldRef | '(' expr ')' | '-' factor
//   fieldRef:= '[' identifier ']'
//
// Field references look up a numeric value from the provided variable map
// by field key, e.g. `[teaching_experience_years] * 2`.

import type { ApplicationValueMap } from "./types";

export class FormulaError extends Error {}

type Token =
  | { type: "number"; value: number }
  | { type: "field"; key: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = expression;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (ch === "+" || ch === "-") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "*" || ch === "×") {
      tokens.push({ type: "op", value: "*" });
      i++;
      continue;
    }
    if (ch === "/" || ch === "÷") {
      tokens.push({ type: "op", value: "/" });
      i++;
      continue;
    }
    if (ch === "[") {
      const end = src.indexOf("]", i);
      if (end === -1) {
        throw new FormulaError(`Unclosed field reference starting at position ${i}`);
      }
      const key = src.slice(i + 1, end).trim();
      if (!key) {
        throw new FormulaError(`Empty field reference at position ${i}`);
      }
      tokens.push({ type: "field", key });
      i = end + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const raw = src.slice(i, j);
      const value = Number(raw);
      if (Number.isNaN(value)) {
        throw new FormulaError(`Invalid number "${raw}" at position ${i}`);
      }
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }

    throw new FormulaError(`Unexpected character "${ch}" at position ${i}`);
  }

  return tokens;
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private values: ApplicationValueMap,
  ) {}

  parse(): number {
    if (this.tokens.length === 0) {
      throw new FormulaError("Empty expression");
    }
    const result = this.parseExpr();
    if (this.pos !== this.tokens.length) {
      throw new FormulaError("Unexpected trailing tokens in expression");
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private parseExpr(): number {
    let value = this.parseTerm();
    while (true) {
      const tok = this.peek();
      if (tok?.type === "op" && (tok.value === "+" || tok.value === "-")) {
        this.pos++;
        const rhs = this.parseTerm();
        value = tok.value === "+" ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      const tok = this.peek();
      if (tok?.type === "op" && (tok.value === "*" || tok.value === "/")) {
        this.pos++;
        const rhs = this.parseFactor();
        if (tok.value === "/") {
          if (rhs === 0) {
            throw new FormulaError("Division by zero");
          }
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else {
        break;
      }
    }
    return value;
  }

  private parseFactor(): number {
    const tok = this.peek();
    if (!tok) {
      throw new FormulaError("Unexpected end of expression");
    }

    if (tok.type === "op" && tok.value === "-") {
      this.pos++;
      return -this.parseFactor();
    }
    if (tok.type === "number") {
      this.pos++;
      return tok.value;
    }
    if (tok.type === "field") {
      this.pos++;
      const entry = this.values[tok.key];
      const num = entry?.number;
      if (num === null || num === undefined || Number.isNaN(num)) {
        return 0;
      }
      return num;
    }
    if (tok.type === "lparen") {
      this.pos++;
      const value = this.parseExpr();
      const close = this.peek();
      if (close?.type !== "rparen") {
        throw new FormulaError("Missing closing parenthesis");
      }
      this.pos++;
      return value;
    }

    throw new FormulaError("Unexpected token in expression");
  }
}

export function evaluateFormula(
  expression: string,
  values: ApplicationValueMap,
): number {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, values);
  return parser.parse();
}

// Extract every `[field_key]` reference from an expression, for validation
// and for the formula builder's live field picker.
export function extractFieldReferences(expression: string): string[] {
  const matches = expression.matchAll(/\[([^\]]+)\]/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1].trim())));
}
