import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; 
import { useAuth } from "@/context/AuthContext"; 
// import { usePatients } from "@/hooks/usePatients"; // 👈 YA NO SE USA
import { validatePatient } from "@/utils/validators";
import { getReferralSources, updateReferralSources } from "@/services/settingsStorage";
import { 
    requestDeletePatient, 
    rejectDeleteRequest, 
    confirmDeletePatient,
    findPotentialDuplicates,
    getPatientsPage, // 👈 Nuevo: Paginación
    searchPatients,  // 👈 Nuevo: Búsqueda server-side
    createPatient,   // 👈 Importamos directo la creación
    getPatients      // 👈 Para cargar directorio completo SOLO si se necesita (referidos)
} from "@/services/patientsStorage"; 
import { handlePhoneInput } from "@/utils/inputHandlers";
import LoadingState from "@/components/LoadingState";

// UI Components
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select"; 
import ModalWrapper from "@/components/ui/ModalWrapper"; 
import Badge from "@/components/ui/Badge";
import { UserPlus, Search, Edit2, Trash2, AlertTriangle, CheckCircle, XCircle, Users, ExternalLink, UserCheck, ArrowDown } from "lucide-react";

// Helper para calcular edad
function getPatientAge(dateString) {
  if (!dateString) return null;
  const target = dateString.includes("T") ? new Date(dateString) : new Date(dateString + "T12:00:00");
  const now = new Date();
  if (isNaN(target.getTime())) return null;
  let age = now.getFullYear() - target.getFullYear();
  const m = now.getMonth() - target.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < target.getDate())) age--;
  return age;
}

