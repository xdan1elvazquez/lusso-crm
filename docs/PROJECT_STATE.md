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
  - `createAnamnesis(payload)`
  - `deleteAnamnesis(id)`
- `src/services/workOrdersStorage.js`
  - `getAllWorkOrders()`
  - `getWorkOrdersByPatientId(patientId)`
  - `createWorkOrder(payload)`
  - `updateWorkOrder(id, patch)`
  - `deleteWorkOrder(id)`
  - `nextStatus(current)`
- `src/services/salesStorage.js`
  - `getAllSales()`
  - `getSalesByPatientId(patientId)`
  - `getSaleById(id)`
  - `createSale(payload)` → auto-crea work orders para items con `requiresLab`
  - `addPaymentToSale(saleId, payment)`
  - `deleteSale(id)`
- `src/services/consultationsStorage.js`
  - `getAllConsultations()`
  - `getConsultationById(id)`
  - `getConsultationsByPatient(patientId)`
  - `createConsultation(data)`
  - `updateConsultation(id, patch)`
  - `deleteConsultation(id)`

## Estado actual del MVP
- Dashboard: métricas de pacientes, consultas, ventas pendientes y work orders.
- Pacientes: listado, detalle y edición básica.
- Consultas: creación, listado por paciente, eliminación, página de detalle/edición; `visitDate` + fallback.
- Anamnesis: versionable por paciente, alta y listado histórico.
- Ventas: items con `kind`, abonos, saldo/estado; UI condicional; items de laboratorio generan work orders automáticamente.
- Work Orders: flujo `TO_PREPARE/SENT_TO_LAB/READY/DELIVERED/CANCELLED`, vínculo a venta/item, filtros globales.

## Resumen MVPs completados
- MVP 1.1 (Consultas): `visitDate`, detalle, orden/uso seguro en dashboard, imports alineados.
- MVP 1.2 (Anamnesis): storage versionable, panel de alta/listado integrado en detalle de paciente.
- MVP 1.3 (Ventas): pagos/abonos, saldo y estado; panel de ventas y métricas en dashboard.
- MVP 1.4 (Work Orders): storage + panel global/paciente, flujo de status, ruta `/work-orders`.
- MVP 1.5 (Venta inteligente): ventas con items/kind, UI condicional; work orders auto-generados para items de laboratorio (`saleItemId`).

## Próximos pasos (backlog corto)
- MVP 1.6: Rx estructurado + entidad EyeExam (plan de esquema y captura).
- Validar inputs (campos requeridos, normalización) antes de guardar.
- Agregar filtros/búsqueda de consultas, anamnesis, ventas, work orders y pacientes.
- Persistencia remota o sync (API/backend) en lugar de solo localStorage.
- Mejorar manejo de errores/estados de carga en páginas (spinners, toasts).
- Tests básicos de storages y componentes clave.

## Changelog
- [2025-11-27] MVP 1.5:
  - Ventas soportan items con `kind`/`requiresLab`; items LENSES/CONTACT_LENS crean Work Orders automáticamente.
  - `SalesPanel` muestra campos condicionales (lab, entrega, notas/Rx, consulta opcional) según tipo.
  - Work Orders almacenan `saleItemId`; panel global muestra referencia a venta/item y permite avanzar status.
  - Archivos clave: `src/services/salesStorage.js`, `src/services/workOrdersStorage.js`, `src/components/SalesPanel.jsx`, `src/components/WorkOrdersPanel.jsx`, `src/pages/WorkOrdersPage.jsx`, `src/pages/PatientDetailPage.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.4:
  - Storage de work orders con flujo de status y fecha estimada.
  - Ruta global `/work-orders` con filtros por estado y búsqueda por paciente/lab.
  - Panel en detalle de paciente para crear trabajos ligados a ventas y avanzar status.
  - Archivos clave: `src/services/workOrdersStorage.js`, `src/components/WorkOrdersPanel.jsx`, `src/pages/WorkOrdersPage.jsx`, `src/pages/PatientDetailPage.jsx`, `src/pages/DashboardPage.jsx`, `src/router.jsx`, `src/layouts/AppLayout.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.3:
  - Storage de ventas con pagos/abonos y cálculo de saldo/estado.
  - `SalesPanel` para crear ventas, anticipos y abonos posteriores; métricas en dashboard.
  - Archivos clave: `src/services/salesStorage.js`, `src/components/SalesPanel.jsx`, `src/pages/PatientDetailPage.jsx`, `src/pages/DashboardPage.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.2:
  - Storage de anamnesis versionable por paciente.
  - Panel de anamnesis integrado en detalle de paciente.
  - Archivos clave: `src/services/anamnesisStorage.js`, `src/components/AnamnesisPanel.jsx`, `src/pages/PatientDetailPage.jsx`, `docs/PROJECT_STATE.md`.
- [2025-11-27] MVP 1.1:
  - Consultas con `visitDate`, detalle/edición y orden seguro en dashboard.
  - Archivos clave: `src/services/consultationsStorage.js`, `src/components/ConsultationsPanel.jsx`, `src/pages/ConsultationDetailPage.jsx`, `src/router.jsx`, `src/pages/DashboardPage.jsx`.
