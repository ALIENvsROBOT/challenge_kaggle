
import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
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
  Calendar
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
          {title}
        </span>
        {isAbnormal && <AlertTriangle size={14} className="text-red-500" />}
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold font-mono tracking-tight ${
          isAbnormal ? 'text-red-400' : 'text-white'
        }`}>
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

const FHIRViewer = ({ data, onClose }) => {
  const [viewMode, setViewMode] = useState('clinical'); // 'clinical' or 'json'
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals', 'meds', 'labs'
  
  // Extract data from FHIR Bundle safely
  const resources = data?.fhir_bundle?.entry?.map(e => e.resource) || [];
  
  // Group Resources
  const observations = resources.filter(r => r.resourceType === 'Observation');
  const medications = resources.filter(r => 
    r.resourceType === 'MedicationRequest' || 
    r.resourceType === 'MedicationStatement'
  );
  const patient = resources.find(r => r.resourceType === 'Patient');

  // Helper to safely get valueString or valueQuantity
  const getValue = (obs) => {
    if (obs.valueQuantity) return obs.valueQuantity.value;
    if (obs.valueString) return obs.valueString;
    return 'N/A';
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
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {patient ? (patient.name?.[0]?.given?.[0]?.[0] || 'P') : 'P'}
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">
                 {patient?.name?.[0]?.given?.join(' ') || 'Unknown Patient'} {patient?.name?.[0]?.family || ''}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono bg-white/5 px-1.5 rounded text-white/60">ID: {data?.patient_id}</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={10} /> FHIR R4 Validated
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/20 p-1 rounded-full border border-white/5">
             <button
               onClick={() => setViewMode('clinical')}
               className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                 viewMode === 'clinical' 
                 ? 'bg-primary text-white shadow-lg' 
                 : 'text-muted-foreground hover:text-white hover:bg-white/5'
               }`}
             >
               <Stethoscope size={14} /> Clinical View
             </button>
             <button
               onClick={() => setViewMode('json')}
               className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                 viewMode === 'json' 
                 ? 'bg-primary text-white shadow-lg' 
                 : 'text-muted-foreground hover:text-white hover:bg-white/5'
               }`}
             >
               <Code size={14} /> Raw JSON
             </button>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
           
           {/* Left Panel: Source Documents */}
           <div className="w-[40%] border-r border-white/5 flex flex-col bg-black/20">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Eye size={14} /> Source Documents
                 </h3>
                 <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">BATCH ID: {data?.id?.slice(0,8)}</span>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[url('/grid-pattern.svg')] bg-[length:20px_20px]">
                 {/* Placeholder for actual image if available in API response, currently using iconic representation if no URL */}
                 {data?.image_url ? (
                    <img 
                      src={data.image_url} 
                      alt="Clinical Record" 
                      className="max-w-full rounded-lg border border-white/10 shadow-2xl"
                    />
                 ) : (
                    <div className="text-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 max-w-sm w-full">
                       <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                          <FileJson size={32} />
                       </div>
                       <h4 className="text-white font-medium mb-1">{data?.filename}</h4>
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
           <div className="flex-1 overflow-hidden flex flex-col bg-[#0A0A0B]">
             
             {viewMode === 'clinical' && (
               <div className="h-full flex flex-col">
                  {/* Category Tabs */}
                  <div className="px-6 pt-6 pb-2 flex gap-6 border-b border-white/5">
                    {['vitals', 'labs', 'meds'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium transition-all relative ${
                          activeTab === tab ? 'text-white' : 'text-muted-foreground hover:text-white/70'
                        }`}
                      >
                        {tab === 'vitals' && 'Vital Signs'}
                        {tab === 'labs' && 'Lab Results'}
                        {tab === 'meds' && 'Medications'}
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
                           // Inverse of vitals: if it's not a common vital, assume it's a lab for now
                           return !(txt.includes('pressure') || txt.includes('heart') || txt.includes('temp') || txt.includes('weight') || txt.includes('height') || txt.includes('bmi') || txt.includes('rate'));
                        }).map((obs, i) => {
                           // Extract range text safely
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
                                    Prescribed: {med.authoredOn || 'Unknown Date'} • Status: <span className="text-emerald-400 capitalize">{med.status}</span>
                                  </p>
                                </div>
                              </div>
                              <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-colors">
                                View Details
                              </button>
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
                <div className="flex-1 overflow-auto p-6 bg-[#0F0F10] custom-scrollbar">
                   <pre className="text-xs font-mono text-blue-300 leading-relaxed">
                      {JSON.stringify(data?.fhir_bundle || {}, null, 2)}
                   </pre>
                </div>
             )}

           </div>
        </div>
      </Motion.div>
    </Motion.div>
  );
};

export default FHIRViewer;
