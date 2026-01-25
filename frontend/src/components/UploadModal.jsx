import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Upload, User, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const UploadModal = ({ show, onClose, onStartProcess }) => {
  const [patientId, setPatientId] = useState('');
  const [files, setFiles] = useState([]);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      setFiles(prev => {
        const combined = [...prev, ...acceptedFiles];
        if (combined.length > 8) {
          alert("Maximum 8 images allowed per session.");
          return combined.slice(0, 8);
        }
        return combined;
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true
  });

  const removeFile = (index, e) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onStartProcess(patientId, files);
    setPatientId('');
    setFiles([]);
  };

  return (
    <AnimatePresence>
      {show && (
        <Motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <Motion.div 
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            style={{ boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
          >
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-white">Upload Patient Records</h3>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-white transition-colors p-1"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">Clinical Image/ Prescription</label>
                
                <div 
                  {...getRootProps()}
                  className={`flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all group p-4 relative overflow-hidden outline-none ${
                      isDragActive 
                      ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl' 
                      : 'border-white/10 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <input {...getInputProps()} />
                  
                  {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-2 pb-3 pointer-events-none">
                      <Upload className={`w-8 h-8 mb-3 transition-colors ${isDragActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary'}`} />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Images only (JPG, PNG, WEBP) • Max 8 files
                      </p>
                    </div>
                  ) : (
                     <div className="grid grid-cols-2 gap-3 w-full">
                        {files.map((f, i) => (
                           <div key={i} className="relative group/file bg-black/40 rounded-lg p-2 flex items-center gap-3 border border-white/5">
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
                        <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                           <span className="text-2xl text-muted-foreground/50">+</span>
                        </div>
                     </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleSubmit}
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
  );
};

export default UploadModal;
