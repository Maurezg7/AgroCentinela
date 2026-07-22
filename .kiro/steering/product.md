# AgroCentinela

PWA offline-first de alertas agroclimáticas para productores del NOA argentino.

## Problema
El productor pierde cultivo por heladas y estrés hídrico porque el pronóstico
genérico no le dice qué hacer en SU parcela, y en el campo no hay señal.

## Principio rector
**Offline es el caso normal, no el degradado.** Toda feature se diseña asumiendo
que el dispositivo está sin conexión. La conectividad es un enriquecimiento.

## IA híbrida
- Con señal: Amazon Bedrock (razonamiento + visión sobre foto de hoja).
- Sin señal: LLM on-device (Prompt API) sobre datos cacheados en IndexedDB.
- Sin Prompt API disponible: motor de reglas determinístico. Nunca "no disponible".

## Usuario
Productor de 45-65 años, teléfono Android gama media, guantes puestos, sol directo.
Implica: targets táctiles grandes, alto contraste, texto sin jerga técnica,
acciones concretas ("regá antes del anochecer"), no probabilidades abstractas.

## Fuera de alcance (MVP hackathon)
Multi-usuario, autenticación, pagos, riego automatizado, apps nativas.
