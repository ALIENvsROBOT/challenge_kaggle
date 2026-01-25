import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

const ActivityLog = ({ logs, isProcessing }) => {
  return (
    <div className="flex flex-col bg-[#0d1117] rounded-3xl border border-white/10 shadow-2xl font-mono text-sm relative group">
      {/* Mac-style header */}
      <div className="px-5 py-4 bg-white/5 border-b border-black/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            <Terminal size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-semibold tracking-wide">System Activity Log</span>
        </div>
        <div className="flex items-center gap-4">
            {logs.length > 0 && (
                <button 
                  onClick={() => {
                    localStorage.removeItem('medgemma_activity_logs');
                    window.location.reload(); // Quickest way to clear state-linked persistence
                  }}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors uppercase font-bold"
                >
                    Clear History
                </button>
            )}
            <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {!isProcessing && logs.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground/30 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-slow"></div>
              <Terminal size={48} className="relative" />
            </div>
            <p>Waiting for import...</p>
          </div>
        )}
        <AnimatePresence>
          {[...logs].reverse().map((log, index) => (
            <Motion.div 
              key={`${log.time}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3"
            >
              <span className="text-muted-foreground/40 select-none shrink-0 font-mono text-xs pt-1 w-16">
                {log.time}
              </span>
              <span className="text-primary shrink-0">➜</span>
              <span className={`${
                  log.message.includes("Error") ? "text-destructive" : 
                  log.message.includes("Success") ? "text-success font-semibold" : 
                  "text-gray-300"
              } break-all`}>
                {log.message}
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
  );
};

export default ActivityLog;
