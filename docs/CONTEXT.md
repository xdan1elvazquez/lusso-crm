# CONTEXTO DEL PROYECTO: CRM + ERP Óptico & Oftalmológico

## 1. Perfil del Proyecto
Estás actuando como el Desarrollador Principal (Senior Frontend Engineer) de un sistema web para una clínica oftalmológica.
- **Stack Tecnológico:** React + React Router (SPA).
- **Persistencia Actual:** `localStorage` simulando una API (Services Pattern).
- **Estado Actual:** MVP 1.5 Completado (Ventas con Items, Work Orders automáticas).
- **Objetivo Inmediato:** MVP 1.6 (Implementación de Examen de la Vista "EyeExam" y estructura "Rx").

## 2. Reglas de Negocio (Dominio Oftalmológico)
La precisión clínica es vital. Usa estas convenciones:
- **Ojos:** OD (Oculus Dexter/Derecho), OI/OS (Oculus Sinister/Izquierdo).
- **Cilindro:** Manejar signo negativo por convención preferente, o permitir ambos.
- **Ejes:** 0 a 180 grados.
- **Adición:** Siempre positiva (para presbicia).
- **Agudeza Visual (VA):** Formato decimal (0.5, 1.0) o fracción (20/20, 20/40).
- **DP:** Distancia Pupilar (puede ser monocular o total).

## 3. Arquitectura de Datos (Typescript Interfaces)

### Estructura Rx (Receta) - CRÍTICO PARA MVP 1.6
```typescript
interface EyeRefraction {
  sph: number;      // Esfera (Dioptrías, pasos de 0.25)
  cyl: number;      // Cilindro
  axis: number;     // Eje (0-180)
  add?: number;     // Adición (Reading add)
  va?: string;      // Agudeza Visual (ej. "20/20")
}

interface Rx {
  od: EyeRefraction;
  oi: EyeRefraction; // Usamos OI o OS según preferencia, estandarizar a OI para español
  pd: {
    distance: number; // Lejos
    near?: number;    // Cerca
  };
  notes?: string;
}

interface EyeExam {
  id: string;
  patientId: string;
  consultationId?: string; // Opcional, link a la consulta médica
  examDate: string;        // ISO Date
  rx: Rx;
  subjectiveNotes?: string;
  createdAt: string;
}