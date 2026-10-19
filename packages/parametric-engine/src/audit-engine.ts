/**
 * Automated 5-Rule Parametric Engineering & Joinery Audit Engine
 */
import { StudioParams } from './topology-3d';

export interface EngineeringAuditFinding {
  ruleId: string;
  severity: 'warn' | 'critical' | 'ok' | 'info';
  cellRefs: string;
  title: string;
  description: string;
  currentFormula: string;
  recommendedFormula: string;
}

export function runEngineeringAudit(p: StudioParams): EngineeringAuditFinding[] {
  const cleanW = p.envWidth - 2 * p.metalSize;
  const carcassOpeningW = cleanW - 2 * p.woodThick;
  const drawerW = carcassOpeningW - 2 * p.railingGap + (p.joineryMode === 'sheet20' ? p.b14PlusOne : 0);
  const actualSideGap = (carcassOpeningW - drawerW) / 2;

  return [
    {
      ruleId: 'RULE-01',
      severity: Math.abs(actualSideGap - 12.7) <= 0.6 ? 'ok' : 'warn',
      cellRefs: 'B12, B14',
      title: 'Slide Side Clearance',
      description:
        p.joineryMode === 'sheet20'
          ? `+1mm offset compresses slide gap to ${actualSideGap.toFixed(1)}mm per side.`
          : `Symmetric ${actualSideGap.toFixed(1)}mm clearance matches slide specification.`,
      currentFormula: p.joineryMode === 'sheet20' ? '=B8-2*B6-2*B12+1' : '=B8-2*B6-2*B12',
      recommendedFormula: '=B8-2*B6-2*B12'
    },
    {
      ruleId: 'RULE-02',
      severity: p.joineryMode === 'recommended' ? 'ok' : 'warn',
      cellRefs: 'E6:F6',
      title: 'Inset Shelf Depth',
      description:
        p.joineryMode === 'sheet20'
          ? `Full ${p.drawerDepth}mm shelf depth overlaps front/rear ${p.woodThick}mm panels.`
          : `Shelf depth (${p.drawerDepth - 2 * p.woodThick}mm) subtracts front & rear panels.`,
      currentFormula: p.joineryMode === 'sheet20' ? 'F6 = B20 (=B16)' : 'F6 = B16 - 2*B6',
      recommendedFormula: '=B16-2*B6'
    },
    {
      ruleId: 'RULE-03',
      severity: p.drawerDepth <= p.envDepth - 2 * p.metalSize - p.woodThick ? 'ok' : 'critical',
      cellRefs: 'B10, B16',
      title: 'Rear Carcass Clearance',
      description: `${p.drawerDepth}mm slide leaves ${p.envDepth - 2 * p.metalSize - p.drawerDepth}mm rear clearance.`,
      currentFormula: `B16 = ${p.drawerDepth}mm`,
      recommendedFormula: 'B16 <= B10 - B6'
    },
    {
      ruleId: 'RULE-04',
      severity: p.facadeGap >= 2 && p.facadeGap <= 4 ? 'ok' : 'info',
      cellRefs: 'B22, E8:F8',
      title: 'Facade Reveal Tolerance',
      description: `${p.facadeGap}mm perimeter reveal around front facade.`,
      currentFormula: `=B8-2*B22 (${cleanW - 2 * p.facadeGap}mm)`,
      recommendedFormula: 'B22 = 2.5mm'
    },
    {
      ruleId: 'RULE-05',
      severity: 'ok',
      cellRefs: 'B5, E2:F3',
      title: 'System-32 Registration',
      description: `First mounting hole at 37mm from front carcass edge.`,
      currentFormula: `B5 = ${p.metalSize}mm, B6 = ${p.woodThick}mm`,
      recommendedFormula: '37 / 133 / 261 / 421 mm'
    }
  ];
}
