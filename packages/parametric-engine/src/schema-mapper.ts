/**
 * Google Sheets importer: reads labeled parameters + cut-list parts,
 * then infers furniture topology from that context (not from fixed cell addresses).
 */
import { DEFAULT_STUDIO_PARAMS, StudioParams } from './topology-3d';

export type TopologyTemplateType =
  | 'CABINET_CARGO_PULLOUT'
  | 'CABINET_MULTI_DRAWER'
  | 'TABLE_WORKBENCH_DRAWER';

export type CanonicalParamRole =
  | 'ENVELOPE_WIDTH'
  | 'ENVELOPE_HEIGHT'
  | 'ENVELOPE_DEPTH'
  | 'FRAME_METAL_SIZE'
  | 'WOOD_THICKNESS'
  | 'CLEAN_WIDTH'
  | 'CLEAN_HEIGHT'
  | 'CLEAN_DEPTH'
  | 'RAILING_GAP'
  | 'DRAWER_WIDTH'
  | 'DRAWER_HEIGHT'
  | 'DRAWER_DEPTH'
  | 'DRAWER_CLEAN_WIDTH'
  | 'DRAWER_CLEAN_HEIGHT'
  | 'DRAWER_CLEAN_DEPTH'
  | 'FACADE_GAP'
  | 'TABLE_OVERHANG'
  | 'APRON_HEIGHT'
  | 'STRETCHER_ELEVATION';

export interface SheetCutItem {
  name: string;
  w: number;
  h: number;
  qty: number;
}

export interface DeducedSheetContext {
  topology: TopologyTemplateType;
  topologyLabel: string;
  confidenceReason: string;
  params: StudioParams;
  detectedCells: Record<string, number | string>;
  mappedRoles: Partial<Record<CanonicalParamRole, { value: number; source: string }>>;
  cutItems: SheetCutItem[];
}

export function inferTopologyFromSheet(rows: (string | number)[][]): TopologyTemplateType {
  const flatText = rows.flat().join(' ').toLowerCase();
  if (
    flatText.includes('table') ||
    flatText.includes('apron') ||
    flatText.includes('workbench') ||
    flatText.includes('стол') ||
    flatText.includes('столешниц')
  ) {
    return 'TABLE_WORKBENCH_DRAWER';
  }
  if (
    flatText.includes('3-drawer') ||
    flatText.includes('multi drawer') ||
    flatText.includes('3 ящик') ||
    flatText.includes('три ящик')
  ) {
    return 'CABINET_MULTI_DRAWER';
  }
  return 'CABINET_CARGO_PULLOUT';
}

