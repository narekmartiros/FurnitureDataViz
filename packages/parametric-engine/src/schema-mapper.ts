/**
 * Universal Google Sheets Importer & Semantic Zone Detector
 * Maps arbitrary spreadsheet tabs into canonical Cabinet or Table parameters and Cut-List rows.
 */
export type TopologyTemplateType = 'CABINET_CARGO_PULLOUT' | 'CABINET_MULTI_DRAWER' | 'TABLE_WORKBENCH_DRAWER';

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
  | 'DRAWER_CLEAN_DEPTH'
  | 'FACADE_GAP'
  | 'TABLE_OVERHANG'
  | 'APRON_HEIGHT'
  | 'STRETCHER_ELEVATION';

export interface MappedSheetSchema {
  sheetId: string;
  sheetTitle: string;
  topology: TopologyTemplateType;
  parameterCells: Record<CanonicalParamRole, string>;
  cutListRange: {
    startRow: number;
    endRow: number;
    nameCol: string;
    widthCol: string;
    heightCol: string;
    qtyCol: string;
  };
}

export function inferTopologyFromSheet(rows: (string | number)[][]): TopologyTemplateType {
  const flatText = rows.flat().join(' ').toLowerCase();
  if (flatText.includes('table') || flatText.includes('apron') || flatText.includes('workbench') || flatText.includes('стол')) {
    return 'TABLE_WORKBENCH_DRAWER';
  }
  if (flatText.includes('3-drawer') || flatText.includes('multi drawer')) {
    return 'CABINET_MULTI_DRAWER';
  }
  return 'CABINET_CARGO_PULLOUT';
}
