// src/utils/cie10Catalog.js

export const CIE10_OFTALMO = [
  // --- H00-H06 PÁRPADOS ---
  { code: "H00.0", name: "Orzuelo y otras inflamaciones profundas del párpado" },
  { code: "H00.1", name: "Chalazión" },
  { code: "H01.0", name: "Blefaritis" },
  { code: "H02.0", name: "Entropión y triquiasis palpebral" },
  { code: "H02.1", name: "Ectropión del párpado" },
  { code: "H02.4", name: "Ptosis del párpado" },
  
  // --- H10-H13 CONJUNTIVA ---
  { code: "H10.0", name: "Conjuntivitis mucopurulenta" },
  { code: "H10.1", name: "Conjuntivitis atópica aguda" },
  { code: "H10.3", name: "Conjuntivitis aguda, no especificada" },
  { code: "H10.4", name: "Conjuntivitis crónica" },
  { code: "H11.0", name: "Pterigión" },
  { code: "H11.3", name: "Hemorragia conjuntival" },
  { code: "H11.1", name: "Degeneraciones y depósitos conjuntivales (Pinguecula)" },

  // --- H15-H22 ESCLERÓTICA Y CÓRNEA ---
  { code: "H16.0", name: "Úlcera de la córnea" },
  { code: "H16.1", name: "Queratitis superficial (fotofobia)" },
  { code: "H18.1", name: "Queratopatía bullosa" },
  { code: "H18.4", name: "Degeneración de la córnea" },
  { code: "H18.6", name: "Queratocono" },

  // --- H25-H28 CRISTALINO ---
  { code: "H25.0", name: "Catarata senil incipiente" },
  { code: "H25.1", name: "Catarata senil nuclear" },
  { code: "H25.8", name: "Otras cataratas seniles" },
  { code: "H26.1", name: "Catarata traumática" },
  { code: "H26.4", name: "Catarata secundaria (secuela)" },

  // --- H30-H36 COROIDES Y RETINA ---
  { code: "H33.0", name: "Desprendimiento de la retina con ruptura" },
  { code: "H33.2", name: "Desprendimiento seroso de la retina" },
  { code: "H34.8", name: "Otras oclusiones vasculares de la retina" },
  { code: "H35.0", name: "Retinopatías del fondo y cambios vasculares (Hipertensiva)" },
  { code: "H35.3", name: "Degeneración de la mácula y del polo posterior" },
  { code: "H36.0", name: "Retinopatía diabética" },

  // --- H40-H42 GLAUCOMA ---
  { code: "H40.0", name: "Sospecha de glaucoma" },
  { code: "H40.1", name: "Glaucoma primario de ángulo abierto" },
  { code: "H40.2", name: "Glaucoma primario de ángulo cerrado" },
  { code: "H40.5", name: "Glaucoma secundario a otros trastornos del ojo" },

  // --- H49-H52 ESTRABISMO Y REFRACCIÓN ---
  { code: "H50.0", name: "Estrabismo concomitante convergente (Endotropía)" },
  { code: "H50.1", name: "Estrabismo concomitante divergente (Exotropía)" },
  { code: "H52.0", name: "Hipermetropía" },
  { code: "H52.1", name: "Miopía" },
  { code: "H52.2", name: "Astigmatismo" },
  { code: "H52.4", name: "Presbicia" },
  { code: "H52.5", name: "Trastornos de la acomodación" },
  { code: "H53.0", name: "Ambliopía ex anopsia" },

  // --- OTROS COMUNES ---
  { code: "E11.9", name: "Diabetes mellitus tipo 2 sin complicaciones" },
  { code: "E11.3", name: "Diabetes mellitus tipo 2 con complicaciones oftálmicas" },
  { code: "I10",   name: "Hipertensión esencial (primaria)" },
  { code: "H57.1", name: "Dolor ocular" },
  { code: "H53.1", name: "Alteraciones visuales subjetivas (Fatiga visual)" },
  { code: "Z01.0", name: "Examen de ojos y de la visión (Consulta general)" }
];

export function searchDiagnosis(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return CIE10_OFTALMO.filter(d => 
    d.code.toLowerCase().includes(q) || 
    d.name.toLowerCase().includes(q)
  ).slice(0, 10);
}