import React, { useState, useEffect } from 'react';
import { 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  Shield, 
  AlertTriangle,
  UserPlus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfigurationPage = () => {
  // Lazy init state from localStorage to avoid sync SetState in effect
  const [apiKeys, setApiKeys] = useState(() => {
    const savedKeys = localStorage.getItem('medgemma_api_keys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      if (keys.length > 0) return keys;
    }
    
    // Auto-generate a default key for the frontend to use immediately
    const defaultKey = {
      id: crypto.randomUUID(),
      name: 'Frontend Client',
      key: 'sk-' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      created: new Date().toISOString(),
      role: 'Internal'
    };
    localStorage.setItem('medgemma_api_keys', JSON.stringify([defaultKey]));
    return [defaultKey];
  });
  
  const [copiedId, setCopiedId] = useState(null);
  const [visibleKeyId, setVisibleKeyId] = useState(null);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);

  const handleGenerateClick = () => {
    if (apiKeys.length > 0) {
      setShowConfirmReplace(true);
    } else {
      confirmGenerateKey();
    }
  };

  const confirmGenerateKey = () => {
    const newKey = {
      id: crypto.randomUUID(),
      name: `Service Agent ${new Date().getFullYear()}`,
      key: 'sk-' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      created: new Date().toISOString(),
      role: 'Read/Write'
    };
    
    // Replace existing keys with the new one
    const updatedKeys = [newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem('medgemma_api_keys', JSON.stringify(updatedKeys));
    setShowConfirmReplace(false);
    setVisibleKeyId(newKey.id); // Show the new key briefly
    setTimeout(() => setVisibleKeyId(null), 5000); // Hide after 5s
  };

  const deleteKey = (id) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    setApiKeys(updatedKeys);
    localStorage.setItem('medgemma_api_keys', JSON.stringify(updatedKeys));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisibility = (id) => {
      setVisibleKeyId(visibleKeyId === id ? null : id);
  };

  return (
    <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar relative">
      <div className="max-w-4xl space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Configuration</h1>
          <p className="text-muted-foreground">Manage API access tokens and security settings for the MedGemma Bridge.</p>
        </div>

        {/* API Access Section */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Key size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">API Keys</h2>
                <p className="text-sm text-muted-foreground">Manage access tokens for external integrations.</p>
              </div>
            </div>
            <button 
              onClick={handleGenerateClick}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium text-sm"
            >
              <RefreshCw size={16} />
              Rotate / Generate Key
            </button>
          </div>

          <div className="space-y-4">
            {apiKeys.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-xs font-bold text-white">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{item.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{item.role}</span>
                        <span>Created: {new Date(item.created).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteKey(item.id)}
                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Revoke Key"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="relative flex items-center gap-2">
                  <div className="flex-1 bg-black/40 border border-black/50 rounded-lg py-2.5 pl-3 pr-10 font-mono text-sm text-gray-300 truncate relative">
                    {visibleKeyId === item.id ? item.key : '•'.repeat(item.key.length)}
                     <button 
                        onClick={() => copyToClipboard(item.key, item.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-white transition-colors"
                        title="Copy Key"
                    >
                        {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => toggleVisibility(item.id)}
                    className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                    title={visibleKeyId === item.id ? "Hide Key" : "Show Key"}
                  >
                    {visibleKeyId === item.id ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                No active API keys found. Generate one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Security / Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-3xl space-y-4">
             <div className="flex items-center gap-3 mb-2">
                <Shield className="text-emerald-400" size={20} />
                <h3 className="font-semibold text-white">Security Status</h3>
             </div>
             <div className="space-y-3">
                <div className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-xl">
                   <span className="text-gray-300">Encryption</span>
                   <span className="text-emerald-400 font-mono text-xs bg-emerald-400/10 px-2 py-1 rounded">AES-256</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-xl">
                   <span className="text-gray-300">Audit Logs</span>
                   <span className="text-emerald-400 font-mono text-xs bg-emerald-400/10 px-2 py-1 rounded">Enabled</span>
                </div>
             </div>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-4 border border-yellow-500/20 bg-yellow-500/5">
             <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-yellow-500" size={20} />
                <h3 className="font-semibold text-yellow-500">Production Warning</h3>
             </div>
             <p className="text-sm text-muted-foreground leading-relaxed">
                These keys grant full read/write access to the FHIR Bridge. 
                Ensure they are stored securely. Revoking a key will immediately 
                disconnect any verified sessions using it.
             </p>
          </div>
        </div>
      </div>

        {/* CONFIRMATION MODAL */}
        <AnimatePresence>
            {showConfirmReplace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                                    <AlertCircle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Replace API Key?</h3>
                            </div>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                You are about to generate a new API Key. <span className="text-white font-semibold">This will invalidate the existing key immediately.</span> Any systems using the old key will lose access.
                            </p>
                            <p className="text-sm text-white/50 bg-white/5 p-3 rounded-lg mb-6 border border-white/5">
                                Are you sure you want to proceed?
                            </p>
                            
                            <div className="flex items-center justify-end gap-3">
                                <button 
                                    onClick={() => setShowConfirmReplace(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmGenerateKey}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Yes, Replace Key
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default ConfigurationPage;
