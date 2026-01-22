import { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  FileText, 
  Upload, 
  Brain, 
  Settings, 
  Database,
  Search,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Terminal,
  Clock,
  User,
  Zap,
  BarChart3,
  LayoutDashboard
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

/**
 * --- MOCK DATA CONSTANTS ---
 * Simulated backend response for recent activity stream.
 */
const RECENT_ACTIVITY = [
  { id: 1, type: 'Process', title: 'Lab_Results_A1C.pdf', status: 'Success', time: '2m ago' },
  { id: 2, type: 'Error', title: 'Scan_0921.jpg', status: 'Failed', time: '15m ago' },
  { id: 3, type: 'Audit', title: 'Dr_Notes_Smith.txt', status: 'Fixed', time: '1h ago' }
];

/**
 * --- NAVIGATION CONFIGURATION ---
 * Sidebar menu items definition.
 */
const NAVIGATION = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'ingestion', label: 'Data Ingestion', icon: Database },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Configuration', icon: Settings },
];

/**
 * MedGemma Bridge - Main Application Component
 * 
 * This component functions as the primary dashboard for the MedGemma FHIR-Bridge.
 * It manages the state for the UI, simulates the data ingestion pipeline, and 
 * handles the responsive layout.
 * 
 * @returns {JSX.Element} The rendered dashboard application.
 */
