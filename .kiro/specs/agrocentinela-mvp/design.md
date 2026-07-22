# Design — AgroCentinela MVP

## Overview

AgroCentinela es una PWA offline-first que entrega alertas agroclimáticas
accionables al productor del NOA argentino. El sistema opera sin conexión
como caso normal (Service Worker + IndexedDB) y enriquece su razonamiento
con Amazon Bedrock cuando hay señal.

El frontend es React 18 + Vite + Tailwind (tema oscuro). El backend es
NestJS sobre Lambda vía @codegenie/serverless-express, con DynamoDB
single-table, EventBridge para ingesta programada, y web-push para
notificaciones VAPID. Los contratos Zod viven en packages/shared como
única fuente de verdad.

La IA opera en tres niveles: Bedrock (nube), Prompt API (on-device), y
motor de reglas determinístico. Nunca hay un estado "no disponible".

## Architecture

### Frontend (packages/frontend)

```text
src/
├── components/          # UI pura: Button, Card, StatusBadge, AlertBanner
├── features/
│   ├── parcelas/        # Alta, listado, detalle de parcela
│   ├── alertas/         # Timeline de alertas, detalle, compartir
│   └── diagnostico/     # Captura foto, resultado, disclaimer
├── hooks/
│   ├── use-geolocation.ts
│   ├── use-network-status.ts
│   ├── use-indexed-db.ts
│   └── use-ai-engine.ts   # Conmutador nube/on-device/reglas
├── services/
│   ├── api-client.ts       # Fetch wrapper con timeout + retry
│   ├── sync-queue.ts       # Cola offline → Background Sync
│   ├── idb-store.ts        # Abstracción sobre idb (parcelas, clima, alertas)
│   └── push-subscription.ts
├── lib/
│   ├── rule-engine.ts      # Motor determinístico (frost, hydric-stress)
│   ├── image-triage.ts     # Histograma de color para triage offline
│   └── image-utils.ts      # Resize + compress antes de upload
└── sw.ts                   # Service Worker (vite-plugin-pwa / Workbox)
```

### Backend (packages/backend — NestJS sobre Lambda)

```text
src/
├── parcels/
│   ├── parcels.controller.ts   # POST /parcels, GET /parcels, GET /parcels/:id
│   ├── parcels.service.ts      # Lógica de persistencia y sync
│   └── dto/
├── climate/
│   ├── climate.controller.ts   # GET /climate/:parcelId
│   ├── climate.service.ts      # Ingesta Open-Meteo, cache DynamoDB
│   └── climate.scheduler.ts    # Handler para EventBridge
├── motor/
│   ├── motor.controller.ts     # POST /alerts/generate
│   ├── motor.service.ts        # Orquesta Bedrock + validación Zod
│   └── rule-engine.service.ts  # Fallback determinístico server-side
├── push/
│   ├── push.controller.ts      # POST /push/subscribe, DELETE /push/unsubscribe
│   └── push.service.ts         # web-push con VAPID
├── diagnosis/
│   ├── diagnosis.controller.ts # POST /diagnosis (presigned URL flow)
│   └── diagnosis.service.ts    # Invoca Bedrock vision
└── common/
    ├── dynamo.provider.ts      # DynamoDB Document Client singleton
    ├── logger.service.ts       # JSON estructurado con correlation-id
    └── errors/                 # Clases de error tipadas
```

### Shared (packages/shared)

Schemas Zod + tipos derivados. Frontend y backend importan desde acá.

### Flujo de datos principal

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENTE (PWA)                                                       │
│                                                                     │
│  [UI] ←→ [Zustand Store] ←→ [Services] ←→ [IndexedDB]            │
│                                    │                                │
│                                    │  (online)                      │
│                                    ▼                                │
│                            [Sync Queue]                             │
│                                    │                                │
└────────────────────────────────────│────────────────────────────────┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API GATEWAY + LAMBDA (NestJS)                                       │
│                                                                     │
│  [Controllers] → [Services] → [DynamoDB]                           │
│                       │                                             │
│                       ├──→ [Open-Meteo API]                        │
│                       ├──→ [Amazon Bedrock]                        │
│                       └──→ [Web Push]                              │
│                                                                     │
│  [EventBridge] → [Climate Scheduler Lambda] → [SQS] → [Ingesta]  │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### DynamoDB Single-Table Design

Tabla principal: `AgroCentinela`

