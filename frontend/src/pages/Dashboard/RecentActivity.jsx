import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Activity, 
  AlertOctagon, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { fetchSubmissions, getStoredApiKeys } from '../../services/api';

const formatTimeAgo = (dateString) => {
  const now = new Date();
  // Server returns ISO string without Z usually if simple datetime.now().isoformat()
  // Append Z to treat as UTC if not present
  const timeString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const past = new Date(timeString);
  const diffInSecs = Math.floor((now - past) / 1000);
  
  if (diffInSecs < 60) return `Just now`;
  const diffInMins = Math.floor(diffInSecs / 60);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return past.toLocaleDateString();
};

import { AnimatePresence } from 'framer-motion';
import FHIRViewer from '../../components/FHIRViewer/FHIRViewer';

const RecentActivity = ({ refreshTrigger }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const keys = getStoredApiKeys();
        if (keys.length > 0) {
            const data = await fetchSubmissions(keys[0].key, 10);
            setSubmissions(data);
        }
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger]);

  return (
    <>
      <div className="glass-card rounded-3xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            Recent Patient Files
          </h3>
          <button className="text-xs text-primary hover:text-primary/80 transition-colors">View Full Archive</button>
        </div>
        
        <div className="flex-1 overflow-auto p-3 custom-scrollbar">
          {loading && submissions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                  <Activity className="animate-spin mr-2" size={16} /> Loading records...
              </div>
          ) : submissions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground/30 text-sm">
                  No records found in database
              </div>
          ) : submissions.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedSubmission(item)}
              className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${
                  item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                  item.status === 'failed' ? 'bg-red-500/10 text-red-500' : 
                  'bg-violet-500/10 text-violet-400'
                }`}>
                  {item.status === 'completed' ? <ShieldCheck size={20} /> : <AlertOctagon size={20} />}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-medium text-white group-hover:text-primary transition-colors truncate max-w-[200px]">{item.filename || 'Unknown Record'}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.patient_id}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="flex items-center gap-1"><Clock size={10}/> {formatTimeAgo(item.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                  item.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 
                  item.status === 'failed' ? 'bg-red-500/5 border-red-500/20 text-red-500' : 
                  'bg-violet-500/5 border-violet-500/20 text-violet-400'
                }`}>
                  {item.status === 'completed' && <CheckCircle2 size={12} />}
                  {item.status === 'completed' ? 'Processed' : item.status}
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedSubmission && (
          <FHIRViewer 
            data={selectedSubmission} 
            onClose={() => setSelectedSubmission(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default RecentActivity;
