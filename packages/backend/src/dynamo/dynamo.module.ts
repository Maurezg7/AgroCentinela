import { Global, Module } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DYNAMO_CLIENT, TABLE_NAME } from './dynamo.constants';

@Global()
@Module({
  providers: [
    {
      provide: TABLE_NAME,
      useFactory: () => process.env.TABLE_NAME ?? 'AgroCentinela-dev',
    },
    {
      provide: DYNAMO_CLIENT,
      useFactory: () => {
        const isLocal = process.env.DYNAMO_ENDPOINT != null;
        const client = new DynamoDBClient({
          region: process.env.AWS_REGION ?? 'us-east-1',
          ...(isLocal && {
            endpoint: process.env.DYNAMO_ENDPOINT,
            credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
          }),
        });
        return DynamoDBDocumentClient.from(client, {
          marshallOptions: { removeUndefinedValues: true },
        });
      },
    },
  ],
  exports: [DYNAMO_CLIENT, TABLE_NAME],
})
export class DynamoModule {}
