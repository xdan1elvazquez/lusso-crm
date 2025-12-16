import { IPAS_NV_CONFIG } from "@/utils/ipasNervousVisualConfig";
import { PE_REGIONS_CONFIG } from "@/utils/physicalExamRegionsConfig";
import { PE_NEURO_CONFIG } from "@/utils/physicalExamNeuroConfig";
import { OPHTHALMO_CONFIG } from "@/utils/ophthalmologyConfig";
import { getPhysicalExamDefaults } from "@/utils/physicalExamConfig";

/**
 * Genera el texto plano del resumen clínico basado en el formulario.
 * Lógica extraída de ConsultationDetailPage para reducir complejidad.
 * @param {object} form - El estado completo del formulario de consulta
 * @returns {string} Texto formateado con saltos de línea
 */
export function generateClinicalSummaryText(form) {
    if (!form) return "";

    let summaryLines = [];
    
    // 1. IPAS
    summaryLines.push("INTERROGATORIO POR APARATOS Y SISTEMAS:");
    const nv = form.systemsReview?.nervousVisual || {};
    Object.values(IPAS_NV_CONFIG).forEach(block => {
        const symptoms = nv[block.id] || {};
        const actives = Object.entries(symptoms).filter(([_, val]) => val.present);
        if (actives.length > 0) {
            const details = actives.map(([k, val]) => {
                const symConfig = block.symptoms.find(s => s.id === k);
                const label = symConfig?.label || k;
                return `${label} (${val.intensity || ''})`;
            });
            summaryLines.push(`${block.title}: ${details.join("; ")}.`);
        }
    });
    
    summaryLines.push(""); 

    // 2. Exploración Física General
    summaryLines.push("EXPLORACIÓN FÍSICA GENERAL:");
    const pe = form.physicalExam?.general || getPhysicalExamDefaults();
    let vitals = [];
    if(pe.vitals?.ta) vitals.push(`TA: ${pe.vitals.ta}`);
    if(pe.vitals?.fc) vitals.push(`FC: ${pe.vitals.fc}`);
    if(pe.anthro?.imc) vitals.push(`IMC: ${pe.anthro.imc}`);
    if(vitals.length) summaryLines.push(`Signos Vitales: ${vitals.join(", ")}.`);
    
    const h = pe.habitus || {};
    summaryLines.push(`Inspección General: Facies ${h.facies}, apariencia ${h.apariencia}.`);
    
    // 3. Regional
    const pr = form.physicalExam?.regional || {};
    Object.keys(PE_REGIONS_CONFIG).forEach(key => {
        const config = PE_REGIONS_CONFIG[key];
        const data = pr[key] || {};
        if (data.notas) summaryLines.push(`${config.title}: ${data.notas}`);
    });
    
    // 4. Neuro
    const neuro = form.physicalExam?.neuro || {};
    let neuroText = [];
    Object.keys(PE_NEURO_CONFIG).forEach(key => {
        const config = PE_NEURO_CONFIG[key];
        const data = neuro[key] || {};
        if (data.notas) neuroText.push(`${config.title}: ${data.notas}`);
    });
    if (neuroText.length) summaryLines.push("Neuro: " + neuroText.join("; "));
    
    summaryLines.push("");

    // 5. Oftalmología
    summaryLines.push("EXPLORACIÓN OFTALMOLÓGICA DETALLADA:");
    const oph = form.ophthalmologyExam || {};
    Object.keys(OPHTHALMO_CONFIG).forEach(key => {
        const config = OPHTHALMO_CONFIG[key];
        const data = oph[key];
        if (data && !data.isNormal) {
            const od = Object.entries(data.od || {}).filter(([_,v])=>v).map(([k,v])=>`${k}: ${v}`).join(", ");
            const os = Object.entries(data.os || {}).filter(([_,v])=>v).map(([k,v])=>`${k}: ${v}`).join(", ");
            if(od || os) summaryLines.push(`${config.title}: [OD] ${od || "Sin datos"} | [OI] ${os || "Sin datos"}`);
        }
    });
    
    summaryLines.push("");

    // 6. Diagnóstico y Plan
    summaryLines.push(`DIAGNÓSTICO: ${form.diagnosis || "Pendiente"}`);
    if (form.diagnoses?.length) summaryLines.push(`CIE-11: ${form.diagnoses.map(d=>d.name).join(", ")}`);
    
    summaryLines.push(`PLAN: ${form.treatment || "Pendiente"}`);
    if (form.prescribedMeds?.length) summaryLines.push(`Medicamentos: ${form.prescribedMeds.map(m=>m.productName).join(", ")}`);
    
    summaryLines.push(`PRONÓSTICO: ${form.prognosis || "Reservado"}`);
    
    return summaryLines.join("\n");
}