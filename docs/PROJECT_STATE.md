# Project State

## Stack actual
- React + React Router (SPA)
- Persistencia en localStorage vía `patientsStorage`, `consultationsStorage`, `anamnesisStorage`, `salesStorage` y `workOrdersStorage`
- Auth demo con `RequireAuth` en el router (sin backend real)

## Rutas actuales
- `/login`
- `/dashboard`
- `/patients`
- `/patients/:id`
- `/patients/:patientId/consultations/:consultationId`
- `/work-orders`
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
- `src/services/workOrdersStorage.js`
  - `getAllWorkOrders()`
  - `getWorkOrdersByPatientId(patientId)`
  - `createWorkOrder(payload)` → requiere `patientId`, crea `{ id, patientId, saleId, saleItemId, type, labName, rxNotes, status, createdAt, updatedAt, dueDate? }`
  - `updateWorkOrder(id, patch)` → actualiza campos y `status`, refresca `updatedAt`
  - `deleteWorkOrder(id)`
  - `nextStatus(current)` → workflow `TO_PREPARE -> SENT_TO_LAB -> READY -> DELIVERED`
- `src/services/salesStorage.js`
  - `getAllSales()`
  - `getSalesByPatientId(patientId)`
  - `getSaleById(id)`
  - `createSale(payload)` → requiere `patientId`, crea `{ id, patientId, consultationId?, kind, items[], total, payments[], createdAt }`; auto-crea work orders para items con `requiresLab`
  - `addPaymentToSale(saleId, payment)` → agrega abono con `{ id, amount, method, paidAt }`, clampa saldo restante
  - `deleteSale(id)`
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
- Ventas: ventas por paciente con items y tipo; total, abonos, saldo y estado (pendiente/pagado); listado y abonos adicionales en `SalesPanel`. Ventas con items que requieren laboratorio generan Work Orders automáticamente.
- Work Orders: trabajos por paciente con vínculo a venta/item, status en flujo (`TO_PREPARE`, `SENT_TO_LAB`, `READY`, `DELIVERED`, `CANCELLED`), fechas estimadas y notas Rx. Listado global con filtros y búsqueda.
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

## Archivos tocados en MVP 1.3
- `src/services/salesStorage.js`
- `src/components/SalesPanel.jsx`
- `src/pages/PatientDetailPage.jsx`
- `src/pages/DashboardPage.jsx`
- `docs/PROJECT_STATE.md`

## Archivos tocados en MVP 1.4
- `src/services/workOrdersStorage.js`
- `src/components/WorkOrdersPanel.jsx`
- `src/pages/WorkOrdersPage.jsx`
- `src/pages/PatientDetailPage.jsx`
- `src/pages/DashboardPage.jsx`
- `src/router.jsx`
- `src/layouts/AppLayout.jsx`
- `docs/PROJECT_STATE.md`

## Archivos tocados en MVP 1.5
- `src/services/salesStorage.js`
- `src/services/workOrdersStorage.js`
- `src/components/SalesPanel.jsx`
- `src/components/WorkOrdersPanel.jsx`
- `src/pages/WorkOrdersPage.jsx`
- `src/pages/PatientDetailPage.jsx`
- `docs/PROJECT_STATE.md`

## Próximos pasos (backlog corto)
- Validar inputs (campos requeridos, normalización) antes de guardar.
- Agregar filtros/búsqueda de consultas, anamnesis, ventas, work orders y pacientes.
- Persistencia remota o sync (API/backend) en lugar de solo localStorage.
- Mejorar manejo de errores/estados de carga en páginas (spinners, toasts).
- Tests básicos de storages y componentes clave.

## Changelog
- [2025-11-27] MVP 1.5:
  - Ventas ahora soportan items con `kind` y `requiresLab`; si el item es de LENSES/CONTACT_LENS se crea automáticamente un Work Order ligado al item.
  - `SalesPanel` muestra campos condicionales (lab, entrega, notas/Rx, consulta opcional) según el tipo.
  - Work Orders almacenan `saleItemId`; panel global muestra referencia a venta/item y permite avanzar status.
  - Data contracts actualizados para sales con items y work orders auto-generados.
  - Archivos clave: `src/services/salesStorage.js`, `src/services/workOrdersStorage.js`, `src/components/SalesPanel.jsx`, `src/components/WorkOrdersPanel.jsx`, `src/pages/WorkOrdersPage.jsx`, `src/pages/PatientDetailPage.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.4:
  - Añadido storage de work orders con flujo de status y fecha estimada.
  - Nueva página global `/work-orders` con filtros por estado y búsqueda por paciente/lab.
  - `WorkOrdersPanel` en `PatientDetailPage` para crear trabajos ligados a ventas y avanzar status.
  - Dashboard incluye contadores por estado de work orders.
  - Archivos clave: `src/services/workOrdersStorage.js`, `src/components/WorkOrdersPanel.jsx`, `src/pages/WorkOrdersPage.jsx`, `src/pages/PatientDetailPage.jsx`, `src/pages/DashboardPage.jsx`, `src/router.jsx`, `src/layouts/AppLayout.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.3:
  - Añadido storage de ventas con pagos/abonos y cálculo de saldo/estado.
  - Nuevo `SalesPanel` para crear ventas, aplicar anticipos y agregar abonos posteriores por paciente.
  - `PatientDetailPage` integra sección de Ventas junto a Consultas y Anamnesis.
  - Dashboard muestra métricas de ventas pendientes (conteo y saldo) y lista las últimas pendientes.
  - Archivos clave: `src/services/salesStorage.js`, `src/components/SalesPanel.jsx`, `src/pages/PatientDetailPage.jsx`, `src/pages/DashboardPage.jsx`, `docs/PROJECT_STATE.md`.
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
