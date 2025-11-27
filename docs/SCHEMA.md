# Schema

Estado actual y plan inmediato (MVP 1.6: Rx estructurado + EyeExam).

## Enums
- `workOrderStatus`: `TO_PREPARE`, `SENT_TO_LAB`, `READY`, `DELIVERED`, `CANCELLED`
- `saleItemKind`: `LENSES`, `CONTACT_LENS`, `MEDICATION`, `ACCESSORY`, `CONSULTATION`, `OTHER`
- `workOrderType` (usa kind reducido): `LENTES`, `LC`, `ACCESORIO`, `OTRO`
- `saleStatus` derivado: `PENDING`, `PAID`

## Entidades actuales

### Patient
- `id` (string, uuid) **req**
- `firstName`, `lastName` (string) **req**
- `phone`, `email` (string)
- `createdAt` (ISO string)

### Consultation
- `id` (string, uuid) **req**
- `patientId` (string, uuid) **req**
- `type` (string: `REFRACTIVE` | `OPHTHALMO`) **req**
- `visitDate` (ISO date string) fallback a `createdAt`
- `createdAt` (ISO string) **req**
- `reason`, `diagnosis`, `notes` (string)

### Anamnesis (versionable)
- `id` (string, uuid) **req**
- `patientId` (string, uuid) **req**
- `createdAt` (ISO string) **req**
- `diabetes`, `hypertension`, `asthma` (boolean)
- `allergies`, `currentMeds`, `surgeries`, `ocularHistory`, `notes` (string)

### Sale
- `id` (string, uuid) **req**
- `patientId` (string, uuid) **req**
- `consultationId` (string, uuid | null)
- `kind` (string; fallback al primer item.kind)
- `items` (array\<SaleItem>) **req, >=1**
- `total` (number) **req** (suma de items o valor guardado)
- `payments` (array\<Payment>)
- `createdAt` (ISO string) **req**
- Derivados (no guardados): `paidAmount`, `balance`, `status` (PENDING/PAID)

### SaleItem
- `id` (string, uuid) **req**
- `kind` (saleItemKind) **req**
- `description` (string)
- `qty` (number) **req**
- `unitPrice` (number) **req**
- `requiresLab` (boolean, true para LENSES/CONTACT_LENS) **req**
- `consultationId` (string, uuid | null)
- `rxSnapshot` (string | json serializado)
- `labName` (string)
- `dueDate` (ISO date string | null)
- `inventoryItemId` (string | null) [planeado]

### Payment
- `id` (string, uuid) **req**
- `amount` (number) **req**
- `method` (string) **req**
- `paidAt` (ISO string) **req**

### WorkOrder
- `id` (string, uuid) **req**
- `patientId` (string, uuid) **req**
- `saleId` (string, uuid | null)
- `saleItemId` (string, uuid | null)
- `type` (workOrderType) **req** (`LENTES`, `LC`, `ACCESORIO`, `OTRO`)
- `labName` (string)
- `rxNotes` (string)
- `status` (`workOrderStatus`) **req**
- `createdAt` (ISO string) **req**
- `updatedAt` (ISO string) **req**
- `dueDate` (ISO date string | null)
- `timeline` (array) [planeado]

## Entidades planeadas (MVP 1.6)

### EyeExam (refraction exam)
- `id` (string, uuid) **req**
- `patientId` (string, uuid) **req**
- `consultationId` (string, uuid | null)
- `examDate` (ISO date string) **req**
- `sphere`, `cylinder`, `axis`, `add`, `va`, `pd` por ojo (estructura a definir)
- `notes` (string)
- `createdAt` (ISO string)

### Relaciones y reglas
- `patientId` presente en Consultation, Anamnesis, Sale, WorkOrder, EyeExam.
- `consultationId` opcional en Sale/SaleItem y EyeExam.
- `saleId` + `saleItemId` referencian WorkOrders auto-creados desde ventas de laboratorio.
- `id` siempre string (uuid); fechas en ISO string.
- WorkOrders se crean automáticamente por `SaleItem.requiresLab` y workflow avanza vía `nextStatus`.
