# Stack técnico

## Frontend — packages/frontend
React 18 + Vite + TypeScript (strict). Tailwind (tema oscuro).
vite-plugin-pwa (Workbox). Zustand estado. idb para IndexedDB. Zod validación.
Tests: Vitest + Testing Library.

## Backend — packages/backend
NestJS sobre Lambda vía @codegenie/serverless-express.
Módulos: Parcels, Climate, Motor, Push.
DynamoDB single-table. EventBridge Scheduler. Bedrock. web-push (VAPID).
Tests: Jest.

## Shared — packages/shared
Schemas Zod y tipos derivados. Única fuente de verdad de los contratos.
Frontend y backend importan de acá. Nunca se duplica una interfaz.

## APIs externas
Open-Meteo (sin API key, incluye variables agro). NASA POWER como histórico.

## Reglas no negociables
- TypeScript strict. Nada de `any`; si no se puede tipar, `unknown` + narrowing.
- Todo dato que cruza un borde (HTTP, IndexedDB, respuesta de LLM) se valida
  con Zod al ingresar. La salida de Bedrock NO se confía: se parsea y valida.
- Sin secretos en código. Nada de `AKIA...`, ARNs ni endpoints hardcodeados.
  Config por variables de entorno; en AWS, SSM Parameter Store.
- Toda llamada de red: timeout explícito, retry con backoff, y fallback definido.
- Errores tipados, no `throw new Error(string)` suelto.