function toNum(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(',', '.').replace(/mm$/i, '').trim();
    if (cleaned === '') return null;
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/thikness/g, 'thickness')
    .replace(/thicness/g, 'thickness')
    .replace(/[_/|]+/g, ' ')
    .replace(/[^a-z0-9а-я+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHeaderNoise(label: string): boolean {
  return /^(width|height|quantity|qty|w|h|name|part|размер|кол|количество)$/.test(label);
}

function isPartName(label: string): boolean {
  if (!label || label.length < 3 || isHeaderNoise(label)) return false;
  return /(drawer|cabinet|panel|facade|shelf|table|top|bottom|side|front|back|wall|ящик|фасад|панел|столеш|полк|бок|дно|крыш)/i.test(
    label
  );
}

type RoleRule = { role: CanonicalParamRole; test: (label: string) => boolean };

/** More specific labels must come first so "drawer clean width" is not eaten by "width". */
const ROLE_RULES: RoleRule[] = [
  { role: 'DRAWER_CLEAN_WIDTH', test: (l) => /drawer/.test(l) && /clean|inner|внутр/.test(l) && /width|ширин/.test(l) },
  { role: 'DRAWER_CLEAN_HEIGHT', test: (l) => /drawer/.test(l) && /clean|inner|внутр/.test(l) && /height|высот/.test(l) },
  { role: 'DRAWER_CLEAN_DEPTH', test: (l) => /drawer/.test(l) && /clean|inner|внутр/.test(l) && /depth|глубин/.test(l) },
  { role: 'CLEAN_WIDTH', test: (l) => /clean|чист|внутр/.test(l) && /width|ширин/.test(l) && !/drawer|ящик/.test(l) },
  { role: 'CLEAN_HEIGHT', test: (l) => /clean|чист|внутр/.test(l) && /height|высот/.test(l) && !/drawer|ящик/.test(l) },
  { role: 'CLEAN_DEPTH', test: (l) => /clean|чист|внутр/.test(l) && /depth|глубин/.test(l) && !/drawer|ящик/.test(l) },
  {
    role: 'DRAWER_WIDTH',
    test: (l) => /^(drawer width|ширина ящика)$/.test(l) || (/drawer|ящик/.test(l) && /width|ширин/.test(l) && !/clean|inner|facade|фасад/.test(l))
  },
  {
    role: 'DRAWER_HEIGHT',
    test: (l) => /^(drawer height|высота ящика)$/.test(l) || (/drawer|ящик/.test(l) && /height|высот/.test(l) && !/clean|inner|wall|side|facade/.test(l))
  },
  {
    role: 'DRAWER_DEPTH',
    test: (l) => /^(drawer depth|глубина ящика)$/.test(l) || (/drawer|ящик/.test(l) && /depth|глубин/.test(l) && !/clean|inner/.test(l))
  },
  { role: 'RAILING_GAP', test: (l) => /railing|рейлинг|slide gap|зазор.*направ/.test(l) },
  { role: 'FACADE_GAP', test: (l) => /facade gap|зазор.*фасад|reveal/.test(l) },
  { role: 'FRAME_METAL_SIZE', test: (l) => /metal|frame metal|профил|металл|труба|steel/.test(l) },
  { role: 'WOOD_THICKNESS', test: (l) => /wood|ldsp|лдсп|дерев|толщин|thickness/.test(l) },
  { role: 'TABLE_OVERHANG', test: (l) => /overhang|свес|вылет/.test(l) },
  { role: 'APRON_HEIGHT', test: (l) => /apron|царг/.test(l) },
  { role: 'STRETCHER_ELEVATION', test: (l) => /stretcher|проножек/.test(l) },
  {
    role: 'ENVELOPE_WIDTH',
    test: (l) =>
      (/cabinet|шкаф|корпус/.test(l) && /width|ширин/.test(l)) ||
      l === 'width' ||
      l === 'ширина'
  },
  {
    role: 'ENVELOPE_HEIGHT',
    test: (l) =>
      (/cabinet|шкаф|корпус/.test(l) && /height|высот/.test(l)) ||
      l === 'height' ||
      l === 'высота'
  },
  {
    role: 'ENVELOPE_DEPTH',
    test: (l) =>
      (/cabinet|шкаф|корпус/.test(l) && /depth|глубин/.test(l)) ||
      l === 'depth' ||
      l === 'глубина'
  }
];

function matchRole(label: string): CanonicalParamRole | null {
  const n = normalizeLabel(label);
  if (!n || isHeaderNoise(n)) return null;
  for (const rule of ROLE_RULES) {
    if (rule.test(n)) return rule.role;
  }
  return null;
}

function colLetter(c: number): string {
  let n = c;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function parseCutItems(rows: (string | number)[][]): SheetCutItem[] {
  const items: SheetCutItem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const label = String(row[c] ?? '').trim();
      if (!isPartName(label)) continue;
      const w = toNum(row[c + 1]);
      const h = toNum(row[c + 2]);
      const qty = toNum(row[c + 3]);
      if (w === null || h === null) continue;
      if (w < 20 || h < 20 || w > 4000 || h > 4000) continue;
      const key = `${normalizeLabel(label)}:${w}x${h}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        name: label.trim(),
        w,
        h,
        qty: qty !== null && qty >= 1 && qty <= 40 ? qty : 1
      });
      break;
    }
  }
  return items;
}

function findCut(items: SheetCutItem[], ...needles: string[]): SheetCutItem | undefined {
  return items.find((item) => {
    const n = normalizeLabel(item.name);
    return needles.every((needle) => n.includes(needle));
  });
}

function topologyLabel(topology: TopologyTemplateType): string {
  if (topology === 'TABLE_WORKBENCH_DRAWER') return 'Steel-frame table';
  if (topology === 'CABINET_MULTI_DRAWER') return 'Multi-drawer cabinet';
  return 'Cargo pull-out';
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Parses a 2D grid (Sheets API, CSV, or TSV paste), maps labels → roles,
 * reads the adjacent cut-list, and returns a physically consistent StudioParams.
 */
export function deduceModelFromSheetRows(
  rows: (string | number)[][],
  fallbackParams?: StudioParams
): DeducedSheetContext {
  const detectedCells: Record<string, number | string> = {};
  const mappedRoles: DeducedSheetContext['mappedRoles'] = {};
  const claimed = new Set<string>();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const coord = `${colLetter(c)}${r + 1}`;
      const raw = row[c];
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const num = toNum(raw);
        detectedCells[coord] = num !== null ? num : String(raw).trim();
      }
    }
  }

  const tryMap = (role: CanonicalParamRole, value: number, source: string) => {
    if (mappedRoles[role] !== undefined) return;
    if (!Number.isFinite(value)) return;
    mappedRoles[role] = { value, source };
  };

  // Label in a cell → numeric value to the right, or below.
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const label = String(row[c] ?? '').trim();
      const role = matchRole(label);
      if (!role) continue;
      const right = toNum(row[c + 1]);
      const below = toNum(rows[r + 1]?.[c]);
      const value = right ?? below;
      if (value === null) continue;
      const source = right !== null ? `${colLetter(c + 1)}${r + 1}` : `${colLetter(c)}${r + 2}`;
      tryMap(role, value, `${label} @ ${source}`);
      claimed.add(source);
    }
  }

  const cutItems = parseCutItems(rows);

  const drawerFront = findCut(cutItems, 'drawer', 'front') ?? findCut(cutItems, 'ящик', 'перед');
  const drawerBack = findCut(cutItems, 'drawer', 'back') ?? findCut(cutItems, 'ящик', 'зад');
  const drawerBottom = findCut(cutItems, 'drawer', 'bottom') ?? findCut(cutItems, 'ящик', 'дно');
  const drawerSide = findCut(cutItems, 'drawer', 'side') ?? findCut(cutItems, 'ящик', 'бок');
  const drawerMid = findCut(cutItems, 'drawer', 'middle') ?? findCut(cutItems, 'horizontal');
  const facade = findCut(cutItems, 'facade') ?? findCut(cutItems, 'фасад');
  const cabLeft = findCut(cutItems, 'cabinet', 'left') ?? findCut(cutItems, 'left', 'panel');
  const cabRight = findCut(cutItems, 'cabinet', 'right');
  const cabBottom = findCut(cutItems, 'cabinet', 'bottom') ?? findCut(cutItems, 'bottom', 'panel');
  const cabTop = findCut(cutItems, 'cabinet', 'top') ?? findCut(cutItems, 'top', 'panel');
  const tableTop = findCut(cutItems, 'tabletop') ?? findCut(cutItems, 'столеш');

  if (drawerFront && mappedRoles.DRAWER_WIDTH === undefined) {
    tryMap('DRAWER_WIDTH', drawerFront.w, `cut-list "${drawerFront.name}"`);
  }
  if (drawerFront && mappedRoles.DRAWER_HEIGHT === undefined) {
    tryMap('DRAWER_HEIGHT', drawerFront.h, `cut-list "${drawerFront.name}"`);
  }
  if (drawerBottom && mappedRoles.DRAWER_CLEAN_WIDTH === undefined) {
    tryMap('DRAWER_CLEAN_WIDTH', drawerBottom.w, `cut-list "${drawerBottom.name}"`);
  }
  if (drawerBottom && mappedRoles.DRAWER_CLEAN_DEPTH === undefined) {
    tryMap('DRAWER_CLEAN_DEPTH', drawerBottom.h, `cut-list "${drawerBottom.name}"`);
  }
  if (cabBottom && mappedRoles.CLEAN_WIDTH === undefined) {
    tryMap('CLEAN_WIDTH', cabBottom.w, `cut-list "${cabBottom.name}"`);
  }
  if (cabBottom && mappedRoles.CLEAN_DEPTH === undefined) {
    tryMap('CLEAN_DEPTH', cabBottom.h, `cut-list "${cabBottom.name}"`);
  }
  if (cabLeft && mappedRoles.CLEAN_DEPTH === undefined) {
    tryMap('CLEAN_DEPTH', Math.max(cabLeft.w, cabLeft.h) >= cabLeft.w ? cabLeft.w : cabLeft.h, `cut-list "${cabLeft.name}"`);
  }

  const facadeCount = cutItems.filter((i) => /facade|фасад/.test(normalizeLabel(i.name))).reduce((s, i) => s + i.qty, 0);
  const drawerFrontCount = cutItems
    .filter((i) => /drawer/.test(normalizeLabel(i.name)) && /front|facade/.test(normalizeLabel(i.name)))
    .reduce((s, i) => s + i.qty, 0);

  let topology = inferTopologyFromSheet(rows);
  const reasons: string[] = [];

  const envW = mappedRoles.ENVELOPE_WIDTH?.value;
  const envH = mappedRoles.ENVELOPE_HEIGHT?.value;
  const envD = mappedRoles.ENVELOPE_DEPTH?.value;
  const drawerH = mappedRoles.DRAWER_HEIGHT?.value ?? drawerFront?.h;
  const metal = mappedRoles.FRAME_METAL_SIZE?.value;

  if (tableTop || topology === 'TABLE_WORKBENCH_DRAWER') {
    topology = 'TABLE_WORKBENCH_DRAWER';
    reasons.push('table / workbench parts in sheet');
  } else if (facadeCount >= 3 || drawerFrontCount >= 3) {
    topology = 'CABINET_MULTI_DRAWER';
    reasons.push(`${Math.max(facadeCount, drawerFrontCount)} drawer fronts`);
  } else if (drawerH !== undefined && envH !== undefined && drawerH >= envH * 0.7) {
    topology = 'CABINET_CARGO_PULLOUT';
    reasons.push(`tall cargo box (${drawerH} mm in ${envH} mm carcass)`);
  } else if (envW !== undefined && envW >= 1000 && envH !== undefined && envH <= 900 && (metal ?? 20) >= 30) {
    topology = 'TABLE_WORKBENCH_DRAWER';
    reasons.push(`wide low envelope ${envW}×${envH} mm`);
  } else if (envW !== undefined && envW <= 420 && (envH ?? 0) >= 500) {
    topology = 'CABINET_CARGO_PULLOUT';
    reasons.push(`narrow vertical envelope ${envW}×${envH}×${envD} mm`);
  } else if (envW !== undefined && envW >= 450) {
    topology = 'CABINET_MULTI_DRAWER';
    reasons.push(`base-cabinet proportion ${envW}×${envH} mm`);
  } else {
    reasons.push('defaulted from sheet keywords');
  }

  const base = fallbackParams
    ? { ...DEFAULT_STUDIO_PARAMS[topology], ...fallbackParams, topology }
    : { ...DEFAULT_STUDIO_PARAMS[topology] };

  const wood = mappedRoles.WOOD_THICKNESS?.value ?? base.woodThick;
  const rail = mappedRoles.RAILING_GAP?.value ?? base.railingGap;

  let next: StudioParams = {
    ...base,
    topology,
    envWidth: envW ?? base.envWidth,
    envHeight: envH ?? base.envHeight,
    envDepth: envD ?? base.envDepth,
    metalSize: mappedRoles.FRAME_METAL_SIZE?.value ?? base.metalSize,
    woodThick: wood,
    railingGap: rail,
    drawerHeight: drawerH ?? base.drawerHeight,
    drawerDepth: mappedRoles.DRAWER_DEPTH?.value ?? base.drawerDepth,
    facadeGap: mappedRoles.FACADE_GAP?.value ?? base.facadeGap,
    tableOverhang: mappedRoles.TABLE_OVERHANG?.value ?? base.tableOverhang,
    apronHeight: mappedRoles.APRON_HEIGHT?.value ?? base.apronHeight,
    stretcherY: mappedRoles.STRETCHER_ELEVATION?.value ?? base.stretcherY,
    hasCarcassTop: Boolean(cabTop),
    hasCarcassBottom: cabBottom ? true : base.hasCarcassBottom,
    hasCarcassSides: Boolean(cabLeft || cabRight) || base.hasCarcassSides
  };

  if (mappedRoles.CLEAN_WIDTH && !envW) {
    next.envWidth = mappedRoles.CLEAN_WIDTH.value + 2 * next.metalSize;
  }
  if (mappedRoles.CLEAN_HEIGHT && !envH) {
    next.envHeight = mappedRoles.CLEAN_HEIGHT.value + 2 * next.metalSize;
  }
  if (mappedRoles.CLEAN_DEPTH && !envD) {
    next.envDepth = mappedRoles.CLEAN_DEPTH.value + 2 * next.metalSize;
  }

  const innerW = mappedRoles.DRAWER_CLEAN_WIDTH?.value ?? drawerBottom?.w ?? drawerMid?.w;
  const innerD = mappedRoles.DRAWER_CLEAN_DEPTH?.value ?? drawerBottom?.h ?? drawerMid?.h;
  const outerW = mappedRoles.DRAWER_WIDTH?.value ?? (innerW !== undefined ? innerW + 2 * wood : undefined);

  next.drawerBoxWidth = outerW ?? 0;
  next.drawerInnerWidth = innerW ?? (outerW !== undefined ? Math.max(20, outerW - 2 * wood) : 0);
  next.drawerInnerDepth = innerD ?? 0;
  next.facadeWidth = facade?.w ?? 0;
  next.facadeHeight = facade?.h ?? 0;

  if (drawerSide) {
    const sideH = Math.min(drawerSide.w, drawerSide.h);
    const sideL = Math.max(drawerSide.w, drawerSide.h);
    next.sidePanelHeight = sideH;
    if (!mappedRoles.DRAWER_DEPTH) {
      // Side panel length is the wood depth; slide length is typically a round number above that.
      next.drawerInnerDepth = next.drawerInnerDepth || sideL;
      if (next.drawerDepth < sideL) next.drawerDepth = Math.ceil(sideL / 50) * 50;
    }
  }

  // Joinery offset: inner width vs clean - 2*wood - 2*slides
  const cleanW = next.envWidth - 2 * next.metalSize;
  if (next.drawerInnerWidth > 0) {
    const rawNoOffset = cleanW - 2 * next.woodThick - 2 * next.railingGap;
    const diff = Math.round((next.drawerInnerWidth - rawNoOffset) * 10) / 10;
    next.b14PlusOne = diff;
    next.joineryMode = Math.abs(diff) > 0.05 ? 'sheet20' : 'recommended';
    reasons.push(`inner drawer ${next.drawerInnerWidth} mm (offset ${diff >= 0 ? '+' : ''}${diff})`);
  } else if (outerW) {
    const rawOuter = cleanW - 2 * next.railingGap;
    next.b14PlusOne = Math.round((outerW - (rawOuter - 2 * wood)) * 10) / 10;
  }

  // Keep the box inside the steel envelope so a misread cell cannot explode the model.
  next.envWidth = clamp(next.envWidth, 80, 4000);
  next.envHeight = clamp(next.envHeight, 80, 4000);
  next.envDepth = clamp(next.envDepth, 80, 4000);
  next.metalSize = clamp(next.metalSize, 10, 80);
  next.woodThick = clamp(next.woodThick, 8, 40);
  next.railingGap = clamp(next.railingGap, 8, 25);
  next.drawerHeight = clamp(next.drawerHeight, 40, next.envHeight - 2 * next.metalSize);
  next.drawerDepth = clamp(next.drawerDepth, 120, next.envDepth);
  if (next.drawerBoxWidth > 0) {
    next.drawerBoxWidth = clamp(next.drawerBoxWidth, 40, next.envWidth - 2);
  }
  if (next.facadeWidth > 0) {
    next.facadeWidth = clamp(next.facadeWidth, 40, next.envWidth);
  }
  if (next.facadeHeight > 0) {
    next.facadeHeight = clamp(next.facadeHeight, 40, next.envHeight);
  }

  const mappedCount = Object.keys(mappedRoles).length;
  const confidenceReason =
    mappedCount > 0
      ? `Read ${mappedCount} labeled fields, ${cutItems.length} cut parts · ${reasons.join('; ')}`
      : reasons.join('; ');

  return {
    topology,
    topologyLabel: topologyLabel(topology),
    confidenceReason,
    params: next,
    detectedCells,
    mappedRoles,
    cutItems
  };
}

export function parseDelimitedSheetText(text: string): (string | number)[][] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  const isTsv = lines.some((l) => l.includes('\t'));
  return lines.map((line) => {
    if (isTsv) {
      return line.split('\t').map((cell) => cell.trim());
    }
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  });
}
