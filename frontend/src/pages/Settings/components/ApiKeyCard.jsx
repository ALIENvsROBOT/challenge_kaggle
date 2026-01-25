import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Trash2, Check, Copy, EyeOff, Eye } from 'lucide-react';

const ApiKeyCard = ({ item, visibleKeyId, copiedId, onToggleVisibility, onCopy, onDelete }) => {
  return (
    <Motion.div 
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
          onClick={() => onDelete(item.id)}
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
            onClick={() => onCopy(item.key, item.id)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-white transition-colors"
            title="Copy Key"
          >
            {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <button
          onClick={() => onToggleVisibility(item.id)}
          className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
          title={visibleKeyId === item.id ? "Hide Key" : "Show Key"}
        >
          {visibleKeyId === item.id ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Motion.div>
  );
};

export default ApiKeyCard;
