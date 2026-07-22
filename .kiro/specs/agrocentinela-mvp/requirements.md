# Requirements — AgroCentinela MVP

## Introducción

AgroCentinela es una PWA offline-first que entrega alertas agroclimáticas
accionables al productor del NOA argentino. El sistema opera sin conexión
como caso normal y enriquece su razonamiento cuando hay señal.

Alcance de este documento: el MVP entregable del hackathon (D1–D7).

---

## REQ-1: Alta de parcela con geolocalización

**Historia:** Como productor, quiero registrar una parcela parado en el campo,
para no tener que buscar coordenadas después desde la computadora.

### Criterios de aceptación

1. WHEN el usuario abre el formulario de alta THE SYSTEM SHALL mostrar campos
   para cultivo, superficie en hectáreas y ubicación.
2. WHEN el usuario toca "Usar mi ubicación" THE SYSTEM SHALL solicitar el permiso
   de Geolocation y completar latitud y longitud con precisión de al menos 100 m.
3. IF el permiso de geolocalización es denegado THEN THE SYSTEM SHALL permitir
   la carga manual de coordenadas y explicar en una línea por qué las necesita.
4. IF la señal GPS no se obtiene en 15 segundos THEN THE SYSTEM SHALL cancelar
   el intento y ofrecer reintentar o cargar manualmente.
5. WHEN el usuario confirma el alta THE SYSTEM SHALL persistir la parcela en
   IndexedDB antes de intentar cualquier llamada de red.
6. WHILE el dispositivo está sin conexión THE SYSTEM SHALL aceptar altas y
   encolarlas para sincronización posterior.
7. WHEN el formulario recibe datos inválidos THE SYSTEM SHALL rechazarlos con
   un mensaje específico por campo, validado contra el schema Zod compartido.

---

## REQ-2: Ingesta y caché de datos climáticos

**Historia:** Como productor, quiero que la app tenga el pronóstico de mi zona
aunque me quede sin señal, para decidir en el campo.

### Criterios de aceptación

1. WHEN una parcela se registra o sincroniza THE SYSTEM SHALL obtener de Open-Meteo
   el pronóstico de 7 días para sus coordenadas.
2. WHEN el pronóstico se recibe THE SYSTEM SHALL validarlo con Zod y persistirlo
   en DynamoDB con TTL de 7 días y replicarlo en IndexedDB del cliente.
3. THE SYSTEM SHALL ejecutar la ingesta de forma programada mediante EventBridge
   al menos una vez por día para todas las parcelas registradas.
4. IF Open-Meteo no responde dentro de 10 segundos THEN THE SYSTEM SHALL reintentar
   una vez con backoff y, si vuelve a fallar, conservar el último dato cacheado
   marcándolo con su antigüedad.
5. WHILE el dispositivo está sin conexión THE SYSTEM SHALL mostrar los datos
   cacheados indicando de forma visible la fecha de última actualización.

---

## REQ-3: Motor de alertas con IA híbrida

**Historia:** Como productor, quiero que la app me diga qué hacer y no solo
qué temperatura va a haber, porque el número solo no me sirve.

### Criterios de aceptación

1. WHEN hay conexión disponible THE SYSTEM SHALL generar la alerta invocando
   Amazon Bedrock con el pronóstico, el cultivo y la etapa fenológica.
2. THE SYSTEM SHALL validar la respuesta de Bedrock contra un schema Zod que
   exige: mensaje de alerta, severidad entre 1 y 5, y acción recomendada concreta.
3. IF la respuesta de Bedrock no valida contra el schema THEN THE SYSTEM SHALL
   descartarla, registrar el evento y recurrir al motor de reglas determinístico.
4. WHILE el dispositivo está sin conexión THE SYSTEM SHALL generar la alerta
   mediante la Prompt API on-device sobre los datos cacheados en IndexedDB.
5. IF la Prompt API no está disponible en el navegador THEN THE SYSTEM SHALL
   usar el motor de reglas determinístico sin degradar la experiencia.
6. THE SYSTEM SHALL indicar en la interfaz qué motor produjo cada alerta
   (nube, on-device o reglas).
7. THE SYSTEM SHALL suprimir alertas duplicadas para la misma parcela y condición
   dentro de una ventana de 12 horas.
8. THE SYSTEM SHALL tratar toda salida del LLM como входные no confiables:
   sanitizarla antes de renderizarla.

