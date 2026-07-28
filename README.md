# 🌱 AgroCentinela

**El agrónomo de bolsillo que funciona sin señal.**

PWA offline-first que entrega alertas agroclimáticas accionables a pequeños productores del Noroeste Argentino (NOA). Con conexión razona con IA en la nube; sin conexión, sigue funcionando con IA on-device y un motor de reglas determinístico.

Proyecto desarrollado para el **Hackathon IA Masivo Online AWS — Código Facilito + Kiro** (julio 2026).

| | |
|---|---|
| 🌐 **App (PWA)** | https://agrocentinela.netlify.app |
| ⚙️ **API** | https://x0ggao7aqh.execute-api.us-east-1.amazonaws.com |
| 📦 **Repositorio** | https://github.com/Maurezg7/AgroCentinela |

---

## El problema

El productor del NOA pierde cultivo por heladas tardías y estrés hídrico. El pronóstico genérico no le dice qué hacer en *su* parcela, y cuando está en el lote no tiene señal. Cuando se entera del riesgo, muchas veces ya perdió la cosecha.

## La solución

Una PWA donde el productor registra su parcela —cultivo, etapa y ubicación con un tap— y recibe alertas concretas: no "probabilidad de helada del 70%", sino **"Regá antes del anochecer para proteger la floración de soja"**.

El principio rector es que **el modo sin conexión es el caso normal, no el degradado**. Cada funcionalidad se diseñó asumiendo que el teléfono está sin señal en el campo; la conectividad solo enriquece.

---

## 🧠 IA híbrida de tres capas

El corazón de AgroCentinela es un conmutador que garantiza que **siempre** haya una respuesta, sin importar la conectividad ni el dispositivo:

```
                    ¿Hay conexión efectiva?
                  (navigator.onLine + NetworkInformation)
                            │
              ┌─────────────┴─────────────┐
              │ SÍ                         │ NO
              ▼                            ▼
      ┌───────────────┐          ┌──────────────────────┐
      │ Amazon Bedrock│          │ ¿Prompt API on-device │
      │  (Claude)     │          │  disponible?          │
      └───────┬───────┘          └──────────┬───────────┘
              │                    ┌─────────┴─────────┐
              │                    │ SÍ                │ NO
              │                    ▼                   ▼
              │           ┌────────────────┐  ┌────────────────┐
              │           │ Prompt API     │  │ Motor de reglas│
              │           │ (Gemini Nano)  │  │ determinístico │
              │           └────────┬───────┘  └────────────────┘
              │                    │
        ¿Valida schema Zod? ──NO──→ Motor de reglas
              │ SÍ
              ▼
         Alerta accionable
```

Cada alerta muestra en la interfaz qué motor la generó: **Modelo en la nube**, **IA en el dispositivo** o **Regla local**. La salida de cualquier LLM se trata como entrada no confiable: se valida con Zod y se sanitiza antes de mostrarse.

> **Nota de transparencia:** en las cuentas de AWS nuevas los modelos de Bedrock requieren aprobación de cuota, que al momento de la entrega seguía pendiente. Gracias al diseño de fallback, la app opera sin interrupción con el motor de reglas —el camino degradado quedó probado contra un fallo real, que es justamente lo que garantiza la robustez del sistema.

---

## 🌐 Las 8 APIs del navegador

Cada una cumple un propósito real dentro del flujo offline-first:

| # | API | Para qué se usa |
|---|-----|-----------------|
| 1 | **Service Worker + Background Sync** | La app funciona sin conexión y sincroniza las operaciones encoladas cuando la señal vuelve, incluso con la app cerrada. |
| 2 | **IndexedDB** | Réplica local de parcelas, pronósticos y alertas. Fuente de verdad cuando no hay red. |
| 3 | **Geolocation** | Alta de parcela parado en el campo, con un tap. |
| 4 | **getUserMedia (Cámara)** | Captura de foto de hoja para diagnóstico. |
| 5 | **Canvas** | Análisis de histograma de color on-device para el triage preliminar de la foto, sin enviar nada a un servidor. |
| 6 | **Prompt API (on-device)** | Generación de alertas con IA local (Gemini Nano) cuando no hay conexión. |
| 7 | **Web Push + Notifications** | Aviso de helada crítica aunque la app esté cerrada, vía VAPID. |
| 8 | **Network Information** | Decide qué motor de IA usar y evita transferencias pesadas en conexiones lentas o medidas. |

