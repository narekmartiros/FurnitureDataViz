/**
 * Parametric 3D Topology Builder for Cabinets & Tables
 * Converts evaluated spreadsheet parameters + cut-list parts into 3D bounding boxes and hardware anchors.
 */
import { TopologyTemplateType } from './schema-mapper';

export interface Box3DPrimitive {
  id: string;
  partId: string;
  name: string;
  group: 'frame' | 'carcass' | 'drawer' | 'tabletop' | 'railings';
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  color: string;
  edgeColor: string;
  alpha: number;
  dims: string;
  formula: string;
  cellRef?: string;
  isRailing?: boolean;
  screwY?: number;
  railSide?: 'L' | 'R';
}

export interface CutListPart {
  id: string;
  name: string;
  group: 'carcass' | 'drawer' | 'tabletop';
  w: number;
  h: number;
  t: number;
  qty: number;
  cellRef: string;
  formula: string;
  sheetFormulaE: string;
  sheetFormulaF: string;
  color: string;
  desc: string;
}

export interface StudioParams {
  topology: TopologyTemplateType;
  envWidth: number;       // B1 (e.g. 265mm Cabinet or 1600mm Table)
  envHeight: number;      // B2 (e.g. 680mm Cabinet or 750mm Table)
  envDepth: number;       // B3 (e.g. 570mm Cabinet or 800mm Table)
  metalSize: number;      // B5 (20mm Cabinet frame or 40mm Table leg)
  woodThick: number;      // B6 (18mm LDSP or 25mm Tabletop)
  railingGap: number;     // B12 (13mm GTV Meridian)
  drawerHeight: number;   // B15 (590mm Cargo tower or 110mm Under-table drawer)
  drawerDepth: number;    // B16 (500mm or 450mm slide)
  facadeGap: number;      // B22 (2.5mm reveal)
  sidePanelHeight: number;// F5 (120mm)
  b14PlusOne: number;     // +1mm raw Sheet20 toggle
  tableOverhang: number;  // 30mm tabletop overhang
  apronHeight: number;    // 120mm table structural apron
  stretcherY: number;     // 180mm lower table shelf elevation
  joineryMode: 'recommended' | 'sheet20';
  /** Outer drawer box width (front/back). 0 = derive from envelope. */
  drawerBoxWidth: number;
  /** Inner tray width. 0 = derive. */
  drawerInnerWidth: number;
  /** Inner tray depth (wood). 0 = derive from slide length. */
  drawerInnerDepth: number;
  facadeWidth: number;
  facadeHeight: number;
  hasCarcassTop: boolean;
  hasCarcassBottom: boolean;
  hasCarcassSides: boolean;
}

export const DEFAULT_STUDIO_PARAMS: Record<TopologyTemplateType, StudioParams> = {
  CABINET_CARGO_PULLOUT: {
    topology: 'CABINET_CARGO_PULLOUT',
    envWidth: 265,
    envHeight: 680,
    envDepth: 570,
    metalSize: 20,
    woodThick: 18,
    railingGap: 13,
    drawerHeight: 590,
    drawerDepth: 500,
    facadeGap: 2.5,
    sidePanelHeight: 120,
    b14PlusOne: 1,
    tableOverhang: 30,
    apronHeight: 120,
    stretcherY: 180,
    joineryMode: 'sheet20',
    drawerBoxWidth: 200,
    drawerInnerWidth: 164,
    drawerInnerDepth: 464,
    facadeWidth: 220,
    facadeHeight: 635,
    hasCarcassTop: false,
    hasCarcassBottom: true,
    hasCarcassSides: true
  },
  CABINET_MULTI_DRAWER: {
    topology: 'CABINET_MULTI_DRAWER',
    envWidth: 600,
    envHeight: 820,
    envDepth: 570,
    metalSize: 20,
    woodThick: 18,
    railingGap: 13,
    drawerHeight: 180,
    drawerDepth: 500,
    facadeGap: 2.5,
    sidePanelHeight: 140,
    b14PlusOne: 0,
    tableOverhang: 30,
    apronHeight: 120,
    stretcherY: 180,
    joineryMode: 'recommended',
    drawerBoxWidth: 0,
    drawerInnerWidth: 0,
    drawerInnerDepth: 0,
    facadeWidth: 0,
    facadeHeight: 0,
    hasCarcassTop: true,
    hasCarcassBottom: true,
    hasCarcassSides: true
  },
  TABLE_WORKBENCH_DRAWER: {
    topology: 'TABLE_WORKBENCH_DRAWER',
    envWidth: 1600,
    envHeight: 750,
    envDepth: 800,
    metalSize: 40,
    woodThick: 25,
    railingGap: 13,
    drawerHeight: 110,
    drawerDepth: 450,
    facadeGap: 2.5,
    sidePanelHeight: 95,
    b14PlusOne: 0,
    tableOverhang: 30,
    apronHeight: 120,
    stretcherY: 180,
    joineryMode: 'recommended',
    drawerBoxWidth: 0,
    drawerInnerWidth: 0,
    drawerInnerDepth: 0,
    facadeWidth: 0,
    facadeHeight: 0,
    hasCarcassTop: true,
    hasCarcassBottom: true,
    hasCarcassSides: true
  }
};

