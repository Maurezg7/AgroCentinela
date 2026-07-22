# Implementation Plan: AgroCentinela MVP

## Overview

Plan de implementación de 7 días (D1-D7) para el hackathon. Tres responsables:
Esteban (frontend), Leito (backend), Mauro (IA + infra). El paquete
`@agrocentinela/shared` ya está implementado y mergeado; todas las tareas
importan de ahí.

## Notes

- `[P]` = paralelizable con las demás tareas del mismo día marcadas `[P]`.
- `[B]` = bloqueante para el día siguiente.
- Cada tarea incluye tests de la lógica de negocio que produce.
- Cada tarea cabe en una rama de una jornada como máximo.

## Tasks

---

## D1 — Fundaciones y deploy vacío funcionando

### T-1.0a [B] Habilitar model access de Bedrock
**Responsable:** Mauro
**Satisface:** REQ-3.1, REQ-5.2

- Solicitar acceso a los modelos necesarios (Claude para texto, Claude para
  visión) en la región elegida desde la consola de Bedrock.
- La aprobación no es instantánea; hacerlo lo antes posible en D1.
- Verificar que el model ID queda accesible vía API.
- Documentar región y model IDs en SSM Parameter Store.

### T-1.0b [B] Generar claves VAPID y guardar en SSM
**Responsable:** Mauro
**Satisface:** REQ-4.1, NF-3

- Generar par de claves VAPID (`web-push generate-vapid-keys`).
- Almacenar private key en SSM Parameter Store como SecureString.
- Almacenar public key en SSM como String (la consume el frontend).
- Es entrada tanto de backend (envío push) como de frontend (suscripción).
- Documentar los parameter names en el README de infra.

### T-1.0c [B] Verificar disponibilidad de Prompt API
**Responsable:** Mauro
**Satisface:** REQ-3.4

- En los equipos del equipo: verificar que Chrome ≥ 127 con flags
  `chrome://flags/#optimization-guide-on-device-model` habilitado.
- Comprobar que `window.ai` está disponible y que el modelo local se descarga.
- Documentar el resultado: versiones de Chrome, tiempos de descarga del
  modelo, y si la API responde correctamente a un prompt básico.
- Si no está disponible en algún equipo: documentar workaround (usar Canary
  o aceptar fallback a motor de reglas en ese dispositivo).

### T-1.1 [B] Setup frontend: Vite + React + Tailwind + PWA
**Responsable:** Esteban
**Satisface:** REQ-6.1, REQ-6.6, NF-1

- Scaffold Vite + React 18 + TypeScript strict.
- Tailwind con tema oscuro por defecto.
- vite-plugin-pwa con manifest válido y SW mínimo (precache app shell).
- Zustand instalado, store vacío.
- `idb` instalado, helper `idb-store.ts` con apertura de DB y stores vacíos
  según design (parcels, climate, alerts, sync-queue, diagnosis, config).
- Generar `deviceId` UUID v4 al primer arranque, persistir en IDB `config`.
- Importar schemas desde `@agrocentinela/shared`.
- Lighthouse PWA ≥ 90 con app vacía.
- Deploy a S3 + CloudFront (o Amplify Hosting) con HTTPS.

### T-1.2 [B] Setup backend: NestJS + serverless-express + DynamoDB
**Responsable:** Leito
**Satisface:** NF-3, NF-4, NF-5

- Scaffold NestJS con @codegenie/serverless-express.
- DynamoDB table `AgroCentinela` con PK/SK/GSI1PK/GSI1SK/TTL.
- `dynamo.provider.ts` con Document Client singleton.
- `logger.service.ts` JSON estructurado con correlation-id (sin PII/ARN).
- Clases de error tipadas (`AppError` con code, message, context).
- Health endpoint `GET /health`.
- Deploy Lambda + API Gateway con HTTPS.
- IaC mínima (SAM o CDK) para tabla + Lambda + API GW.
- Test: health endpoint responde 200.

### T-1.3 [B] Infra base: EventBridge + SQS + S3 bucket
**Responsable:** Mauro
**Satisface:** REQ-2.3, REQ-5 (presigned URL flow)

- EventBridge rule (cron diario, deshabilitada hasta D2).
- SQS queue para fan-out de ingesta climática.
- S3 bucket para imágenes de diagnóstico (lifecycle policy 90d).
- IaC para todos los recursos.
- Test: deploy exitoso, recursos creados.

