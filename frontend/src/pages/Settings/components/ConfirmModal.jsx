import React from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const ConfirmModal = ({ show, onCancel, onConfirm }) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Motion.div 
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
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={onConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
                >
                  Yes, Replace Key
                </button>
              </div>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