export function buildCutList(p: StudioParams): CutListPart[] {
  const cleanW = p.envWidth - 2 * p.metalSize;
  const cleanH = p.envHeight - 2 * p.metalSize;
  const cleanD = p.envDepth - 2 * p.metalSize;

  if (p.topology === 'TABLE_WORKBENCH_DRAWER') {
    const frameW = p.envWidth - 2 * p.tableOverhang;
    const frameD = p.envDepth - 2 * p.tableOverhang;
    const bayW = Math.round(frameW * 0.4);
    const drwW = bayW - 2 * p.railingGap;
    return [
      {
        id: 'tbl-top',
        name: 'Tabletop Slab',
        group: 'tabletop',
        w: p.envWidth,
        h: p.envDepth,
        t: p.woodThick,
        qty: 1,
        cellRef: 'E2:F2',
        formula: `${p.envWidth} × ${p.envDepth}`,
        sheetFormulaE: '=B1',
        sheetFormulaF: '=B3',
        color: '#D97706',
        desc: 'Butcher-block top with perimeter overhang'
      },
      {
        id: 'tbl-shelf',
        name: 'Lower Stretcher Shelf',
        group: 'carcass',
        w: frameW - 2 * p.metalSize,
        h: frameD - 2 * p.metalSize,
        t: 18,
        qty: 1,
        cellRef: 'E3:F3',
        formula: `${frameW - 2 * p.metalSize} × ${frameD - 2 * p.metalSize}`,
        sheetFormulaE: '=B1-2*B24-2*B5',
        sheetFormulaF: '=B3-2*B24-2*B5',
        color: '#B45309',
        desc: 'Inset lower shelf on steel stretchers'
      },
      {
        id: 'tbl-drw-sides',
        name: 'Drawer Side Walls',
        group: 'drawer',
        w: p.drawerDepth,
        h: p.sidePanelHeight,
        t: 18,
        qty: 2,
        cellRef: 'E5:F5',
        formula: `${p.drawerDepth} × ${p.sidePanelHeight}`,
        sheetFormulaE: '=B16',
        sheetFormulaF: `${p.sidePanelHeight}`,
        color: '#0EA5E9',
        desc: 'Slide-mounted drawer side walls'
      },
      {
        id: 'tbl-drw-bottom',
        name: 'Drawer Bottom',
        group: 'drawer',
        w: drwW - 36,
        h: p.drawerDepth - 36,
        t: 18,
        qty: 1,
        cellRef: 'E6:F6',
        formula: `${drwW - 36} × ${p.drawerDepth - 36}`,
        sheetFormulaE: '=B14-2*18',
        sheetFormulaF: '=B16-2*18',
        color: '#F59E0B',
        desc: 'Inset bottom panel'
      },
      {
        id: 'tbl-facade',
        name: 'Drawer Front Facade',
        group: 'drawer',
        w: bayW - 2 * p.facadeGap,
        h: p.apronHeight - 2 * p.facadeGap,
        t: 18,
        qty: 1,
        cellRef: 'E8:F8',
        formula: `${bayW - 2 * p.facadeGap} × ${p.apronHeight - 2 * p.facadeGap}`,
        sheetFormulaE: '=BAY_W-2*B22',
        sheetFormulaF: '=APRON_H-2*B22',
        color: '#059669',
        desc: 'Inset drawer front with 2.5mm reveal'
      }
    ];
  }

  const derivedBoxW = cleanW - 2 * p.woodThick - 2 * p.railingGap + (p.joineryMode === 'sheet20' ? p.b14PlusOne : 0);
  const drawerBoxW = p.drawerBoxWidth > 0 ? p.drawerBoxWidth : derivedBoxW;
  const drawerInternalW = p.drawerInnerWidth > 0 ? p.drawerInnerWidth : drawerBoxW - 2 * p.woodThick;
  const drawerInternalD =
    p.drawerInnerDepth > 0
      ? p.drawerInnerDepth
      : p.joineryMode === 'recommended'
        ? p.drawerDepth - 2 * p.woodThick
        : p.drawerDepth;
  const drawerCount = p.topology === 'CABINET_MULTI_DRAWER' ? 3 : 1;
  const shelfCount = p.topology === 'CABINET_MULTI_DRAWER' ? 3 : 2;
  const facadeW = p.facadeWidth > 0 ? p.facadeWidth : Math.round(cleanW - 2 * p.facadeGap);
  const facadeH = p.facadeHeight > 0
    ? p.facadeHeight
    : Math.round(p.topology === 'CABINET_MULTI_DRAWER' ? (cleanH - 4 * p.facadeGap) / 3 : cleanH - 2 * p.facadeGap);

  return [
    {
      id: 'carcass-side',
      name: 'Carcass Side Walls',
      group: 'carcass',
      w: cleanD,
      h: cleanH,
      t: p.woodThick,
      qty: 2,
      cellRef: 'E2:G2',
      formula: `${cleanD} × ${cleanH}`,
      sheetFormulaE: '=B10',
      sheetFormulaF: '=B9',
      color: '#D97706',
      desc: 'Left & right inset carcass panels'
    },
    {
      id: 'carcass-top-bot',
      name: 'Carcass Top & Bottom',
      group: 'carcass',
      w: cleanW - 2 * p.woodThick,
      h: cleanD,
      t: p.woodThick,
      qty: 2,
      cellRef: 'E3:G3',
      formula: `${cleanW - 2 * p.woodThick} × ${cleanD}`,
      sheetFormulaE: '=B8-2*B6',
      sheetFormulaF: '=B10',
      color: '#B45309',
      desc: 'Horizontal structural panels'
    },
    {
      id: 'drawer-side-walls',
      name: 'Drawer Side Walls',
      group: 'drawer',
      w: p.drawerDepth,
      h: p.sidePanelHeight,
      t: p.woodThick,
      qty: 2 * drawerCount,
      cellRef: 'E5:G5',
      formula: `${p.drawerDepth} × ${p.sidePanelHeight}`,
      sheetFormulaE: '=B16',
      sheetFormulaF: `${p.sidePanelHeight}`,
      color: '#0EA5E9',
      desc: 'Mount to ball-bearing slides'
    },
    {
      id: 'drawer-shelves',
      name: 'Drawer Bottoms / Trays',
      group: 'drawer',
        w: Math.round(Math.max(20, drawerInternalW)),
        h: Math.round(Math.max(20, drawerInternalD)),
      t: p.woodThick,
      qty: shelfCount,
      cellRef: 'E6:G6',
      formula: `${Math.round(drawerInternalW)} × ${Math.round(drawerInternalD)}`,
      sheetFormulaE: '=B19',
      sheetFormulaF: p.joineryMode === 'recommended' ? '=B16-2*B6' : '=B20',
      color: '#F59E0B',
      desc: 'Horizontal tray panels'
    },
    {
      id: 'drawer-front-back',
      name: 'Drawer Front & Rear',
      group: 'drawer',
      w: Math.round(drawerBoxW),
      h: p.topology === 'CABINET_MULTI_DRAWER' ? p.sidePanelHeight : p.drawerHeight,
      t: p.woodThick,
      qty: 2 * drawerCount,
      cellRef: 'E7:G7',
      formula: `${Math.round(drawerBoxW)} × ${p.topology === 'CABINET_MULTI_DRAWER' ? p.sidePanelHeight : p.drawerHeight}`,
      sheetFormulaE: '=B14',
      sheetFormulaF: '=B15',
      color: '#FBBF24',
      desc: 'Front and rear tie panels (=B14 × B15)'
    },
    {
      id: 'facade-panel',
      name: 'Exterior Facade',
      group: 'drawer',
        w: Math.round(facadeW),
        h: Math.round(
          p.topology === 'CABINET_MULTI_DRAWER' && p.facadeHeight <= 0
            ? (cleanH - 4 * p.facadeGap) / 3
            : facadeH
        ),
      t: p.woodThick,
      qty: drawerCount,
      cellRef: 'E8:G8',
      formula: `${Math.round(cleanW - 2 * p.facadeGap)} × ${Math.round(
        p.topology === 'CABINET_MULTI_DRAWER'
          ? (cleanH - 4 * p.facadeGap) / 3
          : cleanH - 2 * p.facadeGap
      )}`,
      sheetFormulaE: '=B8-2*B22',
      sheetFormulaF: '=B9-2*B22',
      color: '#059669',
      desc: 'Front facade with perimeter reveal'
    }
  ];
}

