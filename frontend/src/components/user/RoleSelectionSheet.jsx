import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const RoleSelectionSheet = ({ isOpen, onClose, onSelect, loading }) => {
  const [selected, setSelected] = useState('owner');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Dimmed) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[100]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[101] px-6 pt-10 pb-8 shadow-2xl max-w-lg mx-auto"
          >
            {/* Pull Bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.2 bg-gray-200 rounded-full" />

            <div className="mb-6">
              <h2 className="text-[20px] font-bold text-slate-900 mb-4">Share your details to continue</h2>
              <p className="text-[13px] text-slate-500 font-medium mb-3">You are</p>
              
              <div className="flex gap-3 mb-4">
                {/* Owner Pill */}
                <button
                  onClick={() => setSelected('owner')}
                  className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all border ${
                    selected === 'owner' 
                      ? 'bg-blue-50 text-blue-600 border-blue-200' 
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  Owner
                </button>

                {/* Broker Pill */}
                <button
                  onClick={() => setSelected('broker')}
                  className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all border ${
                    selected === 'broker' 
                      ? 'bg-blue-50 text-blue-600 border-blue-200' 
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  Broker
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Please choose accurately. You won't be able to change this in the future.
              </p>
            </div>

            <button
              disabled={loading}
              onClick={() => onSelect(selected)}
              className="w-full bg-[#0078DB] text-white font-bold py-4 rounded-xl shadow-sm active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center text-[15px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Continue'
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoleSelectionSheet;
