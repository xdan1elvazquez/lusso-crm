# Project State

## Stack actual
- React + React Router (SPA)
- Persistencia en localStorage vía `patientsStorage`, `consultationsStorage` y `anamnesisStorage`
- Auth demo con `RequireAuth` en el router (sin backend real)

## Rutas actuales
- `/login`
- `/dashboard`
- `/patients`
- `/patients/:id`
- `/patients/:patientId/consultations/:consultationId`
- `/unauthorized` (placeholder)
- comodín `*` → NotFound

## Data contracts (exports usados por la UI)
- `src/services/patientsStorage.js`
  - `seedPatientsIfEmpty()`
  - `getPatients()`
  - `getPatientById(id)`
  - `createPatient(data)`
  - `updatePatient(id, data)`
  - `deletePatient(id)`
- `src/services/anamnesisStorage.js`
  - `getAllAnamnesis()`
  - `getAnamnesisByPatientId(patientId)`
  - `createAnamnesis(payload)` → requiere `patientId`, crea `{ id, patientId, createdAt, diabetes, hypertension, asthma, allergies, currentMeds, surgeries, ocularHistory, notes }`
  - `deleteAnamnesis(id)`
- `src/services/consultationsStorage.js`
  - `getAllConsultations()`
  - `getConsultationById(id)`
  - `getConsultationsByPatient(patientId)`
  - `createConsultation(data)` → crea `{ id, createdAt, visitDate, patientId, type, reason, diagnosis, notes }`, `visitDate` cae a ISO a partir de `YYYY-MM-DD` o `createdAt`
  - `updateConsultation(id, patch)` → mantiene `visitDate`/`createdAt` con fallback seguro
  - `deleteConsultation(id)`

## Estado actual del MVP
- Dashboard muestra métricas y últimas consultas (usa `visitDate || createdAt`).
- Pacientes: listado, detalle y edición básica (`PatientDetailPage`).
- Consultas: creación desde `ConsultationsPanel`, listado por paciente, eliminación, nueva página de detalle/edición con navegación desde cada ítem.
- Anamnesis: secciones por paciente con formulario de alta y listado histórico (creación y eliminación).
- Rutas protegidas por auth demo; layout aplicado en zona protegida.

## Qué se agregó/cambió en MVP 1.1 (actual)
- Campo `visitDate` en consultas con normalización y fallback a `createdAt`.
- Nuevas funciones de storage: `getConsultationById`, `updateConsultation` ampliado, `createConsultation` soporta `visitDate`.
- `ConsultationsPanel`: input de fecha, muestra fecha en listado, Link a detalle de consulta.
- Nueva página `ConsultationDetailPage` con edición y manejo de “Consulta no encontrada”.
- Ruta nueva `patients/:patientId/consultations/:consultationId` en el router protegido.
- Dashboard ordena/muestra usando `visitDate` si existe; tolera datos faltantes.

## Archivos tocados en MVP 1.1
- `src/services/consultationsStorage.js`
- `src/components/ConsultationsPanel.jsx`
- `src/pages/ConsultationDetailPage.jsx`
- `src/router.jsx`
- `src/pages/DashboardPage.jsx`

## Archivos tocados en MVP 1.2
- `src/services/anamnesisStorage.js`
- `src/components/AnamnesisPanel.jsx`
- `src/pages/PatientDetailPage.jsx`
- `docs/PROJECT_STATE.md`

## Próximos pasos (backlog corto)
- Validar inputs (campos requeridos, normalización) antes de guardar.
- Agregar filtros/búsqueda de consultas, anamnesis y pacientes.
- Persistencia remota o sync (API/backend) en lugar de solo localStorage.
- Mejorar manejo de errores/estados de carga en páginas (spinners, toasts).
- Tests básicos de storages y componentes clave.

## Changelog
- [2025-11-27] MVP 1.2:
  - Añadido storage de anamnesis versionable por paciente.
  - Nuevo `AnamnesisPanel` con alta y listado histórico (DM/HTA/Asma + textos) y eliminación.
  - `PatientDetailPage` integra sección de Anamnesis junto a Consultas.
  - Data contracts actualizados para incluir `anamnesisStorage`.
  - Archivos clave: `src/services/anamnesisStorage.js`, `src/components/AnamnesisPanel.jsx`, `src/pages/PatientDetailPage.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.1:
  - Añadido soporte `visitDate` con fallback a `createdAt`.
  - Storage de consultas: `getConsultationById`, `updateConsultation` ampliado, `createConsultation` acepta `visitDate`.
  - `ConsultationsPanel` ahora captura fecha, muestra fecha y enlaza a detalle.
  - Nueva `ConsultationDetailPage` para ver/editar y validar existencia.
  - Nueva ruta `patients/:patientId/consultations/:consultationId`.
  - Dashboard usa `visitDate || createdAt` y evita fallos con datos vacíos.
  - Limpieza de import/exports alineada con la UI.
  - Archivos clave: `src/services/consultationsStorage.js`, `src/components/ConsultationsPanel.jsx`, `src/pages/ConsultationDetailPage.jsx`, `src/router.jsx`, `src/pages/DashboardPage.jsx`.