---

## D2 — Ingesta de clima y caché offline

### T-2.1 [P] Backend: ingesta Open-Meteo + persistencia DynamoDB
**Responsable:** Leito
**Satisface:** REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4

- `climate.service.ts`: fetch a Open-Meteo con timeout 10s + retry x1 backoff.
- Mapeo de respuesta Open-Meteo → `ClimateCacheSchema` (validación Zod).
  - `days[]` desde `daily.*` (7 entradas).
  - `hourly48h[]` recorte a índices 0..47.
- PutItem con PK = `PARCEL#<id>`, SK = `CLIMATE#LATEST`, TTL +7d.
- `climate.scheduler.ts` (handler EventBridge): Query GSI1 `PUSH#ACTIVE` →
  obtiene deviceIds → Query AP1 por cada → publica mensaje SQS por parcela.
- Lambda worker: consume SQS, invoca `climate.service.ts` por parcela.
- `GET /climate/:parcelId` devuelve el ítem cacheado.
- Tests: ingesta happy path, timeout, respuesta inválida, retry.

### T-2.2 [P] Backend: CRUD de parcelas
**Responsable:** Leito
**Satisface:** REQ-1.5, REQ-1.6, REQ-1.7

- `POST /parcels`: valida body con `ParcelCreateSchema`, genera id + timestamps,
  PutItem con condition `attribute_not_exists(PK)` (idempotencia).
  Escribe `updatedAt` = `createdAt` en creación.
- `GET /parcels?deviceId=x`: Query AP1.
- `GET /parcels/:id`: Query AP5 (GSI1).
- `PATCH /parcels/:id`: actualiza stage/name, escribe `updatedAt = now()`.
  Condition expression `updatedAt < :newVal` (last-write-wins).
- Tras crear/sync parcela, dispara ingesta clima para esa parcela.
- Tests: creación, duplicado, edición, last-write-wins conflict, listado vacío.

### T-2.3 [P] Frontend: alta de parcela con geolocalización
**Responsable:** Esteban
**Satisface:** REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5, REQ-1.6, REQ-1.7

- Formulario: nombre, cultivo (enum), etapa (enum), hectáreas, ubicación.
- `use-geolocation.ts`: solicita permiso, timeout 15s, fallback manual.
- Validación con `ParcelCreateSchema` (errores por campo).
- Persistencia en IDB antes de llamar red.
- Si offline: encola en `sync-queue` store como `create-parcel`.
- `sync-queue.ts`: Background Sync registration con tag `sync-queue`.
- Indicador de sync pendiente visible.
- Tests: permiso denegado, timeout GPS, validación inválida, flujo offline.

### T-2.4 [P] Frontend: visualización de clima cacheado
**Responsable:** Esteban
**Satisface:** REQ-2.5, REQ-6.2

- `GET /climate/:parcelId` al abrir detalle (si online).
- Persistir respuesta en IDB store `climate`.
- Mostrar pronóstico 7 días con fecha de última actualización.
- Si offline: leer de IDB, badge "Actualizado hace X".
- Si dato expirado (`expiresAt < now()`): badge de advertencia.
- Tests: render con datos, render offline, dato expirado.

### T-2.5 [P] Backend: POST /sync (variante create-parcel)
**Responsable:** Leito
**Satisface:** REQ-6.3, REQ-1.6

- `POST /sync`: recibe array de `SyncOperationSchema`.
- En D2 solo implementa dispatch para `type: 'create-parcel'`:
  reutiliza lógica de POST /parcels (idempotente por condition expression).
- Responde con status por operación (`synced` | `failed` + error).
- Las variantes `alert-delivered` y `diagnosis-upload` se agregan en D3 y D5
  respectivamente, junto a la tarea que introduce cada una.
- Tests: sync create-parcel happy path, duplicado (idempotente), payload
  inválido.

---

## D3 — Motor de alertas con Bedrock

### T-3.1 [P] Backend: endpoint de generación de alertas
**Responsable:** Leito
**Satisface:** REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.7

- `POST /alerts/generate` recibe `{ parcelId, deviceId }`.
- Obtiene clima (AP2) y parcela (AP5).
- Invoca `motor.service.ts` que llama a Bedrock (Mauro provee el prompt).
- Valida respuesta con `BedrockAlertResponseSchema`.
- Si inválida: log structured + fallback a `rule-engine.service.ts`.
- Deduplicación: Query AP3 filtra alertas con mismo `condition` donde
  `deliveredAt` está dentro de últimas 12h → descarta si existe.
