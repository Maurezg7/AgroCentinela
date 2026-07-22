# Infra — AgroCentinela

Recursos de infraestructura base desplegados con AWS SAM.

## Recursos creados

| Recurso | Tipo | Descripción |
|---|---|---|
| AgroCentinelaTable | DynamoDB | Single-table con GSI1 y TTL |
| ClimateIngestaQueue | SQS | Fan-out de ingesta climática por parcela |
| ClimateIngestaDLQ | SQS | Dead-letter queue (3 reintentos) |
| DiagnosisImagesBucket | S3 | Imágenes de diagnóstico (lifecycle 90d) |
| ClimateIngestaScheduleRule | EventBridge | Cron diario 06:00 UTC (DESHABILITADO) |
| SSM Parameters | SSM | table-name, climate-queue-url, images-bucket |

## Deploy

```bash
cd infra

# Dev (por defecto)
./deploy.sh

# Prod
./deploy.sh prod
```

## Prerequisitos

- AWS SAM CLI instalado (`sam --version`)
- Credenciales AWS configuradas con permisos para CloudFormation, DynamoDB,
  SQS, S3, EventBridge, SSM, Lambda.
- La Lambda referenciada por EventBridge se crea en T-1.2 (backend).
  Hasta que exista, el deploy puede dar warning por el Permission resource;
  es inocuo porque la rule está DISABLED.

## SSM Parameter Paths

| Path | Tipo | Contenido |
|---|---|---|
| `/agrocentinela/<env>/table-name` | String | Nombre de la tabla DynamoDB |
| `/agrocentinela/<env>/climate-queue-url` | String | URL de la cola SQS |
| `/agrocentinela/<env>/images-bucket` | String | Nombre del bucket S3 |
| `/agrocentinela/<env>/vapid-public-key` | String | Creado en T-1.0b |
| `/agrocentinela/<env>/vapid-private-key` | SecureString | Creado en T-1.0b |
| `/agrocentinela/<env>/bedrock-model-id` | String | Creado en T-1.0a |