| Atributo | Tipo | Descripción |
|---|---|---|
| PK | S | Partition Key |
| SK | S | Sort Key |
| GSI1PK | S | GSI para accesos inversos |
| GSI1SK | S | GSI Sort Key |
| TTL | N | Unix epoch para expiración automática |
| data | M | Payload del item |

#### Entidades y keys

| Entidad | PK | SK | GSI1PK | GSI1SK | TTL |
|---|---|---|---|---|---|
| Parcela | `DEVICE#<deviceId>` | `PARCEL#<parcelId>` | `PARCEL#<parcelId>` | `META` | — |
| Clima | `PARCEL#<parcelId>` | `CLIMATE#LATEST` | — | — | +7d |
| Alerta | `PARCEL#<parcelId>` | `ALERT#<timestamp>` | `DEVICE#<deviceId>` | `ALERT#<timestamp>` | +30d |
| Push Sub | `DEVICE#<deviceId>` | `PUSH#<endpoint-hash>` | `PUSH#ACTIVE` | `DEVICE#<deviceId>` | — |
| Diagnosis | `PARCEL#<parcelId>` | `DIAG#<timestamp>` | `DEVICE#<deviceId>` | `DIAG#<timestamp>` | +90d |

#### Access Patterns

| # | Operación | Key Condition | Índice |
|---|---|---|---|
| AP1 | Listar parcelas de un dispositivo | PK = `DEVICE#x`, SK begins_with `PARCEL#` | Table |
| AP2 | Obtener clima actual de una parcela | PK = `PARCEL#x`, SK = `CLIMATE#LATEST` | Table |
| AP3 | Alertas de una parcela ordenadas por fecha | PK = `PARCEL#x`, SK begins_with `ALERT#` | Table |
| AP4 | Alertas de un dispositivo (cross-parcela) | GSI1PK = `DEVICE#x`, GSI1SK begins_with `ALERT#` | GSI1 |
| AP5 | Detalle de una parcela por ID | GSI1PK = `PARCEL#x`, GSI1SK = `META` | GSI1 |
| AP6 | Suscripciones push de un dispositivo | PK = `DEVICE#x`, SK begins_with `PUSH#` | Table |
| AP7 | Listar dispositivos con push activo (scheduler) | GSI1PK = `PUSH#ACTIVE` | GSI1 |

### Conmutador de motores de IA

```text
┌──────────────────────────────────────────────────────────────────┐
│                    ¿Hay conexión efectiva?                        │
│         (navigator.onLine + NetworkInformation.effectiveType)     │
└─────────────────────┬────────────────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │ SÍ (4g/3g)        │ NO / slow-2g / save-data
            ▼                   ▼
   ┌─────────────────┐   ┌───────────────────────────────┐
   │ Llamar Bedrock  │   │ ¿window.ai disponible?        │
   │ via backend API │   │ (Prompt API feature detection) │
   └────────┬────────┘   └──────────┬────────────────────┘
            │                       │
            │              ┌────────┴────────┐
            │              │ SÍ              │ NO
            │              ▼                 ▼
            │   ┌──────────────────┐  ┌──────────────────┐
            │   │ Prompt API local │  │ Motor de reglas  │
            │   │ (3 días + cultivo│  │ determinístico   │
            │   │  + etapa)        │  └──────────────────┘
            │   └────────┬─────────┘
            │            │
            │   ¿Valida schema Zod? → NO → Motor de reglas
            │            │ SÍ → Usar respuesta
            │
   ¿Valida schema Zod? → NO → Motor de reglas
            │ SÍ → Usar respuesta
```

#### Motor de reglas determinístico

| Condición | Regla | Severidad | Acción |
|---|---|---|---|
| `helada` | `temperatureMin < 3°C` en `hourly48h` | 4-5 según delta | "Cubrir con manta térmica antes del anochecer" |
| `estres-hidrico` | `precipitationSum < 5mm` 7d AND `soilMoisture < 20%` AND `et0 > 5mm/d` | 3-4 | "Regar antes de las 10am" |

Se modula severidad por etapa fenológica (floración y llenado son más sensibles).

### Estrategia de caché del Service Worker

Configuración con vite-plugin-pwa (Workbox).