function App() {
  // --- STATE MANAGEMENT ---
  const [activeNav, setActiveNav] = useState('dashboard'); // Tracks active sidebar tab
  const [isProcessing, setIsProcessing] = useState(false); // Controls globally processing state
  const [logs, setLogs] = useState([]); // Stores terminal output logs
  const [time, setTime] = useState(new Date().toLocaleTimeString()); // Real-time clock

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [files, setFiles] = useState([]);

  /**
   * Effect: Real-time Clock
   * Updates the top-bar clock every second.
   */
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Handles the file selection from the input.
   * Supports multiple files.
   * @param {Event} e - Input change event
   */
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Append new files to existing ones (or replace, depending on UX. Appending is better for 'multiple')
      // Here we replace for simplicity as per standard upload input behavior, but allow multiple selection.
      setFiles(Array.from(e.target.files));
    }
  };

  /**
   * Removes a specific file from the selection.
   * @param {number} index - Index of file to remove
   */
  const removeFile = (index, e) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };


  /**
   * Simulates the AI Ingestion Pipeline.
   * This function mocks the backend latency and processing steps for demonstration.
   */
  const handleSimulateProcess = () => {
    // 1. Close modal if open
    setShowUploadModal(false);
    
    // 2. Reset and start processing
    setIsProcessing(true);
    setLogs([]);

    // 3. Define the simulation sequence
    const fileCount = files.length;
    const steps = [
      { msg: 'Initializing secure edge connection...', delay: 500 },
      { msg: `Ingesting ${fileCount} file(s) for Patient ${patientId || 'Unknown'}...`, delay: 1200 },
      { msg: 'vLLM Inference: Identifying Clinical Entities...', delay: 2400 },
      { msg: `Batch Processing: ${fileCount} images queued for MedGemma 1.5`, delay: 3200 },
      { msg: 'Mapping: "bid" -> timing.repeat.frequency: 2', delay: 4000 },
      { msg: 'Auditor: Validating against FHIR R4 Schema...', delay: 4800 },
      { msg: 'Success: Bundle persisted to local store.', delay: 5500, done: true }
    ];

    // 4. Execute steps recursively with delays
    let currentStep = 0;
    const runStep = () => {
      if (currentStep >= steps.length) { 
        setIsProcessing(false); 
        return; 
      }
      const step = steps[currentStep];
      setTimeout(() => {
        setLogs(prev => [...prev, step.msg]);
        currentStep++;
        runStep();
      }, step.delay - (currentStep > 0 ? steps[currentStep-1].delay : 0));
    };
    
    runStep();
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans relative">
      
      {/* 
        --- UPLOAD MODAL --- 
        Uses AnimatePresence for smooth entry/exit transitions.
      */}
      <AnimatePresence>
        {showUploadModal && (
          <Motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUploadModal(false)} // Close on background click
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <Motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal
              className="w-full max-w-lg bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
              style={{ boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-semibold text-white">Upload Patient Records</h3>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="text-muted-foreground hover:text-white transition-colors p-1"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {/* Field: Patient ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">Patient ID</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="e.g. PT-45922"
                      className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-white/5 rounded-xl text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Field: File Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">Clinical Image/ Prescription</label>
                  
                  {/* Dropzone Area */}
                  <label className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group p-4 relative overflow-hidden">
                    <input 
                       type="file" 
                       multiple 
                       className="hidden" 
                       onChange={handleFileChange} 
                       accept="image/*,.pdf"
                    />
                    
                    {files.length === 0 ? (
                      <div className="flex flex-col items-center justify-center pt-2 pb-3">
                        <Upload className="w-8 h-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Images or PDFs (Multiple allowed)
                        </p>
                      </div>
                    ) : (
                       <div className="grid grid-cols-2 gap-3 w-full">
                          {files.map((f, i) => (
                             <div key={i} className="relative group/file bg-black/40 rounded-lg p-2 flex items-center gap-3 border border-white/5">
                                {/* Thumbnail Preview */}
                                <div className="w-12 h-12 rounded bg-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                                   {f.type.startsWith('image/') ? (
                                      <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover opacity-80" />
                                   ) : (
                                      <FileText className="text-muted-foreground" size={20} />
                                   )}
                                </div>
                                <div className="overflow-hidden">
                                   <p className="text-xs text-white truncate max-w-[120px]">{f.name}</p>
                                   <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button 
                                   onClick={(e) => removeFile(i, e)}
                                   className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity shadow-md"
                                >
                                   <span className="block w-4 h-4 leading-3 text-center text-xs">×</span>
                                </button>
                             </div>
                          ))}
                          {/* Add more button */}
                          <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                             <span className="text-2xl text-muted-foreground/50">+</span>
                          </div>
                       </div>
                    )}
                  </label>
                </div>

                {/* Footer Action */}
                <button 
                  onClick={handleSimulateProcess}
                  disabled={!patientId || files.length === 0}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                   {files.length > 0 ? `Process ${files.length} Record(s)` : 'Process & Digitize'}
                </button>

              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* 
        --- SIDEBAR NAVIGATION --- 
        Main layout sidebar with glassmorphism effects.
      */}
      <aside className="w-20 lg:w-72 glass border-r border-border/50 flex flex-col z-20 transition-all duration-300">
        <div className="p-6 flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full group-hover:bg-primary/60 transition-all"></div>
            <div className="relative h-12 w-12 bg-gradient-to-br from-primary to-emerald-400 rounded-xl flex items-center justify-center shadow-2xl border border-white/10">
              <Brain className="text-primary-foreground" size={28} />
            </div>
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">MedGemma</h1>
            <div className="flex items-center gap-2">
               <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Edge Native</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground tracking-widest uppercase hidden lg:block">Platform</div>
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={22} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'group-hover:scale-110'}`} />
                <span className="hidden lg:block font-medium">{item.label}</span>
                {isActive && <div className="absolute right-0 w-1 h-8 bg-primary rounded-l-full blur-[2px]"></div>}
              </button>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-primary p-0.5">
                   <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                      <User size={20} className="text-white" />
                   </div>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card"></div>
             </div>
             <div className="hidden lg:block overflow-hidden">
                <p className="text-sm font-semibold truncate text-white">Dr. Sridhar G.</p>
                <p className="text-xs text-muted-foreground">Chief Medical Officer</p>
             </div>
          </div>
        </div>
      </aside>

      {/* 
        --- MAIN CONTENT AREA --- 
        Contains the header, dashboard stats, and terminal output.
      */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Ambient Background Glow (Softer, Warmer) */}
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-sm z-10 transition-colors duration-300">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Workspace</h2>
             <div className="h-6 w-px bg-white/10"></div>
             <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Clock size={14} className="text-primary" />
                <span className="font-mono">{time}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                 <input 
                   type="text" 
                   placeholder="Search Patient ID..." 
                   className="pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent w-64 transition-all"
                 />
             </div>
             <button className="p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors relative" title="Notifications">
               <Zap size={20} className="text-accent fill-accent/20" />
             </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Hero Section */}
          <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-6">
             <div className="max-w-2xl"> 
                <h1 className="text-4xl font-bold text-white mb-2 leading-tight">
                   Good evening, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-200">Dr. Sridhar</span>
                </h1>
                <p className="text-muted-foreground text-lg">
                   The system is ready. <span className="text-white font-medium">3 active patient streams</span> require your attention.
                </p>
             </div>
             
             {/* Primary Action Button (Opens Modal) */}
             <button 
                onClick={() => setShowUploadModal(true)}
                disabled={isProcessing}
                className="group relative px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-3"
             >
                <div className="absolute inset-0 bg-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 {isProcessing ? <Activity className="animate-spin" size={20} /> : <Upload size={20} />}
                 <span>{isProcessing ? 'Analyzing Data...' : 'Upload Patient Records'}</span>
             </button>
          </div>

          {/* Stats Grid - Cleaner, Friendlier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[
               { label: 'Active Model', value: 'MedGemma 1.5-4b', unit: 'Google / DeepMind', icon: Brain, color: 'text-primary' },
               { label: 'Standard', value: 'HL7 FHIR R4', unit: 'Interoperability', icon: ShieldCheck, color: 'text-success' },
               { label: 'Platform', value: 'Edge Native', unit: 'Local Inference', icon: Zap, color: 'text-warning' },
             ].map((stat, i) => (
                <Motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-primary/30 transition-colors"
                >  
                   <div className="absolute -right-6 -top-6 bg-gradient-to-br from-white/5 to-transparent w-32 h-32 rounded-full blur-2xl group-hover:bg-primary/5 transition-colors"></div>
                   
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${stat.color}`}>
                         <stat.icon size={26} />
                      </div>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">Online</span>
                   </div>
                   
                   <div>
                      <div className="text-2xl font-bold text-white mb-1 tracking-tight">{stat.value}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                         <span className="font-semibold text-white/50">{stat.label}:</span> {stat.unit} 
                      </div>
                   </div>
                </Motion.div>
             ))}
          </div>

          {/* Visualization Split */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[500px]">
             
             {/* Terminal View */}
             <div className="flex flex-col bg-[#0d1117] rounded-3xl border border-white/10 shadow-2xl overflow-hidden font-mono text-sm relative group">
                {/* Mac-style header */}
                <div className="px-5 py-4 bg-white/5 border-b border-black/50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       <Terminal size={14} className="text-muted-foreground" />
                       <span className="text-muted-foreground text-xs font-semibold tracking-wide">System Activity Log</span>
                   </div>
                   <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                   </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-3 custom-scrollbar">
                   {!isProcessing && logs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-4">
                         <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-slow"></div>
                            <Terminal size={48} className="relative" />
                         </div>
                         <p>Waiting for import...</p>
                      </div>
                   )}
                   <AnimatePresence>
                      {logs.map((log, index) => (
                         <Motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                         >
                            <span className="text-muted-foreground/40 select-none shrink-0">
                               {new Date().toLocaleTimeString('en-US', {hour12:false})}
                            </span>
                            <span className="text-primary shrink-0">➜</span>
                            <span className={log.includes("Error") ? "text-destructive" : log.includes("Success") ? "text-success font-semibold" : "text-gray-300"}>
                               {log}
                            </span>
                         </Motion.div>
                      ))}
                      {isProcessing && (
                         <Motion.div
                           className="w-2 h-4 bg-primary/80"
                           animate={{ opacity: [1, 0] }}
                           transition={{ duration: 0.8, repeat: Infinity }}
                         />
                      )}
                   </AnimatePresence>
                </div>
             </div>

             {/* Recent Activity List */}
             <div className="glass-card rounded-3xl flex flex-col overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                   <h3 className="font-semibold text-white flex items-center gap-2">
                      <FileText size={18} className="text-accent" />
                      Recent Patient Files
                   </h3>
                   <button className="text-xs text-primary hover:text-primary/80 transition-colors">View Full Archive</button>
                </div>
                
                <div className="flex-1 overflow-auto p-3">
                   {RECENT_ACTIVITY.map((item) => (
                      <div key={item.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5">
                         <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${
                               item.status === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 
                               item.status === 'Failed' ? 'bg-red-500/10 text-red-500' : 
                               'bg-violet-500/10 text-violet-400'
                            }`}>
                               {item.type === 'Process' ? <Activity size={20} /> : item.type === 'Error' ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                            </div>
                            <div>
                               <h4 className="font-medium text-white group-hover:text-primary transition-colors">{item.title}</h4>
                               <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{item.type}</span>
                                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                  <span>{item.time}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                               item.status === 'Success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 
                               item.status === 'Failed' ? 'bg-red-500/5 border-red-500/20 text-red-500' : 
                               'bg-violet-500/5 border-violet-500/20 text-violet-400'
                            }`}>
                               {item.status === 'Success' && <CheckCircle2 size={12} />}
                               {item.status}
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-white transition-colors" />
                         </div>
                      </div>
                   ))}
                </div>
             </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
