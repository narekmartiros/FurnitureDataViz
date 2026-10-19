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
}
