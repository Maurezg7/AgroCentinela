import { z } from 'zod';

export const HourlyForecastSchema = z.object({
  time: z.string().datetime(),
  temperature2m: z.number(),
  relativeHumidity2m: z.number().min(0).max(100),
  precipitation: z.number().min(0),
  windSpeed10m: z.number().min(0),
  soilMoisture0to10cm: z.number().min(0),
});

export const DailyForecastSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  temperatureMax: z.number(),
  temperatureMin: z.number(),
  precipitationSum: z.number().min(0),
  et0: z.number().min(0),
});

/**
 * Modelo unificado: un solo ítem por parcela con SK = CLIMATE#LATEST,
 * sobrescrito en cada ingesta. `hourly48h` contiene las primeras 48 horas
 * de datos horarios aplanados para consumo del motor de reglas y Prompt API.
 * Los días 3-7 quedan solo con agregados diarios (sin detalle horario).
 *
 * Mapeo desde Open-Meteo:
 * - days[]: se construye desde daily.time, daily.temperature_2m_max/min,
 *   daily.precipitation_sum, daily.et0_fao_evapotranspiration (7 días).
 * - hourly48h[]: se recorta hourly.time/.temperature_2m/.relative_humidity_2m/
 *   .precipitation/.wind_speed_10m/.soil_moisture_0_to_7cm a las primeras 48
 *   entradas (indices 0..47).
 */
export const ClimateCacheSchema = z.object({
  parcelId: z.string().uuid(),
  fetchedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  days: z.array(DailyForecastSchema).min(1).max(7),
  hourly48h: z.array(HourlyForecastSchema).min(1).max(48),
});

export type HourlyForecast = z.infer<typeof HourlyForecastSchema>;
export type DailyForecast = z.infer<typeof DailyForecastSchema>;
export type ClimateCache = z.infer<typeof ClimateCacheSchema>;