---

## REQ-4: Notificaciones push con la app cerrada

**Historia:** Como productor, quiero enterarme de una helada aunque no tenga
la app abierta, porque me entero cuando ya perdí el cultivo.

### Criterios de aceptación

1. WHEN el usuario habilita las notificaciones THE SYSTEM SHALL registrar una
   suscripción Web Push con claves VAPID y persistirla asociada al usuario.
2. WHEN el motor genera una alerta de severidad 4 o superior THE SYSTEM SHALL
   enviar una notificación push al dispositivo suscripto.
3. WHEN el usuario toca la notificación THE SYSTEM SHALL abrir la app en el
   detalle de la parcela correspondiente.
4. IF el permiso de notificaciones es denegado THEN THE SYSTEM SHALL continuar
   operando y mostrar las alertas dentro de la app sin volver a insistir.
5. THE SYSTEM SHALL hacer vibrar el dispositivo con un patrón proporcional a la
   severidad cuando la Vibration API esté disponible.

---

## REQ-5: Diagnóstico por foto de hoja

**Historia:** Como productor, quiero sacarle una foto a una hoja con manchas
y saber qué puede ser, para actuar antes de que se propague.

### Criterios de aceptación

1. WHEN el usuario elige diagnosticar THE SYSTEM SHALL solicitar acceso a la
   cámara mediante getUserMedia y mostrar la previsualización.
2. WHEN hay conexión THE SYSTEM SHALL enviar la imagen a Bedrock con capacidad
   de visión y devolver un diagnóstico con nivel de confianza.
3. WHILE el dispositivo está sin conexión THE SYSTEM SHALL realizar un triage
   local y encolar la imagen para análisis completo al recuperar señal.
4. IF el permiso de cámara es denegado THEN THE SYSTEM SHALL ofrecer subir una
   imagen desde la galería.
5. THE SYSTEM SHALL acompañar todo diagnóstico con una advertencia de que no
   sustituye la consulta a un ingeniero agrónomo.

---

## REQ-6: Operación offline integral

**Historia:** Como productor, quiero que la app funcione igual en el campo que
en mi casa, porque en el lote no tengo señal.

### Criterios de aceptación

1. THE SYSTEM SHALL instalarse como PWA con manifest válido y Service Worker.
2. WHILE el dispositivo está sin conexión THE SYSTEM SHALL permitir navegar,
   consultar parcelas, ver alertas cacheadas y dar de alta nuevas parcelas.
3. WHEN el dispositivo recupera conexión THE SYSTEM SHALL sincronizar las
   operaciones encoladas mediante Background Sync.
4. THE SYSTEM SHALL usar la Network Information API para decidir el motor de IA
   y para evitar transferencias pesadas en conexiones lentas o medidas.
5. THE SYSTEM SHALL mostrar de forma persistente el estado de conectividad y de
   sincronización pendiente.
6. THE SYSTEM SHALL obtener un puntaje Lighthouse PWA de 90 o superior.

---

## REQ-7: Compartir alertas

**Historia:** Como productor, quiero reenviarle la alerta a mi vecino o a mi
grupo, porque la helada nos afecta a todos.

### Criterios de aceptación

1. WHEN el usuario toca compartir THE SYSTEM SHALL usar la Web Share API con un
   texto que incluya la alerta, la acción recomendada y la fecha.
2. IF la Web Share API no está disponible THEN THE SYSTEM SHALL copiar el texto
   al portapapeles y confirmarlo visualmente.
3. THE SYSTEM SHALL excluir del texto compartido las coordenadas exactas de la parcela.

---

## Requisitos no funcionales

1. THE SYSTEM SHALL alcanzar first contentful paint en menos de 2 segundos en
   una conexión 3G simulada.
2. THE SYSTEM SHALL mantener cobertura de tests de al menos 70% en la lógica
   de negocio de frontend y backend.
3. THE SYSTEM SHALL operar sin secretos embebidos en el bundle del cliente.
4. THE SYSTEM SHALL publicarse sobre HTTPS.
5. THE SYSTEM SHALL registrar logs estructurados en JSON con correlation id,
   sin incluir datos personales ni identificadores de recursos AWS.

---

## Fuera de alcance

Autenticación multiusuario, pagos, control de riego, aplicaciones nativas,
soporte de cultivos fuera de los tres definidos en el MVP.
