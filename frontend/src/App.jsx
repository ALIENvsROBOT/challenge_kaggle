import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import UploadModal from './components/UploadModal';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ConfigurationPage from './pages/Settings/ConfigurationPage';
import { ingestMedicalRecord, autoProvisionApiKey } from './services/api';

/**
 * MedGemma Bridge - Main Application Component
 */
function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Persistent Logs Logic
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('medgemma_activity_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('medgemma_activity_logs', JSON.stringify(logs));
  }, [logs]);

  const log = (msg) => {
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    setLogs(prev => {
        // Keep only last 50 logs to prevent localStorage fill-up
        const updated = [...prev, { message: msg, time }];
        return updated.slice(-50);
    });
  };

  const handleStartProcess = async (patientId, files) => {
    setShowUploadModal(false);
    setIsProcessing(true);

    // Get or Provision API Key
    const activeKeyObj = autoProvisionApiKey();
    const activeKey = activeKeyObj.key;
    
    if (activeKeyObj.name === 'Auto-Generated Demo Key') {
        log("System: Auto-provisioned new API Access Key.");
    }

    try {
        log(`Initializing secure session for Patient: ${patientId}...`);
        
        if (files.length === 0) {
             throw new Error("No files selected");
        }
        
        log(`Uploading file: ${files[0].name} (${(files[0].size/1024).toFixed(1)} KB)...`);
        
        const result = await ingestMedicalRecord(patientId, files[0], activeKey);
        
        log(`Success: Bundle ${result.submission_id.slice(0,8)} processed.`);
        if (result.db_persisted) {
            log("PostgreSQL: Data successfully committed to DB.");
        }
        log(`Patient ID: ${result.patient_id} updated.`);
        
        // Trigger data refresh in dashboard
        setRefreshTrigger(prev => prev + 1);

    } catch (error) {
        log(`Critical Error: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans relative">
      <UploadModal 
        show={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
        onStartProcess={handleStartProcess} 
      />

      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

        <Header time={time} />

        {activeNav === 'settings' ? (
           <ConfigurationPage />
        ) : (
          <DashboardPage 
            onUploadClick={() => setShowUploadModal(true)} 
            isProcessing={isProcessing} 
            logs={logs} 
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>
    </div>
  );
}

export default App;
