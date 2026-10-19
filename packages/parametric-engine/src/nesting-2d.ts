/**
 * 2D Guillotine Sheet Stock Nesting Optimizer
 */
import { CutListPart } from './topology-3d';

export interface NestedRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  origW: number;
  origH: number;
  color: string;
}

export interface NestingResult {
  stockWidth: number;
  stockHeight: number;
  kerfMm: number;
  placed: NestedRect[];
  netAreaM2: number;
  utilizationPct: number;
  edgeBandingMeters: number;
}

export function packCutListOnSheet(
  parts: CutListPart[],
  stockWidth = 2440,
  stockHeight = 1220,
  kerfMm = 4
): NestingResult {
  const items: Omit<NestedRect, 'x' | 'y'>[] = [];
  let netAreaM2 = 0;
  let edgeBandingMeters = 0;

  for (const p of parts) {
    netAreaM2 += (p.w * p.h * p.qty) / 1e6;
    edgeBandingMeters += (2 * (p.w + p.h) * p.qty) / 1000;
    for (let i = 0; i < p.qty; i++) {
      items.push({
        name: p.name,
        w: Math.max(p.w, p.h),
        h: Math.min(p.w, p.h),
        origW: p.w,
        origH: p.h,
        color: p.color
      });
    }
  }

  items.sort((a, b) => b.h - a.h);
  let curX = 15;
  let curY = 15;
  let shelfH = 0;
  const placed: NestedRect[] = [];

  for (const it of items) {
    if (curX + it.w + 15 > stockWidth) {
      curX = 15;
      curY += shelfH + kerfMm;
      shelfH = 0;
    }
    placed.push({ ...it, x: curX, y: curY });
    curX += it.w + kerfMm;
    shelfH = Math.max(shelfH, it.h);
  }

  const stockAreaM2 = (stockWidth * stockHeight) / 1e6;
  return {
    stockWidth,
    stockHeight,
    kerfMm,
    placed,
    netAreaM2,
    utilizationPct: (netAreaM2 / stockAreaM2) * 100,
    edgeBandingMeters
  };
}