| Tipo de recurso | Estrategia | Max age / entries | Justificación |
|---|---|---|---|
| App shell (HTML, JS, CSS) | Precache (build-time) | Versionado por hash | Offline inmediato |
| Fuentes e íconos | CacheFirst | 30 días, max 30 | Rara vez cambian |
| Imágenes estáticas | CacheFirst | 7 días, max 50 | Tamaño moderado |
| API `/climate/*` | StaleWhileRevalidate | 24h, max 20 | Dato viejo + refresco |
| API `/alerts/*` | NetworkFirst | Timeout 5s → cache | Prioriza frescura |
| API `/parcels/*` | NetworkFirst | Timeout 5s → cache | Pueden crearse offline |
| Open-Meteo (externo) | No cachear en SW | — | Se cachea en IndexedDB |
| Presigned URLs (S3) | NetworkOnly | — | Temporales |

Reglas adicionales:

- Background Sync: registra tag `sync-queue` cuando hay operaciones pendientes.
  El SW escucha `sync` y envía las operaciones al backend.
- Quota management: si `navigator.storage.estimate()` indica menos de 50MB
  disponibles, se eliminan los ítems de clima más antiguos de IndexedDB.
- Precache manifest: generado por vite-plugin-pwa; incluye todas las rutas
  de navegación para soporte offline completo.

### Deduplicación de alertas

Antes de persistir una alerta, se consulta IndexedDB/DynamoDB:

- Si existe una alerta con mismo `parcelId` + `condition` cuya última
  *entrega* (mostrada al usuario o enviada como push) fue hace menos de
  12h → se descarta la nueva.
- La ventana se mide desde el timestamp de entrega (`deliveredAt`), no
  desde la generación. Esto evita suprimir alertas que el usuario nunca vio.

## Data Models

Todos los schemas viven en `packages/shared/src/schemas/`.

```typescript
// parcel.schema.ts
import { z } from 'zod';

export const CropTypeSchema = z.enum(['soja', 'maiz', 'poroto']);

export const PhenologicalStageSchema = z.enum([
  'siembra', 'emergencia', 'vegetativo', 'floracion', 'llenado', 'madurez',
]);

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const ParcelCreateSchema = z.object({
  name: z.string().min(1).max(100),
  crop: CropTypeSchema,
  stage: PhenologicalStageSchema,
  hectares: z.number().positive().max(50000),
  coordinates: CoordinatesSchema,
  deviceId: z.string().uuid(),
});

export const ParcelSchema = ParcelCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncedAt: z.string().datetime().nullable(),
});

export type Parcel = z.infer<typeof ParcelSchema>;
export type ParcelCreate = z.infer<typeof ParcelCreateSchema>;
```

> `updatedAt` se escribe en toda edición (cambio de etapa, nombre, etc.) y es
> el campo de resolución de conflictos en la estrategia last-write-wins.

```typescript
// climate.schema.ts
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
  hourly: z.array(HourlyForecastSchema),
});

export const ClimateCacheSchema = z.object({
  parcelId: z.string().uuid(),
  fetchedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  days: z.array(DailyForecastSchema).min(1).max(7),
  hourly48h: z.array(HourlyForecastSchema).max(48),
});

export type ClimateCache = z.infer<typeof ClimateCacheSchema>;
```

> Modelo unificado: un solo ítem por parcela con SK = `CLIMATE#LATEST`,
> sobrescrito en cada ingesta. `hourly48h` contiene las primeras 48 horas
> de datos horarios aplanados para consumo del motor de reglas y Prompt API.

```typescript
// alert.schema.ts
import { z } from 'zod';

export const AlertSeveritySchema = z.number().int().min(1).max(5);
export const AlertEngineSchema = z.enum(['bedrock', 'on-device', 'rules']);
export const AlertConditionSchema = z.enum(['helada', 'estres-hidrico']);

export const AlertSchema = z.object({
  id: z.string().uuid(),
  parcelId: z.string().uuid(),
  deviceId: z.string().uuid(),
  severity: AlertSeveritySchema,
  message: z.string().min(1).max(500),
  recommendedAction: z.string().min(1).max(500),
  engine: AlertEngineSchema,
  condition: AlertConditionSchema,
  createdAt: z.string().datetime(),
  deliveredAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
});

export const BedrockAlertResponseSchema = z.object({
  message: z.string().min(1).max(500),
  severity: AlertSeveritySchema,
  recommendedAction: z.string().min(1).max(500),
  condition: AlertConditionSchema,
});

export type Alert = z.infer<typeof AlertSchema>;
export type AlertCondition = z.infer<typeof AlertConditionSchema>;
export type BedrockAlertResponse = z.infer<typeof BedrockAlertResponseSchema>;
```

> El prompt de Bedrock incluye instrucción explícita:
> `"condition" MUST be one of: "helada", "estres-hidrico". No other values allowed.`
> La validación Zod rechaza cualquier valor fuera del enum.

