import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DYNAMO_CLIENT, TABLE_NAME } from '../dynamo/dynamo.constants';
import { BedrockService } from './bedrock.service';
import { ClimateService } from '../climate/climate.service';
import { ParcelsService } from '../parcels/parcels.service';
import type { Alert, BedrockAlertResponse, ClimateCache } from '@agrocentinela/shared';

const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;
const FROST_THRESHOLD_C = 3;
const TTL_DAYS = 30;

export type GenerateResult =
  | { generated: true; alert: Alert }
  | { generated: false; reason: 'no_risk' }
  | { generated: false; reason: 'deduplicated'; alertId: string };

export interface SimulateOptions {
  temperatureMin: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    @Inject(TABLE_NAME) private readonly tableName: string,
    private readonly bedrockService: BedrockService,
    private readonly climateService: ClimateService,
    private readonly parcelsService: ParcelsService,
  ) {}

  /** AP4: Alerts for a device, ordered by date desc (GSI1) */
  async findByDevice(deviceId: string): Promise<Alert[]> {
    const res = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `DEVICE#${deviceId}`,
          ':prefix': 'ALERT#',
        },
        ScanIndexForward: false,
      }),
    );
    return (res.Items ?? []) as Alert[];
  }

  /** AP3: Alerts for a parcel, ordered by date desc */
  async findByParcel(parcelId: string): Promise<Alert[]> {
    const res = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `PARCEL#${parcelId}`,
          ':prefix': 'ALERT#',
        },
        ScanIndexForward: false,
      }),
    );
    return (res.Items ?? []) as Alert[];
  }

  async generate(
    parcelId: string,
    deviceId: string,
    simulate?: SimulateOptions,
  ): Promise<GenerateResult> {
    const isSimulation = simulate != null && process.env.ALLOW_SIMULATION === 'true';
    const parcel = await this.parcelsService.findById(parcelId);
    let climate = await this.climateService.getCached(parcelId);
    if (!climate) {
      await this.climateService.fetchAndPersist(
        parcelId, parcel.coordinates.lat, parcel.coordinates.lon,
      );
      climate = await this.climateService.getCached(parcelId);
      if (!climate) return { generated: false, reason: 'no_risk' };
    }

    // Apply simulation override if enabled
    if (isSimulation && simulate) {
      climate = this.applySimulation(climate, simulate.temperatureMin);
    }

    // Try Bedrock first (simulation still goes through Bedrock)
    let response: BedrockAlertResponse | null = null;
    let engine: 'bedrock' | 'rules' = 'rules';

    response = await this.bedrockService.generateAlert(
      parcel.crop, parcel.stage, climate,
      parcel.coordinates.lat, parcel.coordinates.lon,
    );
    if (response) {
      engine = 'bedrock';
    } else {
      response = this.ruleEngine(parcel.crop, parcel.stage, climate);
    }

    if (!response) return { generated: false, reason: 'no_risk' };

    // Deduplication (skip in simulation to allow repeating demos)
    if (!isSimulation) {
      const duplicateAlertId = await this.findDuplicate(parcelId, response.condition);
      if (duplicateAlertId) {
        this.logger.log(JSON.stringify({
          event: 'alert_deduplicated', parcelId, condition: response.condition, duplicateAlertId,
        }));
        return { generated: false, reason: 'deduplicated', alertId: duplicateAlertId };
      }
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + TTL_DAYS * 86400 * 1000).toISOString();
    const alert: Alert & { simulated?: boolean } = {
      id: randomUUID(),
      parcelId,
      deviceId,
      severity: response.severity,
      message: response.message,
      recommendedAction: response.recommendedAction,
      engine,
      condition: response.condition,
      createdAt: now,
      deliveredAt: null,
      expiresAt,
      ...(isSimulation && { simulated: true }),
    };

    const ttlEpoch = Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;
    await this.dynamo.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `PARCEL#${parcelId}`,
          SK: `ALERT#${now}`,
          GSI1PK: `DEVICE#${deviceId}`,
          GSI1SK: `ALERT#${now}`,
          TTL: ttlEpoch,
          ...alert,
        },
      }),
    );
    return { generated: true, alert };
  }

  private async findDuplicate(parcelId: string, condition: string): Promise<string | null> {
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const res = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND SK > :cutoff',
        FilterExpression: '#cond = :condition AND deliveredAt <> :null',
        ExpressionAttributeNames: { '#cond': 'condition' },
        ExpressionAttributeValues: {
          ':pk': `PARCEL#${parcelId}`,
          ':cutoff': `ALERT#${cutoff}`,
          ':condition': condition,
          ':null': null,
        },
      }),
    );
    if ((res.Count ?? 0) > 0 && res.Items?.[0]) {
      return (res.Items[0] as { id: string }).id;
    }
    return null;
  }

  private applySimulation(climate: ClimateCache, temperatureMin: number): ClimateCache {
    return {
      ...climate,
      hourly48h: climate.hourly48h.map((h) => ({
        ...h,
        temperature2m: Math.min(h.temperature2m, temperatureMin),
      })),
    };
  }

  private ruleEngine(
    crop: string,
    stage: string,
    climate: ClimateCache,
  ): BedrockAlertResponse | null {
    const temps = climate.hourly48h.map((h) => h.temperature2m);
    const minTemp = Math.min(...temps);

    const isSensitiveStage = ['floracion', 'llenado'].includes(stage);
    const severityBoost = isSensitiveStage ? 1 : 0;

    // Frost rule
    if (minTemp < FROST_THRESHOLD_C) {
      const severity = Math.min(5, (minTemp < 0 ? 5 : 4) + severityBoost) as 1 | 2 | 3 | 4 | 5;
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
}
