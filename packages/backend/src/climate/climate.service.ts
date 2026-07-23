import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DYNAMO_CLIENT, TABLE_NAME } from '../dynamo/dynamo.constants';
import { ClimateCacheSchema, type ClimateCache } from '@agrocentinela/shared';
import { AppError } from '../common/errors/app-error';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;
const TTL_DAYS = 7;

@Injectable()
export class ClimateService {
  private readonly logger = new Logger(ClimateService.name);

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    @Inject(TABLE_NAME) private readonly tableName: string,
  ) {}

  async fetchAndPersist(parcelId: string, lat: number, lon: number): Promise<ClimateCache> {
    const raw = await this.fetchOpenMeteo(lat, lon);
    const cache = this.mapToSchema(parcelId, raw);

    const ttlEpoch = Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;
    await this.dynamo.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `PARCEL#${parcelId}`,
          SK: 'CLIMATE#LATEST',
          TTL: ttlEpoch,
          ...cache,
        },
      }),
    );
    return cache;
  }

  async getCached(parcelId: string): Promise<ClimateCache | null> {
    const res = await this.dynamo.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `PARCEL#${parcelId}`, SK: 'CLIMATE#LATEST' },
      }),
    );
    if (!res.Item) return null;
    const parsed = ClimateCacheSchema.safeParse(res.Item);
    return parsed.success ? parsed.data : null;
  }

  private async fetchOpenMeteo(lat: number, lon: number): Promise<unknown> {
    const params = {
      latitude: lat,
      longitude: lon,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration',
      hourly: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,soil_moisture_0_to_7cm',
      forecast_days: 7,
      timezone: 'GMT',
    };

    try {
      const { data } = await axios.get(OPEN_METEO_URL, { params, timeout: TIMEOUT_MS });
      return data;
    } catch (err) {
      // Retry once with backoff
      this.logger.warn(`Open-Meteo first attempt failed, retrying: ${err}`);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const { data } = await axios.get(OPEN_METEO_URL, { params, timeout: TIMEOUT_MS });
        return data;
      } catch (retryErr) {
        throw new AppError('OPEN_METEO_UNAVAILABLE', `Open-Meteo failed after retry: ${retryErr}`);
      }
    }
  }

  private mapToSchema(parcelId: string, raw: unknown): ClimateCache {
    const data = raw as Record<string, unknown>;
    const daily = data['daily'] as Record<string, unknown[]>;
    const hourly = data['hourly'] as Record<string, unknown[]>;

    const days = (daily['time'] as string[]).map((date, i) => ({
      date: this.normalizeDate(date),
      temperatureMax: (daily['temperature_2m_max'] as number[])[i],
      temperatureMin: (daily['temperature_2m_min'] as number[])[i],
      precipitationSum: (daily['precipitation_sum'] as number[])[i],
      et0: (daily['et0_fao_evapotranspiration'] as number[])[i],
    }));

    const hourly48h = (hourly['time'] as string[]).slice(0, 48).map((time, i) => ({
      time: this.normalizeTime(time),
      temperature2m: (hourly['temperature_2m'] as number[])[i],
      relativeHumidity2m: (hourly['relative_humidity_2m'] as number[])[i],
      precipitation: (hourly['precipitation'] as number[])[i],
      windSpeed10m: (hourly['wind_speed_10m'] as number[])[i],
      soilMoisture0to10cm: (hourly['soil_moisture_0_to_7cm'] as number[])[i],
    }));

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + TTL_DAYS * 86400 * 1000).toISOString();

    const cache: ClimateCache = { parcelId, fetchedAt: now, expiresAt, days, hourly48h };
    const validated = ClimateCacheSchema.parse(cache);
    return validated;
  }

  /**
   * Normalize Open-Meteo hourly time (e.g. "2026-07-23T00:00") to full ISO 8601.
   */
  private normalizeTime(t: string): string {
    // Open-Meteo returns "YYYY-MM-DDTHH:MM" without seconds or timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) {
      return new Date(t + ':00Z').toISOString();
    }
    // Already full ISO
    return new Date(t).toISOString();
  }

  /**
   * Normalize Open-Meteo daily date. DailyForecastSchema expects YYYY-MM-DD.
   */
  private normalizeDate(d: string): string {
    // Open-Meteo daily time is already "YYYY-MM-DD", just validate format
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(d);
    return match ? match[1] : d;
  }
}
