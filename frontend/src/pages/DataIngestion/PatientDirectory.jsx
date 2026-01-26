import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  ArrowUpDown, 
  ChevronRight, 
  Calendar, 
  FileStack, 
  ArrowLeft,
  Clock
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { fetchPatients, fetchPatientHistory, getStoredApiKeys } from '../../services/api';
import FHIRViewer from '../../components/FHIRViewer/FHIRViewer';

const PatientDirectory = ({ refreshTrigger, initialSearchTerm = '' }) => {
  const [view, setView] = useState('directory'); // 'directory' | 'history'
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sortConfig, setSortConfig] = useState({ key: 'last_updated', direction: 'desc' });
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  // Sync prop changes
  useEffect(() => {
    if (initialSearchTerm) setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);


  const loadData = useCallback(async () => {
    try {
      const keys = getStoredApiKeys();
      if (keys.length > 0) {
          const data = await fetchPatients(keys[0].key);
          setPatients(data);
          setLoading(false);
          
          if (selectedPatient) {
              const hist = await fetchPatientHistory(selectedPatient, keys[0].key);
              setHistory(hist);
          }
      }
    } catch (error) {
      console.error("Directory fetch failed", error);
    }
  }, [selectedPatient]);

  // --- Auto-Refresh ---
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [loadData, refreshTrigger]);

  // --- Sorting & Filtering ---
  const sortedPatients = React.useMemo(() => {
    let items = [...patients];
    if (searchTerm) {
        items = items.filter(p => p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    items.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return items;
  }, [patients, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePatientClick = async (patientId) => {
      setLoading(true);
      setSelectedPatient(patientId);
      try {
          const keys = getStoredApiKeys();
          const hist = await fetchPatientHistory(patientId, keys[0].key);
          setHistory(hist);
          setView('history');
      } finally {
          setLoading(false);
      }
  };

  const handleBack = () => {
      setView('directory');
      setSelectedPatient(null);
  };

  return (
    <>
    <div className="glass-card rounded-3xl flex flex-col overflow-hidden h-full border border-white/5 bg-black/20">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Users size={18} className="text-accent" />
          {view === 'directory' ? 'Patient Directory' : `Patient History: ${selectedPatient}`}
        </h3>
        
        {view === 'directory' && (
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input 
                  type="text" 
                  placeholder="Search Patient ID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all w-48"
                />
            </div>
        )}
        {view === 'history' && (
            <button onClick={handleBack} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Directory
            </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-0 custom-scrollbar relative">
        <AnimatePresence mode="wait">
            
            {/* VIEW A: DIRECTORY TABLE */}
            {view === 'directory' && (
                <Motion.div 
                    key="dir"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th onClick={() => requestSort('patient_id')} className="p-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors">
                                    <div className="flex items-center gap-1">Patient ID <ArrowUpDown size={10} /></div>
                                </th>
                                <th onClick={() => requestSort('file_count')} className="p-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors text-center">
                                    <div className="flex items-center gap-1 justify-center">Records <ArrowUpDown size={10} /></div>
                                </th>
                                <th onClick={() => requestSort('last_updated')} className="p-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors text-right">
                                    <div className="flex items-center gap-1 justify-end">Last Updated <ArrowUpDown size={10} /></div>
                                </th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedPatients.map((p) => (
                                <tr 
                                    key={p.patient_id} 
                                    onClick={() => handlePatientClick(p.patient_id)}
                                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4 text-sm font-medium text-white group-hover:text-primary transition-colors">
                                        {p.patient_id}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-xs text-muted-foreground">
                                            <FileStack size={12} /> {p.file_count}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-xs text-muted-foreground font-mono">
                                        {new Date(p.last_updated).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-white transition-colors" />
                                    </td>
                                </tr>
                            ))}
                            {sortedPatients.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-muted-foreground text-sm">
                                        No patients found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Motion.div>
            )}

            {/* VIEW B: HISTORY TIMELINE */}
            {view === 'history' && (
                <Motion.div 
                    key="hist"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full p-4"
                >
                    <div className="space-y-3">
                        {history.map((record) => (
                            <div 
                                key={record.id}
                                onClick={() => setSelectedSubmission(record)}
                                className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                     {/* Thumbnail or Icon */}
                                    <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                                        {record.image_url ? (
                                            <img src={record.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <FileStack className="text-muted-foreground" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                                            {record.filename}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1"><Clock size={10} /> {new Date(record.created_at).toLocaleString()}</span>
                                            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] uppercase ${
                                                record.status === 'completed' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                         {history.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground">No records found for this patient.</div>
                        )}
                    </div>
                </Motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
    
    <AnimatePresence>
        {selectedSubmission && (
          <FHIRViewer 
            data={selectedSubmission} 
            onClose={() => setSelectedSubmission(null)} 
            onRefresh={loadData}
          />
        )}
    </AnimatePresence>
    </>
  );
};

export default PatientDirectory;
