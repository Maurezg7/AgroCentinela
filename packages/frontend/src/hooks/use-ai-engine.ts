import { useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/services/api-client';
import { generateOnDevice, checkOnDeviceAvailability } from '@/services/on-device-ai';
import { evaluateRules, type BedrockAlertResponse, type ClimateCache, type Alert } from '@agrocentinela/shared';
import { getDB, getDeviceId } from '@/services/idb-store';
import { v4 as uuidv4 } from 'uuid';

export type AlertEngine = 'bedrock' | 'on-device' | 'rules';

export interface AiEngineResult {
  alert: Alert | null;
  engine: AlertEngine;
  reason?: string;
}

export function useAiEngine() {
  const isOnline = useAppStore((s) => s.isOnline);

  const generateAlert = useCallback(async (
    parcelId: string,
    crop: string,
    stage: string,
    climate: ClimateCache,
  ): Promise<AiEngineResult> => {
    const deviceId = await getDeviceId();

    // Online → use backend (Bedrock)
    if (isOnline) {
      try {
        const result = await apiClient.generateAlert(parcelId, deviceId);
        if (result.generated) {
          const db = await getDB();
          await db.put('alerts', result.alert);
          return { alert: result.alert, engine: result.alert.engine as AlertEngine };
        }
        return { alert: null, engine: 'bedrock', reason: result.reason };
      } catch {
        // Fall through to on-device
      }
    }

    // Offline or backend failed → try on-device Prompt API
    const availability = await checkOnDeviceAvailability();
    if (availability === 'available') {
      const response = await generateOnDevice(crop, stage, climate);
      if (response) {
        const alert = buildLocalAlert(response, parcelId, deviceId, 'on-device');
        await persistAlert(alert);
        return { alert, engine: 'on-device' };
      }
    }

    // Fallback → rule engine (always available)
    const response = evaluateRules({ crop, stage, climate });
    if (response) {
      const alert = buildLocalAlert(response, parcelId, deviceId, 'rules');
      await persistAlert(alert);
      return { alert, engine: 'rules' };
    }

    return { alert: null, engine: 'rules', reason: 'no_risk' };
  }, [isOnline]);

  return { generateAlert };
}

function buildLocalAlert(
  response: BedrockAlertResponse,
  parcelId: string,
  deviceId: string,
  engine: AlertEngine,
): Alert {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    parcelId,
    deviceId,
    severity: response.severity,
    message: response.message,
    recommendedAction: response.recommendedAction,
    engine,
    condition: response.condition,
    createdAt: now,
    deliveredAt: null,
    expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
  };
}

async function persistAlert(alert: Alert): Promise<void> {
  const db = await getDB();
  await db.put('alerts', alert);
}