- PutItem alerta con `deliveredAt: null`.
- Conectar el worker de SQS de ingesta climática (T-2.1) para que, tras
  persistir el clima, invoque la generación de alerta para esa parcela.
  Esto cierra la cadena EventBridge → clima → alerta → push (REQ-4.2).
- Tests: happy path, respuesta Bedrock inválida, deduplicación, fallback,
  encadenamiento clima→alerta.

### T-3.2 [P] IA: prompt de Bedrock + motor de reglas en shared
**Responsable:** Mauro
**Satisface:** REQ-3.1, REQ-3.2, REQ-3.5, REQ-3.8

- Diseño del prompt con delimitadores explícitos (instrucción vs datos).
  Instrucción: `"condition" MUST be one of: "helada", "estres-hidrico"`.
  Contexto: clima 7d + cultivo + etapa. Output: JSON validable.
- Motor de reglas implementado en `packages/shared/src/rules/rule-engine.ts`
  (una sola implementación, importada tanto por backend como por frontend).
  Reglas: helada, estrés hídrico, modulación por etapa fenológica.
- Sanitización de la salida del LLM antes de pasar al controller.
- Tests (en packages/shared): regla helada, regla estrés, modulación por
  etapa, edge cases (datos vacíos, valores límite).
- Tests (en backend): prompt genera JSON válido (mock Bedrock),
  sanitización de HTML/scripts.

### T-3.3 [P] Frontend: timeline de alertas
**Responsable:** Esteban
**Satisface:** REQ-3.6, REQ-6.2

- Pantalla de alertas: lista ordenada por fecha, badge de severidad.
- Indicador de motor que generó la alerta (nube/on-device/reglas).
- Persistencia en IDB store `alerts`.
- Al renderizar una alerta sin `deliveredAt`: escribir `deliveredAt = now()`
  en IDB y encolar `alert-delivered` en sync-queue.
- Offline: leer de IDB.
- Tests: render lista, escritura de deliveredAt, offline fallback.

### T-3.5 [P] Backend: sync variante alert-delivered
**Responsable:** Leito
**Satisface:** REQ-3.7

- Extender `POST /sync` para dispatch `type: 'alert-delivered'`.
- Escribe `deliveredAt` solo si valor actual es null (condition expression
  `attribute_not_exists(deliveredAt) OR deliveredAt = :null`).
- Se introduce junto a T-3.3 que es la tarea que encola esta variante.
- Tests: alert-delivered happy path, con valor previo no-null (no overwrite).

### T-3.4 [P] Frontend: captura de foto + resize
**Responsable:** Esteban
**Satisface:** REQ-5.1, REQ-5.4

- No depende de ningún endpoint; se adelanta a D3 para liberar carga de
  Esteban en D4 (donde el push frontend es más complejo).
- `getUserMedia` con constraints de cámara trasera.
- Preview en `<video>`, captura a `<canvas>`.
- Si permiso denegado: fallback a `<input type="file" accept="image/*">`.
- `image-utils.ts`: resize a max 1024px lado mayor, JPEG q=0.7.
- Almacenar blob resultante en IDB store `diagnosis` con status `pending`.
- Tests: resize produce dimensiones correctas, fallback a galería.

---

## D4 — Web Push end-to-end

### T-4.1 [P] Backend: suscripción y envío push
**Responsable:** Leito
**Satisface:** REQ-4.1, REQ-4.2, REQ-4.5

- `POST /push/subscribe`: valida con `PushSubscriptionSchema`, PutItem con
  GSI1PK = `PUSH#ACTIVE`, GSI1SK = `DEVICE#<deviceId>`.
- `DELETE /push/unsubscribe`: elimina ítem + remueve de GSI1.
- Tras generar alerta severidad ≥ 4: `push.service.ts` envía notificación.
  - Si `sendNotification()` resuelve 201: escribe `deliveredAt = now()` en
    alerta (condition: `attribute_not_exists(deliveredAt) OR deliveredAt = :null`).
  - Si falla: log, no escribe deliveredAt.