```typescript
// diagnosis.schema.ts
import { z } from 'zod';

export const TriageResultSchema = z.object({
  greenRatio: z.number().min(0).max(1),
  yellowBrownRatio: z.number().min(0).max(1),
  preliminarySeverity: z.number().int().min(1).max(3),
  analysisMethod: z.literal('color-histogram'),
});

const DiagnosisBaseSchema = z.object({
  id: z.string().uuid(),
  parcelId: z.string().uuid(),
  imageKey: z.string(),
  triage: TriageResultSchema.nullable(),
  createdAt: z.string().datetime(),
});

export const DiagnosisPendingSchema = DiagnosisBaseSchema.extend({
  status: z.literal('pending'),
});

export const DiagnosisCompletedSchema = DiagnosisBaseSchema.extend({
  status: z.literal('completed'),
  diagnosis: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  possibleCauses: z.array(z.string().max(200)).max(5),
});

export const DiagnosisFailedSchema = DiagnosisBaseSchema.extend({
  status: z.literal('failed'),
  errorCode: z.string().min(1),
});

export const DiagnosisResultSchema = z.discriminatedUnion('status', [
  DiagnosisPendingSchema,
  DiagnosisCompletedSchema,
  DiagnosisFailedSchema,
]);

export type TriageResult = z.infer<typeof TriageResultSchema>;
export type DiagnosisResult = z.infer<typeof DiagnosisResultSchema>;
```

```typescript
// push-subscription.schema.ts
import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  deviceId: z.string().uuid(),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  createdAt: z.string().datetime(),
});

export type PushSubscriptionData = z.infer<typeof PushSubscriptionSchema>;
```

```typescript
// sync-operation.schema.ts
import { z } from 'zod';
import { ParcelCreateSchema } from './parcel.schema';

const SyncBaseSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  createdAt: z.string().datetime(),
  status: z.enum(['pending', 'synced', 'failed']),
  retries: z.number().int().min(0),
});

export const SyncCreateParcelSchema = SyncBaseSchema.extend({
  type: z.literal('create-parcel'),
  payload: ParcelCreateSchema,
});

export const SyncDiagnosisUploadSchema = SyncBaseSchema.extend({
  type: z.literal('diagnosis-upload'),
  payload: z.object({
    parcelId: z.string().uuid(),
    imageKey: z.string().min(1),
  }),
});

export const SyncOperationSchema = z.discriminatedUnion('type', [
  SyncCreateParcelSchema,
  SyncDiagnosisUploadSchema,
]);

export type SyncOperation = z.infer<typeof SyncOperationSchema>;
```

> La cola de sync vive exclusivamente en IndexedDB. No existe entidad
> SyncQueue en DynamoDB. La idempotencia se garantiza por el upsert
> condicionado en el backend (PutItem con `attribute_not_exists(PK)`
> o condition en `updatedAt`).

### IndexedDB Stores

| Store | Key | Índices | Contenido |
|---|---|---|---|
| `parcels` | `id` (UUID) | `deviceId`, `crop` | Parcelas completas |
| `climate` | `parcelId` | `fetchedAt` | Último ClimateCacheSchema (un ítem por parcela) |
| `alerts` | `id` (UUID) | `parcelId`, `createdAt`, `deliveredAt` | Alertas generadas |
| `sync-queue` | `id` (UUID) | `status`, `createdAt` | Operaciones pendientes (solo local, no en DynamoDB) |
| `diagnosis` | `id` (UUID) | `parcelId`, `status` | Resultados + image blob |
| `config` | `key` (string) | — | deviceId, pushSubscription |

## Correctness Properties

### Property 1: Offline-first invariante

**Validates: Requirements 1.5, 1.6, 6.2**

Toda escritura de usuario persiste primero en IndexedDB antes de cualquier
llamada de red. Si la red falla, el dato local es la fuente de verdad hasta
la sincronización.

### Property 2: Validación en borde

**Validates: Requirements 1.7, 2.2, 3.2, 3.8**

Todo dato que cruza un boundary (HTTP response, IndexedDB read, Bedrock
response, Prompt API response) se valida con Zod. La app nunca renderiza
datos no validados.

### Property 3: Fallback garantizado

**Validates: Requirements 3.3, 3.4, 3.5**

El conmutador de IA siempre termina en el motor de reglas determinístico.
No existe un path donde no se genere una respuesta.

### Property 4: Deduplicación de alertas

**Validates: Requirements 3.7**

