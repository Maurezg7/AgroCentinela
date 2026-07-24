import { BedrockAlertResponseSchema, type BedrockAlertResponse, type ClimateCache } from '@agrocentinela/shared';

export type AiAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

/**
 * Check Prompt API (LanguageModel) availability.
 */
export async function checkOnDeviceAvailability(): Promise<AiAvailability> {
  if (typeof LanguageModel === 'undefined') return 'unavailable';
  try {
    const status = await LanguageModel.availability();
    if (status === 'available') return 'available';
    if (status === 'downloadable') return 'downloadable';
    if (status === 'downloading') return 'downloading';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Generate alert using on-device Prompt API.
 * Returns null if model unavailable, response invalid, or failure.
 */
export async function generateOnDevice(
  crop: string,
  stage: string,
  climate: ClimateCache,
): Promise<BedrockAlertResponse | null> {
  if (typeof LanguageModel === 'undefined') return null;

  const availability = await checkOnDeviceAvailability();
  if (availability !== 'available') return null;

  const prompt = buildPrompt(crop, stage, climate);

  try {
    const session = await LanguageModel.create({
      expectedInputLanguages: ['es'],
      expectedOutputLanguages: ['es'],
    });
    const response = await session.prompt(prompt);
    session.destroy();
    return parseAndValidate(response);
  } catch {
    return null;
  }
}

function buildPrompt(crop: string, stage: string, climate: ClimateCache): string {
  // Only use first 3 days for context size constraint
  const days3 = climate.days.slice(0, 3);
  const temps = climate.hourly48h.slice(0, 48).map((h) => h.temperature2m);
  const dailySummary = days3.map((d) =>
    `${d.date}: max ${d.temperatureMax}°C, min ${d.temperatureMin}°C, lluvia ${d.precipitationSum}mm`
  ).join('\n');

  return `Sos un agrónomo. Cultivo: ${crop}, etapa: ${stage}.
Pronóstico 3 días:
${dailySummary}
Temperaturas horarias 48h (°C): [${temps.join(',')}]

Respondé ÚNICAMENTE con JSON:
{"message":"texto breve","severity":<1-5>,"recommendedAction":"acción concreta","condition":"helada"|"estres-hidrico"}

"condition" solo puede ser "helada" o "estres-hidrico". Sin markdown ni explicación.`;
}

function parseAndValidate(raw: string): BedrockAlertResponse | null {
  try {
    const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
    const json: unknown = JSON.parse(cleaned);
    const result = BedrockAlertResponseSchema.safeParse(json);
    if (!result.success) return null;
    return sanitize(result.data);
  } catch {
    return null;
  }
}

function sanitize(data: BedrockAlertResponse): BedrockAlertResponse {
  const strip = (s: string) => s.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  return {
    ...data,
    message: strip(data.message),
    recommendedAction: strip(data.recommendedAction),
  };
}
