import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Brain, ShieldCheck, Zap } from 'lucide-react';

const STATS = [
  { label: 'Active Model', value: 'MedGemma 1.5-4b', unit: 'Google / DeepMind', icon: Brain, color: 'text-primary' },
  { label: 'Standard', value: 'HL7 FHIR R4', unit: 'Interoperability', icon: ShieldCheck, color: 'text-success' },
  { label: 'Platform', value: 'Edge Native', unit: 'Local Inference', icon: Zap, color: 'text-warning' },
];

const StatsGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {STATS.map((stat, i) => (
        <Motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-4 rounded-3xl relative overflow-hidden group hover:border-primary/30 transition-colors"
        >  
          <div className="absolute -right-6 -top-6 bg-gradient-to-br from-white/5 to-transparent w-32 h-32 rounded-full blur-2xl group-hover:bg-primary/5 transition-colors"></div>
          
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl bg-white/5 border border-white/5 shrink-0 ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            
            <div className="overflow-hidden">
              <div className="text-xl font-bold text-white tracking-tight truncate">{stat.value}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <span className="font-semibold text-white/30 uppercase tracking-tighter text-[10px]">{stat.label}:</span> 
                {stat.unit} 
              </div>
            </div>
          </div>
        </Motion.div>
      ))}
    </div>
  );
};

export default StatsGrid;