No se persisten dos alertas con mismo parcelId + condition si la última alerta
fue *entregada* (mostrada o enviada como push) hace menos de 12h. La ventana
se mide desde la entrega, no la generación.

`deliveredAt` se escribe en dos paths:

- **Push exitoso:** el backend escribe `deliveredAt = now()` tras confirmar
  que `webpush.sendNotification()` resolvió sin error (status 201).
- **Renderizado en app:** el frontend escribe `deliveredAt = now()` en
  IndexedDB cuando la alerta se muestra en pantalla (intersection observer
  o mount del componente de alerta). En la próxima sync se envía al backend.

### Property 5: Idempotencia de sync

**Validates: Requirements 6.3**

Las operaciones encoladas usan UUID generado client-side. El backend hace
upsert condicionado; reintentar una operación no genera duplicados.

### Property 6: TTL consistency

**Validates: Requirements 2.2**

Los items con TTL en DynamoDB se consideran expirados localmente cuando
`expiresAt < now()`. No se espera al garbage collector de DynamoDB para
filtrarlos.

## Error Handling

| Contexto | Error | Acción |
|---|---|---|
| Geolocalización | Permiso denegado | Ofrecer carga manual de coordenadas |
| Geolocalización | Timeout 15s | Cancelar intento, ofrecer reintentar o manual |
| Open-Meteo | Timeout 10s | Retry x1 con backoff exponencial; si falla, usar cache marcado con antigüedad |
| Bedrock (texto) | Timeout / respuesta inválida | Log structured del evento + fallback a motor de reglas |
| Bedrock (visión) | Timeout / error | Encolar imagen con status `pending`; notificar al usuario |
| Prompt API | No disponible / respuesta inválida | Fallback inmediato a motor de reglas |
| Background Sync | Fallo de red | Reintentar en próximo evento sync; max 5 retries antes de marcar `failed` |
| Push | Suscripción inválida / expirada | Eliminar suscripción de DynamoDB; no reintentar |
| Push | sendNotification falla (no 201) | No escribir `deliveredAt`; la alerta queda sin entregar y no bloquea deduplicación futura |
| Cámara | Permiso denegado | Ofrecer subir imagen desde galería |
| Web Share API | No disponible | Copiar al portapapeles con feedback visual |
| IndexedDB | QuotaExceeded | Purgar clima más viejo; reintentar operación |
| deliveredAt sync | Fallo al enviar deliveredAt al backend | Encolar como operación de sync; el backend acepta la escritura idempotente |

Todos los errores se modelan con clases tipadas (`AppError` con `code`, `message`,
`context`). Nunca `throw new Error(string)` suelto.

## Testing Strategy

| Capa | Framework | Foco |
|---|---|---|
| Frontend unit | Vitest + Testing Library | Hooks (useAiEngine, useGeolocation), rule-engine, services |
| Frontend integration | Vitest + MSW | Flujo offline: crear parcela → encolar → sync |
| Backend unit | Jest | Services (climate ingesta, motor orquestación, deduplicación) |
| Backend integration | Jest + DynamoDB local | Access patterns completos, TTL behavior |
| E2E (stretch goal) | Playwright | Flujo completo con network throttling |

Cobertura mínima: 70% en lógica de negocio. Los tests cubren:

- Happy path
- Caso vacío (sin parcelas, sin clima cacheado)
- Error de red (timeout, 5xx)
- Permiso denegado (geo, cámara, notificaciones)
- Respuesta de LLM inválida (no valida schema)
- Deduplicación de alertas (ventana 12h)
- Transición online↔offline

## Technical Decisions

### 1. Device-ID como identidad (en lugar de auth)

**Decisión:** Generar UUID v4 al primer uso, persistirlo en IndexedDB y usarlo
como partition key en DynamoDB.

**Justificación:** El MVP no tiene autenticación. Un device-id permite particionar
datos sin login. Suficiente para hackathon single-tenant.

**Alternativa descartada:** Cookie de sesión — no persiste entre reinstalaciones
de la PWA y se borra con clear site data.

### 2. Fan-out para ingesta climática

**Decisión:** EventBridge → Lambda dispatcher → SQS → Lambda worker por parcela.
Solo se procesan parcelas con suscripción push activa (AP7: Query GSI1PK =
`PUSH#ACTIVE` → obtiene deviceIds → AP1 por cada uno para listar parcelas).