- Payload push: `{ title, body, parcelId, severity }`.
- Vibration pattern en payload: corto (sev 4) o largo (sev 5).
- Tests: suscripción, envío exitoso + deliveredAt, envío fallido, unsub.

### T-4.2 [P] Frontend: permiso push + SW notification handler
**Responsable:** Esteban
**Satisface:** REQ-4.1, REQ-4.3, REQ-4.4

- Solicitar permiso de notificaciones (una vez, no reintentar si denegado).
- Registrar suscripción push → `POST /push/subscribe`.
- SW: listener `push` → mostrar notificación con title/body.
- SW: listener `notificationclick` → abrir app en `/parcelas/:parcelId`.
- Si permiso denegado: no volver a pedir, mostrar alertas solo in-app.
- Testing: se hace en `localhost` (secure context). Disparar push desde
  Chrome DevTools → Application → Service Workers → Push. No requiere HTTPS
  ni un segundo dispositivo.
- Tests: flujo de suscripción, handler de click (mock SW).

### T-4.3 [P] Infra: permisos Lambda para push
**Responsable:** Mauro
**Satisface:** REQ-4.1, NF-3

- Lambda push-service con permisos: ssm:GetParameter (VAPID keys de T-1.0b),
  dynamodb CRUD para suscripciones y alertas.
- Actualizar IaC.
- Test: Lambda puede leer VAPID keys de SSM y escribir en DynamoDB.

---

## D5 — IA on-device y diagnóstico por foto

### T-5.1 [P] Frontend: conmutador de motores de IA
**Responsable:** Esteban
**Satisface:** REQ-3.4, REQ-3.5, REQ-6.4

- `use-ai-engine.ts`: lógica de decisión según design (network status →
  Bedrock / Prompt API / reglas).
- `use-network-status.ts`: `navigator.connection.effectiveType` con fallback
  a `navigator.onLine` (si API no existe, asumir buena + dejar que timeout
  decida).
- Si Prompt API (`window.ai`): feature detection, contexto acotado a
  pronóstico 3 días + cultivo + etapa. Validar respuesta con
  `BedrockAlertResponseSchema`. Si inválida → fallback reglas.
- Motor de reglas client-side: importa `@agrocentinela/shared/rules/rule-engine`
  (implementado en T-3.2). No se reimplementa.
- Tests: cada branch del conmutador, Prompt API no disponible, respuesta
  inválida de Prompt API, integración con motor de reglas importado.

### T-5.2 [P] Frontend: triage local por histograma de color
**Responsable:** Esteban
**Satisface:** REQ-5.3

- `image-triage.ts`: dibuja imagen en canvas offscreen, recorre `getImageData`.
- Convierte RGB→HSL, clasifica píxeles en verde vs amarillo/marrón (umbrales
  HSL configurables como constantes).
- Calcula `greenRatio`, `yellowBrownRatio`, `preliminarySeverity` (1-3).
- Resultado validado con `TriageResultSchema`.
- Muestra severidad preliminar al usuario + "Se completará con señal".
- Persiste en IDB diagnosis con status `pending` + triage.
- Tests: imagen verde pura → severidad 1, imagen marrón → severidad 3,
  imagen mixta → severidad 2.

### T-5.3 [P] Backend: diagnóstico con Bedrock Vision
**Responsable:** Mauro
**Satisface:** REQ-5.2, REQ-5.5

- `POST /diagnosis`: recibe `{ parcelId, imageKey }`.
- Genera presigned GET URL del S3 key.
- Invoca Bedrock con capacidad de visión (imagen + prompt de diagnóstico).
- Valida respuesta con `DiagnosisCompletedSchema`.
- Si falla: marca status `failed` con errorCode.
- Siempre incluye disclaimer en la respuesta.
- No depende de T-3.4 (la captura solo guarda en IDB, no sube a S3).
  Se testea con una imagen cargada manualmente al bucket.
- Tests: diagnóstico exitoso, respuesta inválida, timeout Bedrock.

### T-5.5 [P] Backend: GET /diagnosis/upload-url
**Responsable:** Leito
**Satisface:** REQ-5.2

- `GET /diagnosis/upload-url?parcelId=x`: genera presigned PUT URL para el
  bucket de imágenes (S3) con key `diagnosis/<parcelId>/<uuid>.jpg`,
  content-type `image/jpeg`, expira en 5 minutos.
