import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DYNAMO_CLIENT, TABLE_NAME } from '../dynamo/dynamo.constants';
import { NotFoundError, ConflictError } from '../common/errors/app-error';
import type { Parcel, ParcelCreate } from '@agrocentinela/shared';

@Injectable()
export class ParcelsService {
  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    @Inject(TABLE_NAME) private readonly tableName: string,
  ) {}

  async create(dto: ParcelCreate): Promise<Parcel> {
    const now = new Date().toISOString();
    const parcel: Parcel = {
      ...dto,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      syncedAt: now,
    };

    try {
      await this.dynamo.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: `DEVICE#${parcel.deviceId}`,
            SK: `PARCEL#${parcel.id}`,
            GSI1PK: `PARCEL#${parcel.id}`,
            GSI1SK: 'META',
            ...parcel,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new ConflictError('Parcel already exists');
      }
      throw err;
    }
    return parcel;
  }

  async findByDevice(deviceId: string): Promise<Parcel[]> {
    const res = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `DEVICE#${deviceId}`,
          ':prefix': 'PARCEL#',
        },
      }),
    );
    return (res.Items ?? []) as Parcel[];
  }

  async findById(parcelId: string): Promise<Parcel> {
    const res = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `PARCEL#${parcelId}`,
          ':sk': 'META',
        },
      }),
    );
    const item = res.Items?.[0];
    if (!item) throw new NotFoundError('Parcel', parcelId);
    return item as Parcel;
  }

  async update(
    parcelId: string,
    deviceId: string,
    fields: Partial<Pick<Parcel, 'name' | 'stage'>>,
  ): Promise<Parcel> {
    const now = new Date().toISOString();
    const expressions: string[] = ['#updatedAt = :now'];
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const values: Record<string, unknown> = { ':now': now, ':nowCond': now };

    if (fields.name) {
      expressions.push('#n = :name');
      names['#n'] = 'name';
      values[':name'] = fields.name;
    }
    if (fields.stage) {
      expressions.push('#s = :stage');
      names['#s'] = 'stage';
      values[':stage'] = fields.stage;
    }

    try {
      const res = await this.dynamo.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: `DEVICE#${deviceId}`, SK: `PARCEL#${parcelId}` },
          UpdateExpression: `SET ${expressions.join(', ')}`,
          ConditionExpression: 'attribute_exists(PK) AND updatedAt < :nowCond',
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        }),
      );
      return res.Attributes as Parcel;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new ConflictError('Conflict: parcel was updated concurrently');
      }
      throw err;
    }
  }
}