**Justificación:** Una sola Lambda con scan + loop tiene timeout risk con más de
100 parcelas (Open-Meteo ~1s por request). Fan-out paraleliza y cada worker es
idempotente. Filtrar por push activo evita consumir cuota de Open-Meteo para
parcelas abandonadas. El GSI1 elimina el Scan completo de tabla.

**Alternativa descartada:** Step Functions — overhead operativo innecesario para
un fan-out simple en MVP. Scan de tabla — no escala y consume RCU innecesario.

### 3. Presigned URL para upload de imágenes

**Decisión:** El cliente solicita un presigned PUT URL al backend, sube directo
a S3, y luego llama al endpoint de diagnóstico con el S3 key.

**Justificación:** Evita pasar imagen por Lambda (6MB limit en payload API Gateway).
Reduce latencia. Permite resize client-side antes del upload.

**Alternativa descartada:** Base64 en body JSON — excede límite de payload y
aumenta tamaño un 33%.

### 4. Zustand para estado global

**Decisión:** Zustand para estado global (parcelas, alertas, conectividad).

**Justificación:** API mínima, sin boilerplate, selectores evitan re-renders
innecesarios. Ideal para una app con pocos stores bien definidos.

**Alternativa descartada:** Redux Toolkit — demasiado ceremonial para MVP.
Context API — re-renders cascada en árboles profundos.

### 5. idb (wrapper de IndexedDB)

**Decisión:** Usar `idb` de Jake Archibald para acceso a IndexedDB.

**Justificación:** ~1KB gzipped, tipado nativo, sin ORM overhead. El modelo de
datos es simple y no necesita queries complejas tipo Dexie.

**Alternativa descartada:** Dexie.js — más features (live queries, sync) pero
peso y abstracción innecesarios para este caso.

### 6. Sync strategy: last-write-wins

**Decisión:** La sincronización usa last-write-wins por `updatedAt`.

**Justificación:** Sin multiusuario no hay conflictos reales. Upsert con
condition expression resuelve el caso de duplicate-id por retry.

**Alternativa descartada:** CRDTs — complejidad desproporcionada para single-tenant.

### 7. Network Information API con fallback

**Decisión:** Usar `navigator.connection.effectiveType` donde esté disponible;
si no existe (Safari), asumir conexión buena y dejar que el timeout del fetch
decida el fallback.

**Justificación:** Permite distinguir 4g (Bedrock) de slow-2g (local). Cuando
la API no existe, el timeout de 10s del fetch al backend actúa como detector
de mala conexión y dispara el fallback al motor local.

**Alternativa descartada:** Fetch HEAD probe — agrega latencia dedicada sin
aportar más que el timeout natural de la llamada real.

### 8. Resize de imagen client-side

**Decisión:** Canvas API para redimensionar a max 1024px (lado mayor), JPEG q=0.7.

**Justificación:** Reduce payload de ~4MB a ~200KB. Bedrock vision no necesita
más resolución. Reduce tiempo de upload en 3G.

**Alternativa descartada:** Resize en Lambda — no ahorra ancho de banda del upload.

## Resolved Assumptions

Ante las ambigüedades del requirements, este diseño asume:

1. **Cultivos MVP:** soja, maíz, poroto (los tres principales del NOA).
2. **Etapa fenológica:** selección manual de una lista cerrada al crear la
   parcela. Editable después desde el detalle.
3. **Sync client→server:** pull-based. El cliente envía la cola al recuperar
   conexión y luego hace GET para datos frescos.
4. **Triage local de diagnóstico (REQ-5 AC3):** análisis de histograma de
   color sobre canvas. Se dibuja la imagen en un `<canvas>`, se recorre
   `getImageData` y se calcula la proporción de píxeles amarillo/marrón
   contra verde (umbrales HSL configurables). Devuelve severidad preliminar
   (1-3) y encola la imagen para diagnóstico completo con Bedrock.
5. **Push sin auth:** suscripción asociada al device-id. Un dispositivo = una
   suscripción activa.
6. **Deduplicación:** ventana de 12h desde la última alerta *entregada*
   (mostrada al usuario o enviada como push), no desde la generada.
7. **iOS:** Background Sync no funciona en Safari. La app sincroniza al reabrir
   (evento `visibilitychange`). Se documenta la limitación.
8. **Ingesta programada:** solo para parcelas con suscripción push activa.
9. **Prompt API:** contexto acotado a pronóstico de 3 días + cultivo + etapa.
10. **Network Information API:** si no existe, asumir conexión buena y dejar
    que el timeout decida.
11. **Compartir:** cultivo, localidad, alerta y acción. Nunca coordenadas.