Complementan **Vibration** (patrón proporcional a la severidad de la alerta) y **Web Share** (reenvío de alertas a vecinos, sin exponer coordenadas).

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│ CLIENTE (PWA · React + Vite)                             │
│                                                          │
│  UI ←→ Zustand ←→ Services ←→ IndexedDB                  │
│                       │                                  │
│                       │ (online)                         │
│                       ▼                                  │
│                  Sync Queue ──→ Background Sync          │
└───────────────────────│──────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│ AWS · API Gateway + Lambda (NestJS)                     │
│                                                          │
│  Controllers → Services → DynamoDB (single-table)       │
│                    ├──→ Open-Meteo (clima)              │
│                    ├──→ Amazon Bedrock (Claude)         │
│                    └──→ Web Push (VAPID)                 │
│                                                          │
│  EventBridge → Ingesta programada → SQS → Worker        │
└─────────────────────────────────────────────────────────┘
```

**Monorepo** con tres paquetes y contratos compartidos:

```
packages/
├── frontend/   React 18 + Vite + TypeScript + Tailwind (PWA)
├── backend/    NestJS sobre Lambda (@codegenie/serverless-express)
└── shared/     Schemas Zod — única fuente de verdad de los contratos
```

`packages/shared` es la pieza que mantiene alineados a frontend y backend: los tipos se definen una sola vez con Zod y ambos lados los importan. Nunca se duplica una interfaz.

---

## 🛠 Stack

**Frontend**
- React 18 · Vite · TypeScript (strict)
- Tailwind CSS (tema oscuro, mobile-first, pensado para uso con guantes bajo el sol)
- vite-plugin-pwa (Workbox) · Zustand · idb · Zod
- Tests: Vitest + Testing Library

**Backend**
- NestJS sobre AWS Lambda
- DynamoDB single-table con GSI · EventBridge Scheduler · SQS
- Amazon Bedrock (Claude) · web-push (VAPID)
- Tests: Jest

**Datos externos**
- [Open-Meteo](https://open-meteo.com/) — pronóstico agroclimático, sin API key
- Amazon Bedrock — razonamiento y redacción de alertas

**Infraestructura**
- AWS SAM (IaC) · API Gateway HTTP API · AWS Amplify Hosting (HTTPS automático)
- SSM Parameter Store para secretos (claves VAPID, configuración de modelos)

---

## 🤖 Desarrollado con Kiro

El proyecto se construyó con **Kiro** como herramienta central de desarrollo asistido por IA, aprovechando su flujo de *spec-driven development*:

- **Steering** (`.kiro/steering/`) — reglas de producto, stack, estructura y criterio de ingeniería que Kiro respeta en cada interacción. Es lo que hace que el código generado tenga criterio de senior en lugar de ser genérico.
- **Specs** (`.kiro/specs/agrocentinela-mvp/`) — `requirements.md` en formato EARS → `design.md` → `tasks.md`. Cada requisito es trazable hasta el código que lo implementa.
- **Trazabilidad** — cada tarea cita los requisitos que satisface, y cada decisión de diseño quedó documentada con sus alternativas descartadas.

Este enfoque permitió detectar y resolver contradicciones de diseño *antes* de escribir código —schemas inconsistentes, access patterns mal planteados, huecos en el flujo offline— que de otro modo habrían aparecido como bugs de integración sobre el cierre.

---

## 🚀 Correr localmente

**Requisitos:** Node.js ≥ 18, credenciales de AWS configuradas (para el backend).

```bash
# 1. Clonar e instalar
git clone https://github.com/Maurezg7/AgroCentinela.git
cd AgroCentinela
npm install

# 2. Compilar los contratos compartidos (siempre antes del resto)
cd packages/shared && npm run build && cd ../..

# 3. Backend (terminal 1)
cd packages/backend
npm run start:dev          # http://localhost:3000

# 4. Frontend (terminal 2)
cd packages/frontend
npm run build && npx vite preview   # http://localhost:4173
```

> El frontend se prueba con `build && preview` (no `dev`) porque el Service Worker y Web Push requieren el bundle de producción.

**Probar el flujo offline:**
1. Cargá una parcela con conexión (descarga el clima).
2. DevTools → Network → **Offline**.
3. Tocá "Chequear riesgo": la alerta se genera igual, marcada como **Regla local**.
4. Volvé a activar la conexión: las operaciones encoladas se sincronizan solas.

---

## ☁️ Deploy

**Backend** (Lambda + API Gateway, vía SAM):
```bash
cd infra
./deploy.sh dev
```

**Frontend** (Amplify Hosting): deploy automático al hacer push a la rama `develop`. La configuración está en `amplify.yml`.

---

## 👥 Equipo

| Integrante | Rol |
|------------|-----|
| **Mauro Leonel Gómez** | Arquitectura, IA, frontend, infraestructura y deploy |
| **Esteban Nahuel Ardaya** | Diseño UI/UX |
| **Leonel Tomás Ezequiel Morales** | Backend (versión inicial) · [repo campo-alerta](https://github.com/leitolml1/campo-alerta) · sistema de diseño |

---

## 📄 Licencia

MIT — Proyecto de hackathon, 2026.
