import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

const SecuritySection = () => {
  return (
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
  );
};

export default SecuritySection;
