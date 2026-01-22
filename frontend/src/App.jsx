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
import { motion, AnimatePresence } from 'framer-motion';

// --- Mock Data ---
const RECENT_ACTIVITY = [
  { id: 1, type: 'Process', title: 'Lab_Results_A1C.pdf', status: 'Success', time: '2m ago' },
  { id: 2, type: 'Error', title: 'Scan_0921.jpg', status: 'Failed', time: '15m ago' },
  { id: 3, type: 'Audit', title: 'Dr_Notes_Smith.txt', status: 'Fixed', time: '1h ago' }
];

const NAVIGATION = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'ingestion', label: 'Data Ingestion', icon: Database },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Configuration', icon: Settings },
];

function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateProcess = () => {
    setIsProcessing(true);
    setLogs([]);
    const steps = [
      { msg: 'Initializing secure edge connection...', delay: 500 },
      { msg: 'Reading input stream (Application/PDF)...', delay: 1200 },
      { msg: 'vLLM Inference: Identifying Clinical Entities...', delay: 2400 },
      { msg: 'Mapping: "bid" -> timing.repeat.frequency: 2', delay: 3500 },
      { msg: 'Auditor: Validating against FHIR R4 Schema...', delay: 4200 },
      { msg: 'Success: Bundle persisted to local store.', delay: 5000, done: true }
    ];
    let currentStep = 0;
    const runStep = () => {
      if (currentStep >= steps.length) { setIsProcessing(false); return; }
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      
      {/* Sidebar - Glassmorphism Style */}
      <aside className="w-20 lg:w-72 glass border-r border-border/50 flex flex-col z-20 transition-all duration-300">
        <div className="p-6 flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full group-hover:bg-primary/60 transition-all"></div>
            <div className="relative h-12 w-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-2xl border border-white/10">
              <Brain className="text-white" size={28} />
            </div>
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">MedGemma</h1>
            <div className="flex items-center gap-2">
               <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Edge Native</span>
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
                    ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(14,165,233,0.15)] ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={22} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'group-hover:scale-110'}`} />
                <span className="hidden lg:block font-medium">{item.label}</span>
                {isActive && <div className="absolute right-0 w-1 h-8 bg-primary rounded-l-full blur-[2px]"></div>}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
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

      {/* Main Content */}
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
             <button 
                onClick={handleSimulateProcess}
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
               { label: 'Avg. Response Time', value: '38ms', unit: 'Edge Inference', icon: Zap, color: 'text-warning' },
               { label: 'Cases Processed', value: '1,240', unit: 'Last 24 hours', icon: ShieldCheck, color: 'text-success' },
               { label: 'AI Confidence Score', value: '99.4%', unit: 'Autonomous Grading', icon: Brain, color: 'text-primary' },
             ].map((stat, i) => (
                <motion.div 
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
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">Optimal</span>
                   </div>
                   
                   <div>
                      <div className="text-3xl font-bold text-white mb-1 tracking-tight">{stat.label === 'Avg. Response Time' ? <span className="font-mono">{stat.value}</span> : stat.value}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                         {stat.unit}
                      </div>
                   </div>
                </motion.div>
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
                         <motion.div 
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
                         </motion.div>
                      ))}
                      {isProcessing && (
                         <motion.div
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