export default function PatientsPage() {
  const { role, user } = useAuth(); 
  const navigate = useNavigate(); 
  
  // --- ESTADOS DE LISTA (PAGINACIÓN) ---
  const [patientsList, setPatientsList] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [q, setQ] = useState("");
  const [searchMode, setSearchMode] = useState(false); // Indica si estamos en modo búsqueda

  // --- CONFIGURACIÓN ---
  const [sources, setSources] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // --- FORMULARIOS ---
  const [form, setForm] = useState({ 
    firstName: "", lastName: "", curp: "", phone: "", email: "", 
    dob: "", assignedSex: "NO_ESPECIFICADO", occupation: "",
    referralSource: "", referredBy: "" 
  });
  
  const [errors, setErrors] = useState({});
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [editingSources, setEditingSources] = useState([]);
  const [newSourceInput, setNewSourceInput] = useState("");

  // Referidos (Búsqueda para asignar padrino)
  const [allPatients, setAllPatients] = useState([]); 
  const [referrerSearch, setReferrerSearch] = useState("");
  const [showReferrerList, setShowReferrerList] = useState(false);
  // Nuevo estado para opciones de referido (optimizado para búsqueda server-side)
  const [referrerOptions, setReferrerOptions] = useState([]);

  // Modales
  const [deleteRequestModal, setDeleteRequestModal] = useState({ open: false, patientId: null, patientName: "" });
  const [deleteReason, setDeleteReason] = useState("");
  const [duplicateModal, setDuplicateModal] = useState({ open: false, matches: [] });
  const [pendingPayload, setPendingPayload] = useState(null); 

  // --- CARGA INICIAL ---
  useEffect(() => {
    async function loadConfig() {
        try {
            const srcs = await getReferralSources();
            setSources(Array.isArray(srcs) ? srcs : []);
            await loadFirstPage(); // Cargar primeros 20
        } catch (e) { console.error(e); setSources([]); } finally { setLoadingConfig(false); }
    }
    loadConfig();
  }, []);

  // 1. Cargar Primera Página
  const loadFirstPage = async () => {
      setLoadingList(true);
      setSearchMode(false);
      try {
          const res = await getPatientsPage(null, 20);
          setPatientsList(res.data);
          setLastDoc(res.lastVisible);
          setHasMore(res.hasMore);
      } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };

  // 2. Cargar Siguientes (Botón)
  const loadNextPage = async () => {
      if (!lastDoc || !hasMore) return;
      setLoadingMore(true);
      try {
          const res = await getPatientsPage(lastDoc, 20);
          setPatientsList(prev => [...prev, ...res.data]);
          setLastDoc(res.lastVisible);
          setHasMore(res.hasMore);
      } catch (e) { console.error(e); } finally { setLoadingMore(false); }
  };

  // 3. Efecto de Búsqueda (Debounce)
  useEffect(() => {
      const timer = setTimeout(async () => {
          if (q.trim().length > 1) {
              setSearchMode(true);
              setLoadingList(true);
              try {
                  const results = await searchPatients(q);
                  setPatientsList(results);
                  setHasMore(false); // No paginamos resultados de búsqueda por ahora
              } catch (e) { console.error(e); } finally { setLoadingList(false); }
          } else if (q.trim().length === 0 && searchMode) {
              // Si borra la búsqueda, restaurar lista normal
              loadFirstPage();
          }
      }, 600); // Esperar 600ms después de escribir

      return () => clearTimeout(timer);
  }, [q, searchMode]);

  // Buscador de Padrino (Referido) - Usa searchPatients
  const handleSearchReferrer = async (val) => {
      setReferrerSearch(val);
      if (val.length > 2) {
          const results = await searchPatients(val);
          setReferrerOptions(results.slice(0, 5));
          setShowReferrerList(true);
      }
  };

  // --- CREACIÓN ---
  const onSubmit = async (e) => {
    e.preventDefault();
    const validation = validatePatient(form);
    if (!validation.isValid) { setErrors(validation.errors); return; }
    setErrors({});
    
    const cleanPhone = form.phone.replace(/\s/g, ''); 
    const payload = { ...form, phone: cleanPhone, referralSource: form.referralSource || "Pasaba por aquí" };

    if (payload.referralSource === "Recomendación" && !payload.referredBy) {
        if(!confirm("Seleccionaste 'Recomendación' pero no indicaste quién lo recomendó. ¿Deseas continuar sin asignar los puntos?")) return;
    }

    try {
        const potentialDupes = await findPotentialDuplicates(payload);
        if (potentialDupes.length > 0) {
            setPendingPayload(payload); 
            setDuplicateModal({ open: true, matches: potentialDupes });
            return; 
        }
    } catch (error) { console.error(error); }

    await executeCreate(payload);
  };

  const executeCreate = async (payload) => {
      try {
          const newP = await createPatient(payload);
          if (newP) {
              setForm({ firstName: "", lastName: "", curp: "", phone: "", email: "", dob: "", assignedSex: "NO_ESPECIFICADO", occupation: "", referralSource: "", referredBy: "" });
              setReferrerSearch("");
              setDuplicateModal({ open: false, matches: [] }); 
              setPendingPayload(null);
              alert("✅ Paciente registrado correctamente.");
              // Insertamos visualmente al principio
              setPatientsList(prev => [newP, ...prev]);
          }
      } catch(e) { alert("Error: " + e.message); }
  };

  // --- ELIMINACIÓN ---
  const handleRequestDelete = (patient) => {
      setDeleteRequestModal({ open: true, patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}` });
      setDeleteReason("");
  };

  const submitDeleteRequest = async () => {
      if (!deleteReason.trim()) return alert("Debes escribir una razón.");
      try {
          await requestDeletePatient(deleteRequestModal.patientId, deleteReason, user.name || "Usuario");
          alert("Solicitud enviada al administrador.");
          setDeleteRequestModal({ open: false, patientId: null, patientName: "" });
          // Actualizar estado local
          setPatientsList(prev => prev.map(p => p.id === deleteRequestModal.patientId ? { ...p, deletionStatus: "REQUESTED" } : p));
      } catch (error) { alert("Error al solicitar: " + error.message); }
  };

  const handleAdminApprove = async (id) => {
      if(!confirm("¿CONFIRMAR ELIMINACIÓN DEFINTIVA?")) return;
      try {
          await confirmDeletePatient(id);
          setPatientsList(prev => prev.filter(p => p.id !== id));
      } catch (error) { alert(error.message); }
  };

  const handleAdminReject = async (id) => {
      try {
          await rejectDeleteRequest(id);
          setPatientsList(prev => prev.map(p => p.id === id ? { ...p, deletionStatus: "NONE" } : p));
      } catch (error) { alert(error.message); }
  };

  // --- FUENTES ---
  const openSourceEditor = () => { setEditingSources([...sources]); setNewSourceInput(""); setIsSourceModalOpen(true); };
  const handleAddSource = () => { const val = newSourceInput.trim(); if (!val || editingSources.some(s => s.toLowerCase() === val.toLowerCase())) return; setEditingSources([...editingSources, val]); setNewSourceInput(""); };
  const handleRemoveSource = (s) => { if (s === "Recomendación") return alert("No se puede eliminar."); setEditingSources(editingSources.filter(item => item !== s)); };
  const handleSaveSources = async () => { try { let final = [...editingSources]; if (!final.includes("Recomendación")) final = ["Recomendación", ...final]; await updateReferralSources(final); setSources(final); setIsSourceModalOpen(false); } catch (e) { alert("Error"); } };

  if (loadingConfig) return <LoadingState />;

  // Nombre del referido seleccionado (buscado en options o en la lista general si ya estaba cargado)
  const selectedReferrer = form.referredBy 
    ? referrerOptions.find(p => p.id === form.referredBy) || patientsList.find(p => p.id === form.referredBy) || allPatients.find(p => p.id === form.referredBy)
    : null;

  return (
    <div className="page-container space-y-6">
      
      {/* 1. SECCIÓN SUPERIOR: FORMULARIO */}
      <Card className="border-t-4 border-t-primary shadow-lg bg-gradient-to-r from-surface to-surfaceHighlight/30 overflow-visible">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <div className="p-2 bg-primary/20 rounded-full text-primary"><UserPlus size={20} /></div>
              <h2 className="font-bold text-white text-lg">Nuevo Ingreso</h2>
          </div>
          <form onSubmit={onSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-3"><Input label="Nombre(s)" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} error={errors.firstName} className="bg-background" /></div>
                  <div className="lg:col-span-3"><Input label="Apellidos" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} error={errors.lastName} className="bg-background" /></div>
                  <div className="lg:col-span-3"><Input label="Móvil (WhatsApp)" placeholder="55 1234 5678" value={form.phone} onChange={e => setForm({...form, phone: handlePhoneInput(e.target.value)})} maxLength={13} error={errors.phone} className="bg-background font-mono tracking-wide text-center border-blue-500/50" /></div>
                  <div className="lg:col-span-3"><Button type="submit" variant="primary" className="w-full h-[42px] shadow-lg shadow-blue-500/20 font-bold tracking-wide">REGISTRAR PACIENTE</Button></div>
                  
                  <div className="lg:col-span-2"><Input label="CURP" value={form.curp} onChange={e => setForm({...form, curp: e.target.value.toUpperCase()})} maxLength={18} className="bg-background text-xs" placeholder="Opcional" /></div>
                  <div className="lg:col-span-2"><Input label="Fecha Nac." type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="bg-background text-xs" /></div>
                  <div className="lg:col-span-2"><Select label="Sexo" value={form.assignedSex} onChange={e => setForm({...form, assignedSex: e.target.value})} className="bg-background text-xs"><option value="NO_ESPECIFICADO">--</option><option value="MUJER">Mujer</option><option value="HOMBRE">Hombre</option></Select></div>
                  
                  <div className="lg:col-span-2"><Input label="Ocupación" value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} className="bg-background text-xs" placeholder="Ej. Abogado" /></div>
                  <div className="lg:col-span-2"><Input label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="bg-background text-xs" placeholder="correo@..." /></div>
                  
                  <div className="lg:col-span-2 relative">
                      <Select 
                        label="¿Cómo se enteró?" 
                        value={form.referralSource} 
                        onChange={e => {
                            const val = e.target.value;
                            setForm({...form, referralSource: val, referredBy: val !== "Recomendación" ? "" : form.referredBy});
                        }} 
                        className="bg-background text-xs"
                      >
                          <option value="">-- Origen --</option>
                          {sources.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                      {role === 'ADMIN' && (<button type="button" onClick={openSourceEditor} className="absolute -top-1 right-0 text-[10px] font-bold text-primary hover:text-white hover:underline flex items-center gap-1 transition-colors"><Edit2 size={10} /> EDITAR</button>)}
                  </div>

                  {/* BUSCADOR DE PADRINO */}
                  {form.referralSource === "Recomendación" && (
                      <div className="col-span-full lg:col-span-6 lg:col-start-7 bg-surfaceHighlight/10 border border-dashed border-white/20 p-3 rounded-lg flex items-center gap-3 animate-fadeIn">
                          <label className="text-xs font-bold text-textMuted uppercase shrink-0">Padrino:</label>
                          <div className="flex-1 relative">
                              {form.referredBy ? (
                                  <div className="flex items-center justify-between bg-emerald-900/30 border border-emerald-500/50 rounded px-3 py-1.5 w-full">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                          <UserCheck size={14} className="text-emerald-400 shrink-0" />
                                          <span className="text-sm text-white truncate">{selectedReferrer ? `${selectedReferrer.firstName} ${selectedReferrer.lastName}` : "Seleccionado (ID)"}</span>
                                      </div>
                                      <button type="button" onClick={() => setForm({...form, referredBy: ""})} className="text-textMuted hover:text-white ml-2 text-lg">×</button>
                                  </div>
                              ) : (
                                  <>
                                      <Input 
                                        placeholder="Buscar quién lo recomendó..." 
                                        value={referrerSearch} 
                                        onChange={e => handleSearchReferrer(e.target.value)}
                                        onFocus={() => setShowReferrerList(true)}
                                        className="bg-background text-xs h-8"
                                      />
                                      {showReferrerList && referrerSearch.length > 2 && (
                                          <div className="absolute top-full left-0 right-0 bg-surface border border-border rounded-lg shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                                              {referrerOptions.length === 0 ? (
                                                  <div className="p-3 text-xs text-textMuted italic">Sin resultados.</div>
                                              ) : (
                                                  referrerOptions.map(p => (
                                                      <div 
                                                        key={p.id} 
                                                        className="p-2 hover:bg-surfaceHighlight cursor-pointer border-b border-white/5 last:border-0"
                                                        onClick={() => {
                                                            setForm({...form, referredBy: p.id});
                                                            setReferrerSearch("");
                                                            setShowReferrerList(false);
                                                        }}
                                                      >
                                                          <div className="text-xs font-bold text-white">{p.firstName} {p.lastName}</div>
                                                          <div className="text-[10px] text-textMuted">{p.phone}</div>
                                                      </div>
                                                  ))
                                              )}
                                          </div>
                                      )}
                                      {showReferrerList && <div className="fixed inset-0 z-40" onClick={() => setShowReferrerList(false)}></div>}
                                  </>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </form>
      </Card>

      {/* 2. DIRECTORIO PAGINADO */}
      <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-border pb-2 gap-4">
              <div>
                  <h1 className="text-2xl font-bold text-white">Directorio</h1>
                  <p className="text-textMuted text-xs uppercase tracking-wider">
                      {searchMode ? `Resultados: ${patientsList.length}` : "Mostrando recientes (Paginado)"}
                  </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto items-center">
                  <Button variant="ghost" onClick={loadFirstPage} title="Recargar Lista">🔄</Button>
                  <div className="relative w-full md:w-80"><Input placeholder="Buscar paciente (Servidor)..." value={q} onChange={e => setQ(e.target.value)} className="pl-9 py-1.5 text-sm border-blue-500/30 focus:border-blue-500 bg-surface rounded-full" /><Search className="absolute left-3 top-2.5 text-textMuted" size={16} /></div>
              </div>
          </div>

          {loadingList ? (
              <LoadingState />
          ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {patientsList.map(patient => {
                        const age = getPatientAge(patient.dob);
                        const isPendingDelete = patient.deletionStatus === "REQUESTED";
                        return (
                            <div key={patient.id} className={`relative group rounded-xl transition-all ${isPendingDelete ? "bg-red-900/10 border border-red-500/50" : "bg-transparent"}`}>
                                <Link to={`/patients/${patient.id}`} className="block h-full">
                                    <Card className={`hover:border-primary/50 transition-all duration-200 h-full relative overflow-hidden ${isPendingDelete ? "opacity-75" : ""}`} noPadding>
                                        <div className="p-4 flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0 shadow-inner">
                                                {patient.firstName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">{patient.firstName} {patient.lastName}</h3>
                                                    {age !== null && (<Badge color="blue" className="text-[9px] px-1.5 py-0.5 shrink-0 whitespace-nowrap">{age} Años</Badge>)}
                                                </div>
                                                <div className="text-xs text-textMuted font-mono mt-1 flex items-center gap-1">📱 {patient.phone}</div>
                                                
                                                {isPendingDelete ? (
                                                    <div className="mt-2 text-[10px] bg-red-500/20 text-red-200 px-2 py-1 rounded flex items-center gap-1 border border-red-500/30"><AlertTriangle size={10} /> Solicitud Eliminación</div>
                                                ) : (
                                                    <div className="flex justify-between items-center mt-2">
                                                        <Badge color={patient.lastVisit ? "green" : "gray"} className="text-[9px] py-0 px-1.5">{patient.lastVisit ? "Recurrente" : "Nuevo"}</Badge>
                                                        <span className="text-[9px] text-textMuted opacity-60">{new Date(patient.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                                <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isPendingDelete ? (
                                        role === 'ADMIN' ? (
                                            <>
                                                <button onClick={() => handleAdminApprove(patient.id)} className="bg-green-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"><CheckCircle size={14} /></button>
                                                <button onClick={() => handleAdminReject(patient.id)} className="bg-gray-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"><XCircle size={14} /></button>
                                            </>
                                        ) : (<span className="bg-black/50 text-white text-[9px] px-2 py-1 rounded backdrop-blur">Esperando Admin...</span>)
                                    ) : (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRequestDelete(patient); }} className="bg-surface border border-border text-textMuted hover:text-red-400 hover:border-red-400 p-1.5 rounded-lg shadow-lg transition-colors"><Trash2 size={14} /></button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* BOTÓN CARGAR MÁS (Solo si no estamos buscando y hay más) */}
                {!searchMode && hasMore && (
                    <div className="flex justify-center mt-8 pb-4">
                        <Button 
                            onClick={loadNextPage} 
                            disabled={loadingMore}
                            variant="secondary"
                            className="flex items-center gap-2 px-8"
                        >
                            {loadingMore ? "Cargando..." : <>Cargar Siguientes 20 <ArrowDown size={16} /></>}
                        </Button>
                    </div>
                )}

                {patientsList.length === 0 && !loadingList && (<div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-surface/50"><p className="text-textMuted italic">No se encontraron pacientes.</p></div>)}
              </>
          )}
      </div>

      {/* MODAL DUPLICADOS */}
      {duplicateModal.open && (
          <ModalWrapper title="⚠️ Posibles pacientes duplicados" onClose={() => setDuplicateModal({ open: false, matches: [] })} width="600px">
              <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-100 flex gap-3">
                      <Users className="shrink-0 mt-1 text-amber-400" size={20} />
                      <div>
                          <p className="font-bold">¡Espera! Encontramos similitudes.</p>
                          <p className="text-sm opacity-90 mt-1">Estás intentando registrar a <strong>{pendingPayload?.firstName} {pendingPayload?.lastName}</strong>, pero el sistema detectó expedientes similares.</p>
                      </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {duplicateModal.matches.map(match => (
                          <div key={match.id} className="border border-border bg-surfaceHighlight/5 p-3 rounded-lg flex justify-between items-center group hover:bg-surfaceHighlight/20 transition-colors">
                              <div>
                                  <div className="font-bold text-white flex items-center gap-2">{match.firstName} {match.lastName} <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase">{match.matchType}</span></div>
                                  <div className="text-xs text-textMuted mt-1 flex gap-3"><span>📱 {match.phone}</span><span>📧 {match.email || "Sin email"}</span></div>
                              </div>
                              <Button size="sm" variant="ghost" className="border border-border hover:bg-primary hover:text-white hover:border-primary transition-all text-xs h-8" onClick={() => navigate(`/patients/${match.id}`)}>Usar Este <ExternalLink size={12} className="ml-1" /></Button>
                          </div>
                      ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border"><Button variant="ghost" onClick={() => setDuplicateModal({ open: false, matches: [] })}>Cancelar Registro</Button><Button variant="secondary" onClick={() => executeCreate(pendingPayload)}>Ignorar y Crear Nuevo</Button></div>
              </div>
          </ModalWrapper>
      )}

      {/* MODAL SOLICITUD DE ELIMINACIÓN */}
      {deleteRequestModal.open && (
          <ModalWrapper title="Solicitar Eliminación" onClose={() => setDeleteRequestModal({ open: false, patientId: null, patientName: "" })} width="450px">
              <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-sm flex gap-3 items-start"><AlertTriangle className="shrink-0 mt-0.5" size={18} /><div><p className="font-bold">Acción Sensible</p><p className="opacity-80 text-xs mt-1">Solicitando eliminar a <strong>{deleteRequestModal.patientName}</strong>. Requiere autorización.</p></div></div>
                  <div><label className="block text-sm font-bold text-textMuted mb-2">Motivo:</label><textarea className="w-full bg-background border border-border rounded-lg p-3 text-white text-sm focus:border-red-500 outline-none transition-colors h-24 resize-none" placeholder="Ej. Registro duplicado..." value={deleteReason} onChange={e => setDeleteReason(e.target.value)} autoFocus /></div>
                  <div className="flex justify-end gap-3 pt-2"><Button variant="ghost" onClick={() => setDeleteRequestModal({ open: false, patientId: null, patientName: "" })}>Cancelar</Button><Button onClick={role === 'ADMIN' ? () => handleAdminApprove(deleteRequestModal.patientId) : submitDeleteRequest} variant="danger">{role === 'ADMIN' ? "Eliminar Directamente" : "Enviar Solicitud"}</Button></div>
              </div>
          </ModalWrapper>
      )}

      {/* MODAL FUENTES */}
      {isSourceModalOpen && (
        <ModalWrapper title="Editar Orígenes" onClose={() => setIsSourceModalOpen(false)} width="400px">
            <div className="space-y-4">
                <div className="flex gap-2"><Input placeholder="Nuevo origen..." value={newSourceInput} onChange={(e) => setNewSourceInput(e.target.value)} /><Button onClick={handleAddSource} variant="secondary">Agregar</Button></div>
                <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-background custom-scrollbar">
                    {editingSources.map((source, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-surfaceHighlight rounded border border-transparent hover:border-border transition-colors"><span className="text-sm text-white">{source}</span>{source === "Recomendación" ? (<span className="text-xs text-textMuted italic select-none">Fijo</span>) : (<button onClick={() => handleRemoveSource(source)} className="text-textMuted hover:text-red-400 px-2 transition-colors font-bold">×</button>)}</div>
                    ))}
                </div>
                <div className="pt-4 flex justify-end gap-2 border-t border-border"><Button variant="ghost" onClick={() => setIsSourceModalOpen(false)}>Cancelar</Button><Button variant="primary" onClick={handleSaveSources}>Guardar</Button></div>
            </div>
        </ModalWrapper>
      )}
    </div>
  );
}