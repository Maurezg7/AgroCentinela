import { ClimateService } from './climate.service';
import { ClimateCacheSchema } from '@agrocentinela/shared';

// Real Open-Meteo response fixture (trimmed to relevant structure)
const OPEN_METEO_FIXTURE = {
  latitude: -24.78,
  longitude: -65.42,
  generationtime_ms: 0.5,
  utc_offset_seconds: 0,
  timezone: 'GMT',
  timezone_abbreviation: 'GMT',
  daily: {
    time: [
      '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26',
      '2026-07-27', '2026-07-28', '2026-07-29',
    ],
    temperature_2m_max: [22.1, 24.3, 19.8, 21.5, 23.0, 20.2, 18.9],
    temperature_2m_min: [8.2, 9.1, 7.5, 6.8, 10.2, 8.0, 5.5],
    precipitation_sum: [0, 0, 12.5, 3.2, 0, 0, 0.8],
    et0_fao_evapotranspiration: [3.1, 3.5, 2.8, 3.0, 3.4, 2.9, 2.7],
  },
  hourly: {
    time: generateHourlyTimes('2026-07-23', 168),
    temperature_2m: generateArray(168, (i) => 15 + Math.sin(i / 4) * 7),
    relative_humidity_2m: generateArray(168, (i) => 50 + Math.cos(i / 6) * 20),
    precipitation: generateArray(168, () => Math.random() < 0.1 ? 2.5 : 0),
    wind_speed_10m: generateArray(168, () => 5 + Math.random() * 10),
    soil_moisture_0_to_7cm: generateArray(168, () => 15 + Math.random() * 10),
  },
};

function generateHourlyTimes(startDate: string, count: number): string[] {
  const times: string[] = [];
  const base = new Date(`${startDate}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * 3600_000);
    // Mimics Open-Meteo format: "2026-07-23T00:00"
    const iso = d.toISOString();
    times.push(iso.slice(0, 16));
  }
  return times;
}

function generateArray(len: number, fn: (i: number) => number): number[] {
  return Array.from({ length: len }, (_, i) => Math.round(fn(i) * 10) / 10);
}

describe('ClimateService.mapToSchema', () => {
  let service: ClimateService;

  beforeEach(() => {
    // Instantiate with null dynamo/table since we only test mapToSchema
    service = new ClimateService(null as any, 'test-table');
  });

  it('should map a real Open-Meteo response to a valid ClimateCacheSchema', () => {
    const parcelId = '550e8400-e29b-41d4-a716-446655440000';

    // Access private method via any cast (acceptable in unit test)
    const result = (service as any).mapToSchema(parcelId, OPEN_METEO_FIXTURE);

    // Validate against the Zod schema
    const parsed = ClimateCacheSchema.safeParse(result);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.parcelId).toBe(parcelId);
      expect(parsed.data.days).toHaveLength(7);
      expect(parsed.data.hourly48h).toHaveLength(48);
    }
  });

  it('should normalize hourly times to full ISO 8601', () => {
    const parcelId = '550e8400-e29b-41d4-a716-446655440000';
    const result = (service as any).mapToSchema(parcelId, OPEN_METEO_FIXTURE);

    // Every hourly time should be full ISO 8601 with Z suffix
    for (const h of result.hourly48h) {
      expect(h.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    }
  });

  it('should keep daily dates as YYYY-MM-DD', () => {
    const parcelId = '550e8400-e29b-41d4-a716-446655440000';
    const result = (service as any).mapToSchema(parcelId, OPEN_METEO_FIXTURE);

    for (const d of result.days) {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('should take only first 48 hours from hourly data', () => {
    const parcelId = '550e8400-e29b-41d4-a716-446655440000';
    const result = (service as any).mapToSchema(parcelId, OPEN_METEO_FIXTURE);

    expect(result.hourly48h.length).toBe(48);
    // Fixture has 168 hours (7 days), should only take first 48
    expect(OPEN_METEO_FIXTURE.hourly.time.length).toBe(168);
  });
});
