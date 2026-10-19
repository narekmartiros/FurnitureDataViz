/**
 * Automated 5-Rule Parametric Engineering & Joinery Audit Engine
 */
export interface EngineeringAuditFinding {
  ruleId: string;
  severity: 'warn' | 'critical' | 'ok' | 'info';
  cellRefs: string;
  title: string;
  description: string;
  currentFormula: string;
  recommendedFormula: string;
}