export function buildTopology3D(p: StudioParams): Box3DPrimitive[] {
  const boxes: Box3DPrimitive[] = [];
  const W = p.envWidth;
  const H = p.envHeight;
  const D = p.envDepth;
  const M = p.metalSize;
  const T = p.woodThick;

  if (p.topology === 'TABLE_WORKBENCH_DRAWER') {
    const ovh = p.tableOverhang;
    const fX0 = ovh;
    const fX1 = W - ovh;
    const fZ0 = ovh;
    const fZ1 = D - ovh;
    const topY0 = H - T;

    // 4 vertical steel legs
    const legCoords = [
      ['leg-fl', 'Front-Left Steel Leg', fX0, fX0 + M, fZ1 - M, fZ1],
      ['leg-fr', 'Front-Right Steel Leg', fX1 - M, fX1, fZ1 - M, fZ1],
      ['leg-bl', 'Rear-Left Steel Leg', fX0, fX0 + M, fZ0, fZ0 + M],
      ['leg-br', 'Rear-Right Steel Leg', fX1 - M, fX1, fZ0, fZ0 + M]
    ] as const;

    for (const [id, name, x0, x1, z0, z1] of legCoords) {
      boxes.push({
        id,
        partId: 'steel-frame',
        name,
        group: 'frame',
        x0,
        x1,
        y0: 0,
        y1: topY0,
        z0,
        z1,
        color: '#64748B',
        edgeColor: '#334155',
        alpha: 0.92,
        dims: `${M}×${topY0}×${M}`,
        formula: 'Steel 40×40mm Leg'
      });
    }

    // Upper steel perimeter aprons
    boxes.push(
      {
        id: 'apron-rear',
        partId: 'steel-frame',
        name: 'Rear Upper Steel Apron',
        group: 'frame',
        x0: fX0 + M,
        x1: fX1 - M,
        y0: topY0 - M,
        y1: topY0,
        z0: fZ0,
        z1: fZ0 + M,
        color: '#64748B',
        edgeColor: '#334155',
        alpha: 0.9,
        dims: `${fX1 - fX0 - 2 * M}×${M}×${M}`,
        formula: 'Upper Frame Tie'
      },
      {
        id: 'apron-left',
        partId: 'steel-frame',
        name: 'Left Upper Steel Apron',
        group: 'frame',
        x0: fX0,
        x1: fX0 + M,
        y0: topY0 - M,
        y1: topY0,
        z0: fZ0 + M,
        z1: fZ1 - M,
        color: '#64748B',
        edgeColor: '#334155',
        alpha: 0.9,
        dims: `${M}×${M}×${fZ1 - fZ0 - 2 * M}`,
        formula: 'Side Frame Tie'
      },
      {
        id: 'apron-right',
        partId: 'steel-frame',
        name: 'Right Upper Steel Apron',
        group: 'frame',
        x0: fX1 - M,
        x1: fX1,
        y0: topY0 - M,
        y1: topY0,
        z0: fZ0 + M,
        z1: fZ1 - M,
        color: '#64748B',
        edgeColor: '#334155',
        alpha: 0.9,
        dims: `${M}×${M}×${fZ1 - fZ0 - 2 * M}`,
        formula: 'Side Frame Tie'
      }
    );

    // Lower shelf panel
    boxes.push({
      id: 'tbl-shelf-box',
      partId: 'tbl-shelf',
      name: 'Lower Stretcher Shelf (E3:F3)',
      group: 'carcass',
      x0: fX0 + M,
      x1: fX1 - M,
      y0: p.stretcherY,
      y1: p.stretcherY + 18,
      z0: fZ0 + M,
      z1: fZ1 - M,
      color: '#D97706',
      edgeColor: '#92400E',
      alpha: 0.88,
      dims: `${fX1 - fX0 - 2 * M}×18×${fZ1 - fZ0 - 2 * M}`,
      formula: '=B1-2*B24-2*B5',
      cellRef: 'E3:F3'
    });

    // Tabletop slab
    boxes.push({
      id: 'tbl-top-box',
      partId: 'tbl-top',
      name: 'Tabletop Slab (E2:F2)',
      group: 'tabletop',
      x0: 0,
      x1: W,
      y0: topY0,
      y1: H,
      z0: 0,
      z1: D,
      color: '#F59E0B',
      edgeColor: '#B45309',
      alpha: 0.85,
      dims: `${W}×${T}×${D}`,
      formula: '=B1 × B3',
      cellRef: 'E2:F2'
    });

    // Center Under-Top Drawer & GTV Slides
    const bayW = Math.round((fX1 - fX0) * 0.4);
    const bayX0 = Math.round((W - bayW) / 2);
    const bayX1 = bayX0 + bayW;
    const drwY0 = topY0 - p.apronHeight;
    const drwZ1 = fZ1 - 18;
    const drwZ0 = drwZ1 - p.drawerDepth;

    boxes.push(
      {
        id: 'tbl-rail-L',
        partId: 'gtv-rail',
        name: 'GTV Meridian Slide Left (B12)',
        group: 'railings',
        x0: bayX0,
        x1: bayX0 + p.railingGap,
        y0: drwY0 + 25,
        y1: drwY0 + 70,
        z0: drwZ0,
        z1: drwZ1,
        color: '#E11D48',
        edgeColor: '#9F1239',
        alpha: 0.95,
        dims: `${p.railingGap}×45×${p.drawerDepth}`,
        formula: '=B12 (13mm clearance)',
        cellRef: 'B12',
        isRailing: true,
        railSide: 'L'
      },
      {
        id: 'tbl-rail-R',
        partId: 'gtv-rail',
        name: 'GTV Meridian Slide Right (B12)',
        group: 'railings',
        x0: bayX1 - p.railingGap,
        x1: bayX1,
        y0: drwY0 + 25,
        y1: drwY0 + 70,
        z0: drwZ0,
        z1: drwZ1,
        color: '#E11D48',
        edgeColor: '#9F1239',
        alpha: 0.95,
        dims: `${p.railingGap}×45×${p.drawerDepth}`,
        formula: '=B12 (13mm clearance)',
        cellRef: 'B12',
        isRailing: true,
        railSide: 'R'
      },
      {
        id: 'tbl-drw-L',
        partId: 'tbl-drw-sides',
        name: 'Center Drawer Left Wall (E5:F5)',
        group: 'drawer',
        x0: bayX0 + p.railingGap,
        x1: bayX0 + p.railingGap + 18,
        y0: drwY0 + 10,
        y1: drwY0 + 10 + p.sidePanelHeight,
        z0: drwZ0,
        z1: drwZ1,
        color: '#0EA5E9',
        edgeColor: '#0369A1',
        alpha: 0.9,
        dims: `18×${p.sidePanelHeight}×${p.drawerDepth}`,
        formula: '=B16 × F5',
        cellRef: 'E5:F5'
      },
      {
        id: 'tbl-drw-R',
        partId: 'tbl-drw-sides',
        name: 'Center Drawer Right Wall (E5:F5)',
        group: 'drawer',
        x0: bayX1 - p.railingGap - 18,
        x1: bayX1 - p.railingGap,
        y0: drwY0 + 10,
        y1: drwY0 + 10 + p.sidePanelHeight,
        z0: drwZ0,
        z1: drwZ1,
        color: '#0EA5E9',
        edgeColor: '#0369A1',
        alpha: 0.9,
        dims: `18×${p.sidePanelHeight}×${p.drawerDepth}`,
        formula: '=B16 × F5',
        cellRef: 'E5:F5'
      },
      {
        id: 'tbl-drw-bot',
        partId: 'tbl-drw-bottom',
        name: 'Center Drawer Bottom (E6:F6)',
        group: 'drawer',
        x0: bayX0 + p.railingGap + 18,
        x1: bayX1 - p.railingGap - 18,
        y0: drwY0 + 10,
        y1: drwY0 + 28,
        z0: drwZ0 + 18,
        z1: drwZ1 - 18,
        color: '#F59E0B',
        edgeColor: '#B45309',
        alpha: 0.9,
        dims: `${bayW - 2 * p.railingGap - 36}×18×${p.drawerDepth - 36}`,
        formula: '=B19 × (B16-2*B6)',
        cellRef: 'E6:F6'
      },
      {
        id: 'tbl-drw-facade',
        partId: 'tbl-facade',
        name: 'Under-Top Drawer Facade (E8:F8)',
        group: 'drawer',
        x0: bayX0 + p.facadeGap,
        x1: bayX1 - p.facadeGap,
        y0: drwY0 + p.facadeGap,
        y1: topY0 - p.facadeGap,
        z0: fZ1 - 18,
        z1: fZ1,
        color: '#059669',
        edgeColor: '#065F46',
        alpha: 0.88,
        dims: `${bayW - 2 * p.facadeGap}×${p.apronHeight - 2 * p.facadeGap}×18`,
        formula: '=BAY_W-2*B22',
        cellRef: 'E8:F8'
      }
    );

    return boxes;
  }

  // CABINET_CARGO_PULLOUT or CABINET_MULTI_DRAWER
  // 1. 20x20mm Perimeter Steel Tube Posts (4 vertical posts + top/bottom rails)
  const posts = [
    ['post-fl', 'Front-Left Steel Tube (B5)', 0, M, D - M, D],
    ['post-fr', 'Front-Right Steel Tube (B5)', W - M, W, D - M, D],
    ['post-bl', 'Rear-Left Steel Tube (B5)', 0, M, 0, M],
    ['post-br', 'Rear-Right Steel Tube (B5)', W - M, W, 0, M]
  ] as const;

  for (const [id, name, x0, x1, z0, z1] of posts) {
    boxes.push({
      id,
      partId: 'steel-frame',
      name,
      group: 'frame',
      x0,
      x1,
      y0: 0,
      y1: H,
      z0,
      z1,
      color: '#8A8680',
      edgeColor: '#4A4743',
      alpha: 0.94,
      dims: `${M}×${H}×${M}`,
      formula: 'steel tube',
      cellRef: 'frame'
    });
  }

  const rails: Array<[string, string, number, number, number, number, number, number]> = [
    ['rail-front-bot', 'Front bottom rail', M, W - M, 0, M, D - M, D],
    ['rail-front-top', 'Front top rail', M, W - M, H - M, H, D - M, D],
    ['rail-rear-bot', 'Rear bottom rail', M, W - M, 0, M, 0, M],
    ['rail-rear-top', 'Rear top rail', M, W - M, H - M, H, 0, M]
  ];
  for (const [id, name, x0, x1, y0, y1, z0, z1] of rails) {
    boxes.push({
      id,
      partId: 'steel-frame',
      name,
      group: 'frame',
      x0,
      x1,
      y0,
      y1,
      z0,
      z1,
      color: '#8A8680',
      edgeColor: '#4A4743',
      alpha: 0.92,
      dims: `${x1 - x0}×${M}×${M}`,
      formula: 'steel tube',
      cellRef: 'frame'
    });
  }

  const cleanW = W - 2 * M;
  const cleanH = H - 2 * M;
  const cleanD = D - 2 * M;
  const sideY0 = M;
  const sideY1 = H - M;

  if (p.hasCarcassSides) {
    boxes.push(
      {
        id: 'carcass-L',
        partId: 'carcass-side',
        name: 'Left Carcass Side Wall',
        group: 'carcass',
        x0: M,
        x1: M + T,
        y0: sideY0,
        y1: sideY1,
        z0: M,
        z1: D - M,
        color: '#C4A574',
        edgeColor: '#8B6B3D',
        alpha: 0.88,
        dims: `${T}×${sideY1 - sideY0}×${cleanD}`,
        formula: 'clean D × clean H',
        cellRef: 'sides'
      },
      {
        id: 'carcass-R',
        partId: 'carcass-side',
        name: 'Right Carcass Side Wall',
        group: 'carcass',
        x0: W - M - T,
        x1: W - M,
        y0: sideY0,
        y1: sideY1,
        z0: M,
        z1: D - M,
        color: '#C4A574',
        edgeColor: '#8B6B3D',
        alpha: 0.88,
        dims: `${T}×${sideY1 - sideY0}×${cleanD}`,
        formula: 'clean D × clean H',
        cellRef: 'sides'
      }
    );
  }

  if (p.hasCarcassBottom) {
    const botX0 = p.hasCarcassSides ? M + T : M;
    const botX1 = p.hasCarcassSides ? W - M - T : W - M;
    boxes.push({
      id: 'carcass-bot',
      partId: 'carcass-top-bot',
      name: 'Carcass Bottom Panel',
      group: 'carcass',
      x0: M,
      x1: W - M,
      y0: M,
      y1: M + T,
      z0: M,
      z1: D - M,
      color: '#B08968',
      edgeColor: '#7C5A3A',
      alpha: 0.9,
      dims: `${cleanW}×${T}×${cleanD}`,
      formula: 'clean W × clean D',
      cellRef: 'bottom'
    });
    void botX0;
    void botX1;
  }

  if (p.hasCarcassTop) {
    boxes.push({
      id: 'carcass-top',
      partId: 'carcass-top-bot',
      name: 'Carcass Top Panel',
      group: 'carcass',
      x0: M,
      x1: W - M,
      y0: H - M - T,
      y1: H - M,
      z0: M,
      z1: D - M,
      color: '#B08968',
      edgeColor: '#7C5A3A',
      alpha: 0.9,
      dims: `${cleanW}×${T}×${cleanD}`,
      formula: 'clean W × clean D',
      cellRef: 'top'
    });
  }

  // Drawer sits between the steel posts. Slides take railingGap; the box uses
  // sheet outer/inner widths when present so front 200 / inner 164 stay coherent.
  const derivedOuter = Math.round(
    cleanW - (p.hasCarcassSides ? 2 * T : 0) - 2 * p.railingGap + (p.joineryMode === 'sheet20' ? p.b14PlusOne : 0)
  );
  const drawerOuterW = Math.min(
    p.drawerBoxWidth > 0 ? p.drawerBoxWidth : derivedOuter,
    Math.max(40, cleanW - 2)
  );
  const innerW = Math.min(
    p.drawerInnerWidth > 0 ? p.drawerInnerWidth : Math.max(20, drawerOuterW - 2 * T),
    Math.max(20, drawerOuterW - 2 * T)
  );
  const woodDepth = p.drawerInnerDepth > 0 ? p.drawerInnerDepth : p.drawerDepth;
  const slideDepth = Math.max(p.drawerDepth, woodDepth);

  const boxX0 = (W - drawerOuterW) / 2;
  const boxX1 = boxX0 + drawerOuterW;
  const railGap = Math.max(8, Math.min(p.railingGap, (cleanW - drawerOuterW) / 2));
  const railXLeft0 = boxX0 - railGap;
  const railXLeft1 = boxX0;
  const railXRight0 = boxX1;
  const railXRight1 = boxX1 + railGap;

  const zFront = D - M;
  const zWoodBack = zFront - woodDepth;
  const zSlideBack = zFront - slideDepth;

  const floorY = M + (p.hasCarcassBottom ? T : 0);
  const tiers =
    p.topology === 'CABINET_MULTI_DRAWER'
      ? [
          { idx: 1, y0: floorY + 12, h: p.sidePanelHeight },
          { idx: 2, y0: Math.round(H * 0.38), h: p.sidePanelHeight },
          { idx: 3, y0: Math.round(H * 0.67), h: p.sidePanelHeight }
        ]
      : [{ idx: 1, y0: floorY + 8, h: p.drawerHeight }];

  for (const tier of tiers) {
    const railY0 = tier.y0 + Math.min(28, Math.max(8, p.sidePanelHeight * 0.2));
    const wallZ0 = zWoodBack;
    const wallZ1 = zFront - T;
    boxes.push(
      {
        id: `rail-L-${tier.idx}`,
        partId: 'gtv-rail',
        name: `Slide L${tier.idx}`,
        group: 'railings',
        x0: railXLeft0,
        x1: railXLeft1,
        y0: railY0,
        y1: railY0 + 45,
        z0: zSlideBack,
        z1: zFront - T,
        color: '#E11D48',
        edgeColor: '#9F1239',
        alpha: 0.96,
        dims: `${railGap}×45×${slideDepth}`,
        formula: 'slide clearance',
        cellRef: 'railing',
        isRailing: true,
        screwY: railY0 + 22.5,
        railSide: 'L'
      },
      {
        id: `rail-R-${tier.idx}`,
        partId: 'gtv-rail',
        name: `Slide R${tier.idx}`,
        group: 'railings',
        x0: railXRight0,
        x1: railXRight1,
        y0: railY0,
        y1: railY0 + 45,
        z0: zSlideBack,
        z1: zFront - T,
        color: '#E11D48',
        edgeColor: '#9F1239',
        alpha: 0.96,
        dims: `${railGap}×45×${slideDepth}`,
        formula: 'slide clearance',
        cellRef: 'railing',
        isRailing: true,
        screwY: railY0 + 22.5,
        railSide: 'R'
      },
      {
        id: `drw-wall-L-${tier.idx}`,
        partId: 'drawer-side-walls',
        name: `Drawer Side Left #${tier.idx}`,
        group: 'drawer',
        x0: boxX0,
        x1: boxX0 + T,
        y0: tier.y0,
        y1: tier.y0 + p.sidePanelHeight,
        z0: wallZ0,
        z1: wallZ1,
        color: '#7DD3FC',
        edgeColor: '#0369A1',
        alpha: 0.92,
        dims: `${T}×${p.sidePanelHeight}×${woodDepth}`,
        formula: 'side panel',
        cellRef: 'drawer-side'
      },
      {
        id: `drw-wall-R-${tier.idx}`,
        partId: 'drawer-side-walls',
        name: `Drawer Side Right #${tier.idx}`,
        group: 'drawer',
        x0: boxX1 - T,
        x1: boxX1,
        y0: tier.y0,
        y1: tier.y0 + p.sidePanelHeight,
        z0: wallZ0,
        z1: wallZ1,
        color: '#7DD3FC',
        edgeColor: '#0369A1',
        alpha: 0.92,
        dims: `${T}×${p.sidePanelHeight}×${woodDepth}`,
        formula: 'side panel',
        cellRef: 'drawer-side'
      },
      {
        id: `drw-shelf-bot-${tier.idx}`,
        partId: 'drawer-shelves',
        name: `Drawer Bottom #${tier.idx}`,
        group: 'drawer',
        x0: boxX0 + T,
        x1: boxX0 + T + innerW,
        y0: tier.y0,
        y1: tier.y0 + T,
        z0: wallZ0,
        z1: wallZ1,
        color: '#E8C39E',
        edgeColor: '#A16207',
        alpha: 0.94,
        dims: `${innerW}×${T}×${woodDepth}`,
        formula: 'drawer clean',
        cellRef: 'drawer-bottom'
      }
    );

    if (p.topology === 'CABINET_CARGO_PULLOUT') {
      const midY = tier.y0 + Math.round(p.drawerHeight * 0.52);
      boxes.push(
        {
          id: 'drw-shelf-upper',
          partId: 'drawer-shelves',
          name: 'Middle Cargo Shelf',
          group: 'drawer',
          x0: boxX0 + T,
          x1: boxX0 + T + innerW,
          y0: midY,
          y1: midY + T,
          z0: wallZ0,
          z1: wallZ1,
          color: '#E8C39E',
          edgeColor: '#A16207',
          alpha: 0.92,
          dims: `${innerW}×${T}×${woodDepth}`,
          formula: 'middle panel',
          cellRef: 'drawer-middle'
        },
        {
          id: 'drw-back-tall',
          partId: 'drawer-front-back',
          name: 'Drawer Back',
          group: 'drawer',
          x0: boxX0,
          x1: boxX1,
          y0: tier.y0,
          y1: tier.y0 + p.drawerHeight,
          z0: zWoodBack,
          z1: zWoodBack + T,
          color: '#F5D0A6',
          edgeColor: '#B45309',
          alpha: 0.9,
          dims: `${drawerOuterW}×${p.drawerHeight}×${T}`,
          formula: 'drawer W × H',
          cellRef: 'drawer-back'
        },
        {
          id: 'drw-front-tall',
          partId: 'drawer-front-back',
          name: 'Drawer Front',
          group: 'drawer',
          x0: boxX0,
          x1: boxX1,
          y0: tier.y0,
          y1: tier.y0 + p.drawerHeight,
          z0: zFront - 2 * T,
          z1: zFront - T,
          color: '#F5D0A6',
          edgeColor: '#B45309',
          alpha: 0.9,
          dims: `${drawerOuterW}×${p.drawerHeight}×${T}`,
          formula: 'drawer W × H',
          cellRef: 'drawer-front'
        }
      );
    }
  }

  const facadeW = p.facadeWidth > 0 ? p.facadeWidth : Math.max(40, cleanW - 2 * p.facadeGap);
  const facadeX0 = (W - facadeW) / 2;
  const facadeX1 = facadeX0 + facadeW;

  if (p.topology === 'CABINET_MULTI_DRAWER') {
    const fH = p.facadeHeight > 0 ? p.facadeHeight : (cleanH - 4 * p.facadeGap) / 3;
    for (let i = 0; i < 3; i++) {
      const fy0 = M + p.facadeGap + i * (fH + p.facadeGap);
      boxes.push({
        id: `facade-${i + 1}`,
        partId: 'facade-panel',
        name: `Drawer Facade #${i + 1}`,
        group: 'drawer',
        x0: facadeX0,
        x1: facadeX1,
        y0: fy0,
        y1: fy0 + fH,
        z0: D - M - T,
        z1: D - M,
        color: '#5C7A5C',
        edgeColor: '#3F5D3F',
        alpha: 0.9,
        dims: `${Math.round(facadeW)}×${Math.round(fH)}×${T}`,
        formula: 'facade',
        cellRef: 'facade'
      });
    }
  } else {
    const facadeH = p.facadeHeight > 0 ? p.facadeHeight : Math.max(40, cleanH - 2 * p.facadeGap);
    const fy0 = M + (cleanH - facadeH) / 2;
    boxes.push({
      id: 'facade-main',
      partId: 'facade-panel',
      name: 'Cargo Facade',
      group: 'drawer',
      x0: facadeX0,
      x1: facadeX1,
      y0: fy0,
      y1: fy0 + facadeH,
      z0: D - M - T,
      z1: D - M,
      color: '#5C7A5C',
      edgeColor: '#3F5D3F',
      alpha: 0.9,
      dims: `${Math.round(facadeW)}×${Math.round(facadeH)}×${T}`,
      formula: 'facade',
      cellRef: 'facade'
    });
  }

  return boxes;
}

