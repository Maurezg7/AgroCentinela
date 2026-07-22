# Organización del código

## Monorepo (npm workspaces)
packages/frontend · packages/backend · packages/shared

## Frontend
src/components  — presentacional, sin fetch ni lógica de negocio
src/features    — un directorio por dominio (parcelas, alertas, diagnostico)
src/hooks       — lógica reutilizable (useGeolocation, useNetworkStatus, useIndexedDB)
src/services    — acceso a red y a IndexedDB, aislado del resto
src/lib         — utilidades puras

## Backend
Un directorio por módulo NestJS: controller, service, dto/, *.spec.ts.
El controller no tiene lógica: valida y delega al service.
El service no conoce HTTP.

## Convenciones
- Archivos: kebab-case. Componentes React: PascalCase.
- Un export principal por archivo.
- Imports relativos dentro del paquete, alias `@agrocentinela/shared` entre paquetes.
- Sin barrel files (`index.ts` que reexporta todo): rompen el tree-shaking.
