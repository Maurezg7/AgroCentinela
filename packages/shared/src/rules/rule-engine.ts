import type { ClimateCache, BedrockAlertResponse } from '../index';

const FROST_THRESHOLD_C = 3;

export interface RuleEngineInput {
  crop: string;
  stage: string;
  climate: ClimateCache;
}

/**
 * Deterministic rule engine for frost and hydric stress alerts.
 * Returns null if no risk detected.
 */
export function evaluateRules(input: RuleEngineInput): BedrockAlertResponse | null {
  const { crop, stage, climate } = input;
  const isSensitiveStage = ['floracion', 'llenado'].includes(stage);
  const severityBoost = isSensitiveStage ? 1 : 0;

  // Frost rule: check hourly48h
  const temps = climate.hourly48h.map((h) => h.temperature2m);
  const minTemp = Math.min(...temps);

  if (minTemp < FROST_THRESHOLD_C) {
    const baseSeverity = minTemp < 0 ? 5 : 4;
    const severity = Math.min(5, baseSeverity + severityBoost) as 1 | 2 | 3 | 4 | 5;
    return {
      message: `Riesgo de helada para tu ${crop}: mínima de ${minTemp.toFixed(1)}°C en las próximas 48h.`,
      severity,
      recommendedAction: 'Cubrir con manta térmica antes del anochecer.',
      condition: 'helada',
    };
  }

  // Hydric stress rule
  const totalPrecip = climate.days.reduce((sum, d) => sum + d.precipitationSum, 0);
  const avgSoilMoisture = climate.hourly48h.reduce((s, h) => s + h.soilMoisture0to10cm, 0)
    / climate.hourly48h.length;
  const avgEt0 = climate.days.reduce((s, d) => s + d.et0, 0) / climate.days.length;

  if (totalPrecip < 5 && avgSoilMoisture < 20 && avgEt0 > 5) {
    const severity = Math.min(5, 3 + severityBoost) as 1 | 2 | 3 | 4 | 5;
    return {
      message: `Estrés hídrico creciente en tu ${crop}: sin lluvias significativas en 7 días.`,
      severity,
      recommendedAction: 'Regar antes de las 10am para minimizar evaporación.',
      condition: 'estres-hidrico',
    };
  }

  return null;
}
