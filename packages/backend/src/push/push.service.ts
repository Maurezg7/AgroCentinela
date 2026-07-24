import { Inject, Injectable, Logger } from '@nestjs/common';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import webpush from 'web-push';
import { createHash } from 'crypto';
import { DYNAMO_CLIENT, TABLE_NAME } from '../dynamo/dynamo.constants';
import type { PushSubscriptionData } from '@agrocentinela/shared';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    @Inject(TABLE_NAME) private readonly tableName: string,
  ) {}

  async getPublicKey(): Promise<string> {
    const keys = await this.getVapidKeys();
    return keys.publicKey;
  }

  private async getVapidKeys() {
    if (this.vapidKeys) return this.vapidKeys;
    const [pub, priv] = await Promise.all([
      this.ssm.send(new GetParameterCommand({ Name: '/agrocentinela/vapid/public-key' })),
      this.ssm.send(new GetParameterCommand({ Name: '/agrocentinela/vapid/private-key', WithDecryption: true })),
    ]);
    this.vapidKeys = {
      publicKey: pub.Parameter?.Value ?? '',
      privateKey: priv.Parameter?.Value ?? '',
    };
    webpush.setVapidDetails(
      'mailto:admin@agrocentinela.app',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey,
    );
    return this.vapidKeys;
  }

  async subscribe(data: PushSubscriptionData): Promise<void> {
    const endpointHash = createHash('sha256').update(data.endpoint).digest('hex').slice(0, 16);
    await this.dynamo.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `DEVICE#${data.deviceId}`,
          SK: `PUSH#${endpointHash}`,
          GSI1PK: 'PUSH#ACTIVE',
          GSI1SK: `DEVICE#${data.deviceId}`,
          ...data,
          endpointHash,
        },
      }),
    );
  }

  async unsubscribe(deviceId: string, endpoint: string): Promise<void> {
    const endpointHash = createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
    await this.dynamo.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: `DEVICE#${deviceId}`, SK: `PUSH#${endpointHash}` },
      }),
    );
  }

  async sendToDevice(deviceId: string, payload: { title: string; body: string; parcelId: string; severity: number }): Promise<boolean> {
    // Get subscriptions for this device
    const res = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `DEVICE#${deviceId}`, ':prefix': 'PUSH#' },
      }),
    );
    const subs = (res.Items ?? []) as Array<PushSubscriptionData & { endpointHash: string }>;
    if (subs.length === 0) {
      this.logger.log(JSON.stringify({ event: 'push_no_subs_found', deviceId }));
      return false;
    }

    this.logger.log(JSON.stringify({ event: 'push_sending', deviceId, subscriptionCount: subs.length }));
    await this.getVapidKeys();
    let sent = false;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        );
        sent = true;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired — remove it
          await this.unsubscribe(sub.deviceId, sub.endpoint);
          this.logger.log(JSON.stringify({ event: 'push_sub_removed', deviceId, status }));
        } else {
          this.logger.error(JSON.stringify({ event: 'push_send_failed', deviceId, error: String(err) }));
        }
      }
    }
    return sent;
  }

  async markDelivered(parcelId: string, alertTimestamp: string): Promise<void> {
    try {
      await this.dynamo.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: `PARCEL#${parcelId}`, SK: `ALERT#${alertTimestamp}` },
          UpdateExpression: 'SET deliveredAt = :now',
          ConditionExpression: 'attribute_not_exists(deliveredAt) OR deliveredAt = :null',
          ExpressionAttributeValues: { ':now': new Date().toISOString(), ':null': null },
        }),
      );
    } catch (err) {
      if (!(err instanceof ConditionalCheckFailedException)) throw err;
      // Already delivered — first delivery wins
    }
  }
}