- Valida que parcelId existe (Query AP5).
- Retorna `{ uploadUrl, imageKey }`.
- Tests: URL generada válida, parcelId inexistente → 404, expiración correcta.

### T-5.6 [P] Backend: sync variante diagnosis-upload
**Responsable:** Leito
**Satisface:** REQ-5.3, REQ-6.3

- Extender `POST /sync` para dispatch `type: 'diagnosis-upload'`.
- Valida payload con `SyncDiagnosisUploadSchema`.
- Marca diagnosis para procesamiento (invoca lógica de T-5.3).
- Se introduce junto a T-5.4 que encola esta variante.
- Tests: diagnosis-upload happy path, imageKey inválido.

### T-5.4 [P] Frontend: flujo completo de diagnóstico
**Responsable:** Esteban
**Satisface:** REQ-5.2, REQ-5.3, REQ-5.5

- Si online: `GET /diagnosis/upload-url` → sube imagen con presigned PUT →
  `POST /diagnosis` con imageKey.
- Muestra resultado con nivel de confianza + disclaimer.
- Si offline: muestra resultado de triage local + encola `diagnosis-upload`
  en sync-queue.
- Al sync: sube imagen + llama diagnóstico. Actualiza IDB con resultado.
- Depende de T-5.2 (triage), T-5.3 (endpoint diagnóstico), T-5.5 (upload URL).
- Tests: flujo online, flujo offline, transición offline→online.

---

## D6 — Hardening, cobertura y Lighthouse

### T-6.1 [P] Frontend: compartir alertas
**Responsable:** Esteban
**Satisface:** REQ-7.1, REQ-7.2, REQ-7.3

- Web Share API con texto: cultivo, nombre parcela (localidad), alerta,
  acción recomendada, fecha. Sin coordenadas.
- Fallback: copiar al portapapeles + toast de confirmación.
- Tests: share exitoso (mock), fallback clipboard.

### T-6.2 [P] Frontend: indicador de conectividad + sync visual
**Responsable:** Esteban
**Satisface:** REQ-6.5

- Banner persistente: online/offline + "N operaciones pendientes".
- Actualización reactiva vía `online`/`offline` events + store Zustand.
- Al recuperar conexión: trigger sync automático (Background Sync o manual
  via `visibilitychange` para iOS).
- Tests: transición online↔offline actualiza UI.

### T-6.3 [P] Backend: hardening de POST /sync
**Responsable:** Leito
**Satisface:** REQ-6.3

- Rate limiting por deviceId (throttle para evitar replay masivo).
- Validación de tamaño máximo del array (max 50 operaciones por request).
- Logging estructurado de cada operación procesada con correlation-id.
- Retry logic: si una operación individual falla, las demás continúan;
  responde con status parcial.
- Tests: array > 50 → 400, operación individual falla no afecta resto,
  payload malformado por variante.

### T-6.4 [P] Cobertura de tests ≥ 70%
**Responsable:** Esteban (frontend) + Leito (backend)
**Satisface:** NF-2

- Revisar cobertura actual con `vitest --coverage` y `jest --coverage`.
- Agregar tests faltantes en lógica de negocio (services, hooks, lib).
- Foco en edges: lista vacía, timeout, permiso denegado, schema inválido.
- Target: ≥ 70% en statements para `src/services`, `src/lib`, `src/hooks`
  (frontend) y `src/**/*.service.ts` (backend).

### T-6.5 [P] Lighthouse + performance
**Responsable:** Esteban
**Satisface:** NF-1, REQ-6.6

- Audit Lighthouse PWA ≥ 90.
- FCP < 2s en 3G simulada.
- Revisar bundle size, tree-shaking, code-splitting por ruta.
- Optimizar precache manifest (excluir assets innecesarios).

### T-6.6 [P] Infra: permisos finales + logs + monitoreo
**Responsable:** Mauro
**Satisface:** NF-3, NF-5

- Revisar IAM: least privilege por función, sin wildcards en Resource.
- Validar que no hay secretos en bundle (scan con `trufflehog` o similar).
- CloudWatch log groups con retention 7d.
- Alarma en errores 5xx > 5/min.

---

## D7 — Entrega

### T-7.1 [B] Integración final + smoke test
**Responsable:** Todos
**Satisface:** Todos los REQs

- Smoke test manual del flujo completo:
  1. Alta parcela (online + offline).
  2. Ver pronóstico cacheado.
  3. Generar alerta (Bedrock + reglas).
  4. Recibir push.
  5. Foto → triage local → diagnóstico con señal.
  6. Compartir alerta.
