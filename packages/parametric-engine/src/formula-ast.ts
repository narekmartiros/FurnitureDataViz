/**
 * Reactive Spreadsheet Formula AST Evaluator
 * Evaluates Google Sheets formulas (=B1-2*B5, =B8-2*B12+1, =B16-2*B6) in <1ms.
 */
export interface SheetCell {
  coord: string;
  label?: string;
  rawInput: string | number;
  evaluated: number;
  isFormula: boolean;
}

export class FormulaDAG {
  private cells = new Map<string, string | number>();
  private cache = new Map<string, number>();

  setCell(coord: string, value: string | number): void {
    this.cells.set(coord.toUpperCase(), value);
    this.cache.clear();
  }

  getCellRaw(coord: string): string | number {
    return this.cells.get(coord.toUpperCase()) ?? 0;
  }

  evaluate(coord: string, visited = new Set<string>()): number {
    const key = coord.toUpperCase();
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (visited.has(key)) throw new Error(`Circular reference detected at ${key}`);
    visited.add(key);

    const raw = this.cells.get(key);
    if (raw === undefined || raw === '') return 0;
    if (typeof raw === 'number') {
      this.cache.set(key, raw);
      return raw;
    }

    const str = String(raw).trim();
    if (!str.startsWith('=')) {
      const num = Number(str);
      const val = Number.isFinite(num) ? num : 0;
      this.cache.set(key, val);
      return val;
    }

    const expr = str.slice(1).toUpperCase().replace(/[A-Z]+[0-9]+/g, (ref) => {
      return String(this.evaluate(ref, new Set(visited)));
    });

    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      return 0;
    }
    const result = Function(`"use strict"; return (${expr});`)();
    const cleanResult = Math.round(Number(result) * 100) / 100;
    this.cache.set(key, cleanResult);
    return cleanResult;
  }
}
