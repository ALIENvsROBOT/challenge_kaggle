import React from 'react';
import { Upload, Activity } from 'lucide-react';
import StatsGrid from './StatsGrid';
import ActivityLog from './ActivityLog';
import RecentActivity from './RecentActivity';

const DashboardPage = ({ onUploadClick, isProcessing, logs, refreshTrigger }) => {
  return (
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
          onClick={onUploadClick}
          disabled={isProcessing}
          className="group relative px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-3"
        >
          <div className="absolute inset-0 bg-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {isProcessing ? <Activity className="animate-spin" size={20} /> : <Upload size={20} />}
          <span>{isProcessing ? 'Analyzing Data...' : 'Upload Patient Records'}</span>
        </button>
      </div>

      <StatsGrid />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[500px]">
        <ActivityLog logs={logs} isProcessing={isProcessing} />
        <RecentActivity refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default DashboardPage;