- Fix de bugs bloqueantes encontrados.
- Merge a main.

### T-7.2 [P] Demo prep + documentación
**Responsable:** Mauro
**Satisface:** —

- README con setup, arquitectura, y decisiones clave.
- Script de demo (qué mostrar, en qué orden).
- Video backup por si falla la demo en vivo.

### T-7.3 [P] Deploy final a producción
**Responsable:** Mauro
**Satisface:** NF-4

- Deploy frontend a CloudFront con HTTPS.
- Deploy backend a Lambda + API Gateway (prod stage).
- Habilitar EventBridge rule de ingesta.
- Verificar CORS, headers de seguridad.
- Smoke test en producción.

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "D1 — Fundaciones",
      "tasks": ["T-1.0a", "T-1.0b", "T-1.0c", "T-1.1", "T-1.2", "T-1.3"],
      "parallel": true
    },
    {
      "name": "D2 — Clima y parcelas",
      "tasks": ["T-2.1", "T-2.2", "T-2.3", "T-2.4", "T-2.5"],
      "parallel": true,
      "dependsOn": ["T-1.1", "T-1.2", "T-1.3"]
    },
    {
      "name": "D3 — Motor de alertas + captura foto",
      "tasks": ["T-3.1", "T-3.2", "T-3.3", "T-3.4", "T-3.5"],
      "parallel": true,
      "dependsOn": ["T-2.1", "T-2.2", "T-2.5", "T-1.0a"]
    },
    {
      "name": "D4 — Web Push end-to-end",
      "tasks": ["T-4.1", "T-4.2", "T-4.3"],
      "parallel": true,
      "dependsOn": ["T-3.1", "T-1.0b"]
    },
    {
      "name": "D5 — IA on-device y diagnóstico",
      "tasks": ["T-5.1", "T-5.2", "T-5.3", "T-5.4", "T-5.5", "T-5.6"],
      "parallel": true,
      "dependsOn": ["T-3.2", "T-3.4", "T-1.0c", "T-1.0a"]
    },
    {
      "name": "D6 — Hardening",
      "tasks": ["T-6.1", "T-6.2", "T-6.3", "T-6.4", "T-6.5", "T-6.6"],
      "parallel": true,
      "dependsOn": ["T-5.1", "T-5.4"]
    },
    {
      "name": "D7 — Entrega",
      "tasks": ["T-7.1", "T-7.2", "T-7.3"],
      "parallel": false,
      "dependsOn": ["T-6.1", "T-6.2", "T-6.3", "T-6.4", "T-6.5", "T-6.6"]
    }
  ]
}
```

Dependencias cross-día:
- T-1.0a es prerequisito de T-3.1, T-5.3 (Bedrock debe estar habilitado).
- T-1.0b es prerequisito de T-4.1 y T-4.2 (VAPID keys necesarias).
- T-1.0c es prerequisito de T-5.1 (saber si Prompt API funciona).
- T-2.1 requiere T-1.2 + T-1.3 (tabla + SQS).
- T-2.3 requiere T-1.1 (IDB store + deviceId).
- T-2.5 requiere T-2.2 (lógica de create parcels que reutiliza).
- T-3.1 requiere T-2.1 (clima en DynamoDB + worker SQS a conectar) + T-2.2 (parcela existente).
- T-3.3 requiere T-3.1 (endpoint que genera alertas).
- T-3.4 no tiene dependencias de endpoint (solo T-1.1 para IDB).
- T-3.5 requiere T-2.5 (POST /sync base) + T-3.3 (encola alert-delivered).
- T-4.1 requiere T-3.1 (genera alerta → dispara push).
- T-4.2 requiere T-4.1 (endpoint de suscripción).
- T-5.1 requiere T-3.2 (motor de reglas en shared).
- T-5.3 es independiente (se testea con imagen manual en S3).
- T-5.4 requiere T-5.2 + T-5.3 + T-5.5 (triage + diagnóstico + upload URL).
- T-5.5 requiere T-1.3 (bucket S3 existente).
- T-5.6 requiere T-2.5 (POST /sync base) + T-5.4 (encola diagnosis-upload).
- T-6.3 requiere T-2.5 + T-3.5 + T-5.6 (todas las variantes implementadas).
