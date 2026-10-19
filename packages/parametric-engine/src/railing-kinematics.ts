/**
 * Hardware Catalog (GTV Meridian, Blum Tandem, Hettich Quadro) & System-32 Drilling Calculator
 */
export interface HardwareSlideProfile {
  id: 'gtv_meridian' | 'blum_tandem' | 'hettich_quadro';
  brand: string;
  model: string;
  nominalLengths: number[];
  railHeightMm: number;
  sideClearanceMm: number;
  toleranceMm: number;
  maxLoadKg: number;
  system32HoleOffsets: number[];
}

export const HARDWARE_CATALOG: Record<HardwareSlideProfile['id'], HardwareSlideProfile> = {
  gtv_meridian: {
    id: 'gtv_meridian',
    brand: 'GTV',
    model: 'МЕРИДИАН (Meridian) Ball-Bearing Soft-Close',
    nominalLengths: [300, 350, 400, 450, 500, 550],
    railHeightMm: 45,
    sideClearanceMm: 12.7,
    toleranceMm: 0.5,
    maxLoadKg: 40,
    system32HoleOffsets: [37, 133, 261, 421, 485]
  },
  blum_tandem: {
    id: 'blum_tandem',
    brand: 'Blum',
    model: 'TANDEM Plus Blumotion 560H',
    nominalLengths: [350, 400, 450, 500, 550],
    railHeightMm: 44,
    sideClearanceMm: 13.0,
    toleranceMm: 0.5,
    maxLoadKg: 30,
    system32HoleOffsets: [37, 133, 261, 389, 453]
  },
  hettich_quadro: {
    id: 'hettich_quadro',
    brand: 'Hettich',
    model: 'Quadro V6 Silent System',
    nominalLengths: [350, 400, 450, 500, 550],
    railHeightMm: 45,
    sideClearanceMm: 12.5,
    toleranceMm: 0.5,
    maxLoadKg: 40,
    system32HoleOffsets: [37, 165, 261, 421, 485]
  }
};
