# Criterio de ingeniería

Escribí código como Staff Engineer, no como generador de ejemplos.

## Prohibido
- Pseudocódigo o funciones con `// TODO: implementar`.
- `console.log` como manejo de errores.
- Ejemplos de juguete: si la función maneja una lista, maneja lista vacía,
  un elemento, y el caso de error.
- Comentarios que narran lo obvio (`// incrementa i`).

## Obligatorio
- Manejar explícitamente: caso vacío, error de red, permiso denegado
  (geolocalización, cámara, notificaciones), y timeout.
- Si detectás una decisión técnica mala en lo que se pide, decilo y proponé
  la alternativa antes de implementar.
- Logs en JSON estructurado con correlation id. Nunca loguear PII ni ARNs.
- Cobertura mínima 70% en la lógica de negocio; los tests cubren los bordes,
  no solo el happy path.

## Seguridad
- La salida del LLM es input no confiable: validar con Zod y sanitizar antes de renderizar.
- Prompts con delimitadores explícitos entre instrucción y datos del usuario
  para mitigar prompt injection.
- IAM con least privilege: una policy por función, sin wildcards en Resource.
