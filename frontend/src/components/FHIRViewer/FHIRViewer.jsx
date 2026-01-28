
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, 
  Code, 
  Activity, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle,
  ZoomIn,
  Eye,
  ShieldCheck,
  Stethoscope,
  Pill,
  Thermometer,
  Calendar,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Save,
  Sparkles,
  Download,
  Table
} from 'lucide-react';

const ClinicalCard = ({ title, value, unit, referenceRange, status, type }) => {
  const isAbnormal = status === 'critical' || status === 'high' || status === 'low';
  
  return (
    <div className={`p-4 rounded-2xl border transition-all hover:bg-white/5 ${
      isAbnormal 
      ? 'bg-red-500/5 border-red-500/20' 
      : 'bg-white/5 border-white/5'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          {type === 'vital' && <Activity size={12} className="text-emerald-400" />}
          {type === 'lab' && <Thermometer size={12} className="text-blue-400" />}
          {type === 'med' && <Pill size={12} className="text-violet-400" />}
          {type === 'imaging' && <ZoomIn size={12} className="text-amber-400" />}
          {title}
        </span>
        {isAbnormal && <AlertTriangle size={14} className="text-red-500" />}
      </div>
      
      <div className="flex flex-col gap-1.5 mt-1">
        <span className={`${
           type === 'imaging' || (typeof value === 'string' && value.length > 20)
           ? 'text-sm font-medium leading-relaxed font-sans' // Smaller text for long findings
           : 'text-2xl font-bold font-mono tracking-tight'
        } ${isAbnormal ? 'text-red-400' : 'text-white'}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
      </div>

      {referenceRange && (
        <div className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <ShieldCheck size={10} />
          Range: {referenceRange}
        </div>
      )}
    </div>
  );
};

const FHIRViewer = ({ data, onClose, onRefresh }) => {
  const [viewMode, setViewMode] = useState('clinical'); // 'clinical' or 'json'
  const [activeTab, setActiveTab] = useState('labs'); // 'labs', 'imaging', 'meds', 'vitals'
  const [copied, setCopied] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [localData, setLocalData] = useState(data); // Track data locally if we reload
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  
  // Doctor's Notes State
  const [notes, setNotes] = useState(data?.doctor_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState(data?.ai_summary || '');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Track previous ID to prevent overwriting notes during background refresh
  const lastSubmissionIdRef = useRef(data?.id);

  // Sync state when localData updates
  useEffect(() => {
    // 1. If Patient ID changed, hard reset everything (new record loaded)
    if (localData?.id !== lastSubmissionIdRef.current) {
        lastSubmissionIdRef.current = localData?.id;
        setNotes(localData?.doctor_notes || '');
        setAiSummary(localData?.ai_summary || '');
        return;
    }

    // 2. Same Patient: Only update AI Summary (server-side generation)
    // We intentionally DO NOT update 'notes' here to prevent overwriting 
    // user text while they are typing if a background poll happens.
    if (localData?.ai_summary !== undefined && localData.ai_summary !== aiSummary) {
        setAiSummary(localData.ai_summary);
    }
  }, [localData, aiSummary]);


  // Sync with parent data if it refreshes in background, but don't overwrite during reload
  useEffect(() => {
    if (!isReloading && data) {
        // SAFEGUARD: If our local data has more observations than the incoming prop data,
        // the prop data is likely 'stale' (e.g. the list API hasn't updated yet).
        const localObsCount = localData?.fhir_bundle?.entry?.filter(e => e.resource.resourceType === 'Observation').length || 0;
        const incomingObsCount = data?.fhir_bundle?.entry?.filter(e => e.resource.resourceType === 'Observation').length || 0;
        
        if (incomingObsCount < localObsCount && localObsCount > 3) {
            console.log("[FHIRViewer] Ignoring potentially stale data sync from parent list.");
            return;
        }
        setLocalData(data);
    }
  }, [data, isReloading, localData]);
  
  // Extract data from FHIR Bundle safely
  const resources = useMemo(() => localData?.fhir_bundle?.entry?.map(e => e.resource) || [], [localData]);
  
  // Group Resources
  const observations = useMemo(() => resources.filter(r => r.resourceType === 'Observation'), [resources]);
  const medications = useMemo(() => resources.filter(r => 
    r.resourceType === 'MedicationRequest' || 
    r.resourceType === 'MedicationStatement'
  ), [resources]);
  const patient = useMemo(() => resources.find(r => r.resourceType === 'Patient'), [resources]);

  const handleCopy = () => {
    const jsonStr = JSON.stringify(localData?.fhir_bundle || {}, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to safely get valueString or valueQuantity
  const getValue = (obs) => {
    if (obs.valueQuantity) return obs.valueQuantity.value;
    if (obs.valueString) return obs.valueString;
    return 'N/A';
  };

  // Track if we've auto-selected a tab for this specific patient/submission
  const tabInitializedForId = useRef(null);

  // Smart Default Tab
  useEffect(() => {
    // If we've already set a smart default for this specific record ID, 
    // don't override the user's current navigation (e.g. during a refresh).
    if (localData?.id === tabInitializedForId.current) return;

    const imagingCount = observations.filter(o => {
        const cat = (o.category?.[0]?.coding?.[0]?.code || '').toLowerCase();
        return cat === 'imaging';
    }).length;
    
    let targetTab = 'vitals';
    if (imagingCount > 0) {
        targetTab = 'imaging';
    } else if (observations.length > 0) {
        targetTab = 'labs';
    } else if (medications.length > 0) {
        targetTab = 'meds';
    }

    // Only commit if we actually have data (or if it's empty, default to vitals is fine)
    setActiveTab(targetTab);
    
    // Mark this ID as initialized so subsequent refreshes don't reset the tab
    if (localData?.id) {
        tabInitializedForId.current = localData.id;
    }
  }, [observations, medications.length, localData?.id]);

  const handleDownloadImage = () => {
    if (!localData?.image_url) return;
    
    // Use direct link approach which is more robust for cross-origin image downloads
    // in complex environments, while still attempting to trigger a download.
    const link = document.createElement('a');
    link.href = localData.image_url;
    link.download = localData.filename || `clinical_record_${localData.id?.slice(0, 8)}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReload = async () => {
    if (isReloading) return;
    setIsReloading(true);
    try {
        const { rerunMedGemma, getStoredApiKeys } = await import('../../services/api');
        const keys = getStoredApiKeys();
        if (keys.length > 0) {
            const updated = await rerunMedGemma(localData.id, keys[0].key);
            // Patch local data
            setLocalData(prev => ({
                ...prev,
                fhir_bundle: updated.fhir_bundle
            }));
            setLastUpdated(new Date().toLocaleTimeString());
            
            // Notify parent to refresh its cache and wait for it
            if (onRefresh) {
                await onRefresh();
                // Brief pause to ensure state transitions settle
                await new Promise(r => setTimeout(r, 500));
            }
        }
    } catch (error) {
        console.error("Reload failed:", error);
    } finally {
        setIsReloading(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
        const { saveDoctorNotes, getStoredApiKeys } = await import('../../services/api');
        const keys = getStoredApiKeys();
        if (keys.length > 0) {
            await saveDoctorNotes(localData.id, notes, keys[0].key);
            // Update local state to reflect saved status
            setLocalData(prev => ({ ...prev, doctor_notes: notes }));
        }
    } catch (error) {
        console.error("Failed to save notes:", error);
        alert("Failed to save notes. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
     if (isGeneratingSummary) return;
     setIsGeneratingSummary(true);
     try {
         const { generateAISummary, getStoredApiKeys } = await import('../../services/api');
         const keys = getStoredApiKeys();
         if (keys.length > 0) {
             const result = await generateAISummary(localData.id, keys[0].key);
             if (result && result.summary) {
                 // Update local state and data
                 const newSummary = result.summary;
                 setAiSummary(newSummary);
                 setLocalData(prev => ({ ...prev, ai_summary: newSummary }));
             }
         }
     } catch (error) {
         console.error("Failed to generate summary:", error);
         alert("Failed to generate AI summary. Please try again.");
     } finally {
         setIsGeneratingSummary(false);
     }
  };

  const getUnit = (obs) => {
    if (obs.valueQuantity) return obs.valueQuantity.unit;
    return '';
  };

  return (
    <Motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
      onClick={onClose}
    >
      <Motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl h-full max-h-[90vh] bg-[#0A0A0B] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Header content */}
        <div className="h-16 border-b border-white/5 grid grid-cols-3 items-center px-6 bg-white/[0.02] shrink-0">
          {/* Left Group: Patient Identity */}
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {patient ? (patient.name?.[0]?.given?.[0]?.[0] || 'P') : 'P'}
            </div>
            <div className="min-w-0 pr-4">
              <h2 
                className="text-white font-semibold text-sm truncate max-w-[180px] cursor-help"
                title={`${patient?.name?.[0]?.given?.join(' ') || 'Unknown Patient'} ${patient?.name?.[0]?.family || ''}`}
              >
                 {patient?.name?.[0]?.given?.join(' ') || 'Unknown Patient'} {patient?.name?.[0]?.family || ''}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono bg-white/5 px-1.5 rounded text-white/60 truncate">ID: {localData?.patient_id}</span>
                <span className="text-white/20 shrink-0">•</span>
                <span className="text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={10} /> Valid
                </span>
              </div>
            </div>
          </div>

          {/* Center Group: View Switcher */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5 shadow-inner backdrop-blur-sm">
               {[
                 { id: 'clinical', label: 'Clinical View', icon: <Stethoscope size={14} /> },
                 { id: 'json', label: 'Raw JSON', icon: <Code size={14} /> },
                 { id: 'extraction', label: 'Extraction', icon: <Table size={14} /> },
                 { id: 'notes', label: "Doctor's Note", icon: <FileText size={14} /> },
                 { id: 'ai_summary', label: 'AI Summary', icon: <Sparkles size={14} /> }
               ].map((mode) => (
                 <button
                   key={mode.id}
                   onClick={() => setViewMode(mode.id)}
                   className={`px-4 h-9 rounded-full text-xs font-medium transition-all flex items-center gap-2 relative whitespace-nowrap overflow-hidden ${
                     viewMode === mode.id ? 'text-white' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                   }`}
                 >
                   {viewMode === mode.id && (
                     <Motion.div 
                       layoutId="active-view-pill"
                       className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                       initial={false}
                       transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                     />
                   )}
                   <span className="relative z-10 flex items-center gap-2">
                     {mode.icon}
                     {mode.label}
                   </span>
                 </button>
               ))}
            </div>
          </div>

          {/* Right Group: Global Actions */}
          <div className="flex items-center justify-end gap-3">
            <div className="hidden md:flex flex-col items-end pr-2 border-r border-white/5 h-8 justify-center">
               <span className="text-[10px] text-white/40 uppercase tracking-tighter">Last Refresh</span>
               <span className="text-[10px] font-mono text-white/60 leading-none">{lastUpdated}</span>
            </div>
            
            <button 
              onClick={handleReload}
              disabled={isReloading}
              className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground transition-all border border-white/5 ${
                  isReloading ? 'bg-primary/20 text-primary border-primary/20' : 'hover:bg-white/10 hover:text-white'
              }`}
              title="Rerun MedGemma Analysis"
            >
              <RefreshCw size={18} className={isReloading ? 'animate-spin' : ''} />
            </button>

            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-muted-foreground transition-all border border-white/5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
           
           {/* Left Panel: Source Documents content as before... */}
           <div className="w-[40%] border-r border-white/5 flex flex-col bg-black/20">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Eye size={14} /> Source Documents
                 </h3>
                 <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">BATCH ID: {localData?.id?.slice(0,8)}</span>
              </div>
              <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-[url('/grid-pattern.svg')] bg-[length:20px_20px] relative group">
                 {localData?.image_url ? (
                    <>
                      <img 
                        src={localData.image_url} 
                        alt="Clinical Record" 
                        className="max-w-full rounded-lg border border-white/10 shadow-2xl"
                      />
                      <div className="absolute top-6 right-6">
                        <button 
                          onClick={handleDownloadImage}
                          className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white text-xs font-medium hover:bg-black/80 transition-all shadow-xl"
                        >
                          <Download size={14} />
                          Download Image
                        </button>
                      </div>
                    </>
                 ) : (
                    <div className="text-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 max-w-sm w-full">
                       <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                          <FileJson size={32} />
                       </div>
                       <h4 className="text-white font-medium mb-1">{localData?.filename}</h4>
                       <p className="text-xs text-muted-foreground">Original source file processed by MedGemma 1.5</p>
                       <div className="mt-4 flex gap-2 justify-center">
                          <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                             <ZoomIn size={12} /> View High-Res
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>

           {/* Right Panel: Analyzed Data */}
           <div className="flex-1 overflow-hidden flex flex-col bg-[#0A0A0B] min-h-0">
             
             {viewMode === 'clinical' && (
               <div className="h-full flex flex-col">
                  {/* Category Tabs */}
                   <div className="px-6 pt-6 pb-2 flex gap-6 border-b border-white/5 overflow-x-auto">
                    {['labs', 'imaging', 'meds', 'vitals'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium transition-all relative shrink-0 ${
                          activeTab === tab ? 'text-white' : 'text-muted-foreground hover:text-white/70'
                        }`}
                      >
                        {tab === 'labs' && 'Lab Results'}
                        {tab === 'imaging' && 'Radiology'}
                        {tab === 'meds' && 'Medications'}
                        {tab === 'vitals' && 'Vital Signs'}
                        {activeTab === tab && (
                          <Motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        
                        {/* VITALS TAB */}
                        {activeTab === 'vitals' && observations.filter(o => {
                           const txt = (o.code?.text || '').toLowerCase();
                           const cat = (o.category?.[0]?.coding?.[0]?.code || '').toLowerCase();
                           if (cat === 'imaging') return false;
                           return txt.includes('pressure') || txt.includes('heart') || txt.includes('temp') || txt.includes('weight') || txt.includes('height') || txt.includes('bmi') || txt.includes('rate');
                        }).map((obs, i) => (
                              <ClinicalCard 
                                key={i}
                                type="vital"
                                title={obs.code?.text || 'Unknown Vital'}
                                value={getValue(obs)}
                                unit={getUnit(obs)}
                                referenceRange={obs.referenceRange?.[0]?.text || "N/A"}
                              />
                        ))}

                        {/* LABS TAB */}
                        {activeTab === 'labs' && observations.filter(o => {
                           const txt = (o.code?.text || '').toLowerCase();
                           const cat = (o.category?.[0]?.coding?.[0]?.code || '').toLowerCase();
                           if (cat === 'imaging') return false;
                           return !(txt.includes('pressure') || txt.includes('heart') || txt.includes('temp') || txt.includes('weight') || txt.includes('height') || txt.includes('bmi') || txt.includes('rate'));
                        }).map((obs, i) => {
                           const low = obs.referenceRange?.[0]?.low?.value;
                           const high = obs.referenceRange?.[0]?.high?.value;
                           const rangeText = (low !== undefined && high !== undefined) ? `${low} - ${high}` : (obs.referenceRange?.[0]?.text || "");
                           
                           return (
                              <ClinicalCard 
                                key={i}
                                type="lab"
                                title={obs.code?.text || 'Unknown Lab'}
                                value={getValue(obs)}
                                unit={getUnit(obs)}
                                referenceRange={rangeText}
                                status={obs.interpretation?.[0]?.coding?.[0]?.code === 'H' ? 'high' : obs.interpretation?.[0]?.coding?.[0]?.code === 'L' ? 'low' : 'normal'}
                              />
                           );
                        })}

                        {/* IMAGING TAB */}
                        {activeTab === 'imaging' && observations.filter(o => {
                           const txt = (o.code?.text || '').toLowerCase();
                           const cat = (o.category?.[0]?.coding?.[0]?.code || '').toLowerCase();
                           return cat === 'imaging' || txt.includes('scan') || txt.includes('x-ray') || txt.includes('mri') || txt.includes('ct');
                        }).map((obs, i) => (
                              <ClinicalCard 
                                key={i}
                                type="imaging"
                                title={obs.code?.text || 'Unknown Scan'}
                                value={getValue(obs)}
                                unit={getUnit(obs) || 'Finding'}
                                referenceRange={obs.referenceRange?.[0]?.text}
                              />
                        ))}
                        
                        {activeTab === 'meds' && medications.map((med, i) => (
                           <div key={i} className="col-span-full p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg">
                                  <Pill size={20} />
                                </div>
                                <div>
                                  <h4 className="text-white font-medium">
                                    {med.medicationCodeableConcept?.text || "Unknown Medication"}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {med.dosageInstruction?.[0]?.text && <span className="text-emerald-400 font-medium">Dosage: {med.dosageInstruction[0].text} • </span>}
                                    Prescribed: {med.authoredOn || 'Unknown Date'} • Status: <span className="capitalize">{med.status}</span>
                                  </p>
                                </div>
                              </div>
                           </div>
                        ))}

                        {/* Fallback empty states */}
                        {activeTab === 'vitals' && observations.every(o => !(o.code?.text || '').toLowerCase().match(/pressure|heart|temp|weight|height|bmi|rate/)) && (
                          <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                             <Activity size={24} className="opacity-20" />
                             <p>No vital signs found in this record.</p>
                          </div>
                        )}
                        {activeTab === 'labs' && observations.every(o => (o.code?.text || '').toLowerCase().match(/pressure|heart|temp|weight|height|bmi|rate/)) && (
                          <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                             <Thermometer size={24} className="opacity-20" />
                             <p>No lab results found. Check Vitals tab?</p>
                          </div>
                        )}
                        {activeTab === 'imaging' && observations.every(o => {
                          const txt = (o.code?.text || '').toLowerCase();
                          const cat = (o.category?.[0]?.coding?.[0]?.code || '').toLowerCase();
                          return !(cat === 'imaging' || txt.includes('scan') || txt.includes('x-ray') || txt.includes('mri') || txt.includes('ct'));
                        }) && (
                          <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                             <ZoomIn size={24} className="opacity-20" />
                             <p>No imaging results found.</p>
                          </div>
                        )}
                        {activeTab === 'meds' && medications.length === 0 && (
                          <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                             <Pill size={24} className="opacity-20" />
                             <p>No medications found.</p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             )}

             {viewMode === 'json' && (
                <div className="flex-1 overflow-auto p-6 bg-[#0F0F10] custom-scrollbar relative">
                   <div className="absolute top-4 right-6 z-10">
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all backdrop-blur-md border ${
                          copied 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={14} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy JSON
                          </>
                        )}
                      </button>
                   </div>
                    <pre className="text-xs font-mono text-blue-300 leading-relaxed">
                       {JSON.stringify(localData?.fhir_bundle || {}, null, 2)}
                    </pre>
                </div>
             )}

             {viewMode === 'extraction' && (
                <div className="flex-1 overflow-auto p-6 bg-[#0F0F10] custom-scrollbar relative flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                           <Table size={16} className="text-primary"/> Raw TSV Extraction (Evidence)
                        </h3>
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 font-mono">
                              MODALITY: {(localData?.fhir_bundle?.entry?.find(e => e.resource.resourceType === 'Observation')?.resource?.category?.[0]?.coding?.[0]?.code || 'LAB').toUpperCase()}
                           </span>
                           <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5">
                              MedGemma 1.5-4b-it
                           </span>
                        </div>
                    </div>
                    
                    {localData?.raw_extraction ? (() => {
                        const lines = localData.raw_extraction.trim().split('\n');
                        // Heuristic to find the table start (skipping metadata lines with colons but no tabs)
                        let tableStartIndex = lines.findIndex(l => l.includes('\t') || l.split(/\s{2,}/).length > 2);
                        if (tableStartIndex === -1) tableStartIndex = 0;

                        const headers = lines[tableStartIndex].split(/\t|\s{2,}/).filter(h => h.trim());
                        const rows = lines.slice(tableStartIndex + 1).map(l => l.split(/\t|\s{2,}/).filter(c => c.trim())).filter(r => r.length > 0);

                        return (
                          <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/40 shadow-inner group custom-scrollbar">
                            <table className="w-full text-left border-collapse table-auto">
                              <thead>
                                <tr className="bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
                                  {headers.map((h, i) => (
                                    <th key={i} className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] border-r border-white/5 last:border-0 whitespace-nowrap">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {rows.map((row, i) => (
                                  <tr key={i} className="hover:bg-primary/5 transition-all duration-200 group/row even:bg-white/[0.01]">
                                    {row.map((cell, j) => (
                                      <td key={j} className="px-6 py-4 text-xs font-mono text-amber-100/70 border-r border-white/[0.02] last:border-0 group-hover/row:text-amber-100 group-hover/row:bg-primary/[0.02]">
                                        <div className="max-w-md truncate md:max-w-none md:whitespace-normal">
                                          {cell}
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                    })() : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                             <Table size={32} className="opacity-10" />
                             <p className="text-sm font-medium opacity-40">No ingestion evidence artifact found.</p>
                        </div>
                    )}
                </div>
             )}

             {viewMode === 'notes' && (
                <div className="flex-1 flex flex-col p-6 bg-[#0A0A0B] relative overflow-hidden min-h-0">
                   <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-4 min-h-0">
                      
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                         <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                               <FileText className="text-primary" size={20} />
                               Doctor's Clinical Notes
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                               Add your observations and recommendations for this patient record.
                            </p>
                         </div>
                         <button 
                             onClick={handleSaveNotes}
                             disabled={isSaving}
                             className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                                 isSaving 
                                 ? 'bg-primary/50 cursor-wait' 
                                 : 'bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20'
                             }`}
                         >
                             {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                             {isSaving ? 'Saving...' : 'Save Notes'}
                         </button>
                      </div>

                       <div className="flex-1 relative min-h-0 h-full">
                          <textarea
                             className="w-full h-full bg-white/5 border border-white/10 rounded-xl p-6 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-sans text-sm leading-relaxed custom-scrollbar overflow-y-auto"
                             placeholder="Start typing your clinical notes here..."
                             value={notes}
                             onChange={(e) => setNotes(e.target.value)}
                          />
                          <div className="absolute bottom-4 right-4 text-[10px] text-white/20 pointer-events-none">
                             Markdown Supported
                          </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg">
                         <ShieldCheck size={14} className="text-blue-400" />
                         <span>Notes are persisted securely in the PostgreSQL database and linked to Submission ID: <span className="font-mono text-white/50">{localData?.id?.slice(0,8)}</span></span>
                      </div>
                   </div>
                </div>
             )}

             {viewMode === 'ai_summary' && (
                <div className="flex-1 flex flex-col p-6 bg-[#0A0A0B] relative overflow-hidden min-h-0">
                   <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6 min-h-0">
                      
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                         <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                               <Sparkles className="text-amber-400" size={20} />
                               AI Clinical Synthesis
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                               Generated summary integrating image analysis and doctor's notes.
                            </p>
                         </div>
                         {aiSummary && (
                             <button 
                                 onClick={handleGenerateSummary}
                                 disabled={isGeneratingSummary}
                                 className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                                     isGeneratingSummary 
                                     ? 'bg-white/5 cursor-wait text-muted-foreground' 
                                     : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                 }`}
                             >
                                 <RefreshCw className={isGeneratingSummary ? "animate-spin" : ""} size={16} />
                                 Rerun Summary
                             </button>
                         )}
                      </div>

                       <div className="flex-1 relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-0 h-full">
                          {isGeneratingSummary ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm z-10">
                                  <div className="relative">
                                     <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                     <Sparkles size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" />
                                  </div>
                                  <p className="text-sm font-medium text-white/80 animate-pulse">Synthesizing clinical data...</p>
                              </div>
                          ) : null}

                          {!aiSummary && !isGeneratingSummary ? (
                              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
                                      <Sparkles size={32} />
                                  </div>
                                  <h4 className="text-white font-medium text-lg">No Summary Generated</h4>
                                  <p className="text-muted-foreground max-w-sm text-sm">
                                      Use MedGemma's advanced vision capabilities to summarize this record and cross-reference with your notes.
                                  </p>
                                  <button 
                                      onClick={handleGenerateSummary}
                                      className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/25 font-medium text-sm transition-all flex items-center gap-2 transform hover:scale-105"
                                  >
                                      <Sparkles size={16} /> Generate Summary
                                  </button>
                              </div>
                           ) : (
                                 <div className="flex-1 p-8 pr-12 overflow-y-auto custom-scrollbar min-h-0 h-full">
                                   <article className="max-w-none">
                                       <ReactMarkdown 
                                         remarkPlugins={[remarkGfm]}
                                         components={{
                                           ul: ({node: _node, ...props}) => <ul style={{ listStyleType: 'disc' }} className="ml-6 my-4 space-y-2 block text-white/80" {...props} />,
                                           ol: ({node: _node, ...props}) => <ol style={{ listStyleType: 'decimal' }} className="ml-6 my-4 space-y-2 block text-white/80" {...props} />,
                                           li: ({node: _node, ...props}) => <li className="pl-1 mb-2 marker:text-emerald-500" {...props} />,
                                           h2: ({node: _node, ...props}) => <h2 className="text-xl font-bold text-white mt-10 first:mt-0 mb-4 border-b border-white/10 pb-2 uppercase tracking-tight" {...props} />,
                                           h3: ({node: _node, ...props}) => <h3 className="text-lg font-semibold text-white mt-8 first:mt-0 mb-3" {...props} />,
                                           p: ({node: _node, ...props}) => <p className="leading-relaxed text-white/80 mb-6 first:mt-0" {...props} />,
                                           strong: ({node: _node, ...props}) => <strong className="text-emerald-400 font-bold" {...props} />,
                                         }}
                                       >
                                           {aiSummary}
                                       </ReactMarkdown>
                                   </article>
                               </div>
                           )}
                      </div>
                      
                      {aiSummary && (
                           <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center">
                              <span>Generated by MedGemma 1.5-4b</span>
                              <span>•</span>
                              <span>Always verify with source documents</span>
                           </div>
                      )}
                   </div>
                </div>
             )}



           </div>
        </div>
      </Motion.div>
    </Motion.div>
  );
};

export default FHIRViewer;
