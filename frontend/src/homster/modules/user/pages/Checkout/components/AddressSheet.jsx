import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';

const labelFor = (address) => {
  const type = String(address.type || 'home');
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/** Bottom sheet "Choose an Address": saved addresses as radios + Add New Address. */
const AddressSheet = ({ isOpen, onClose, addresses, selectedLine, onSelect, onAddNew, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-400">Choose an Address</h2>
          <button type="button" onClick={onClose} className="text-sm font-bold" style={{ color: themeColors.button }}>
            Done
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading your addresses…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {addresses.map((a) => {
              const selected = a.addressLine1 === selectedLine;
              return (
                <li key={`${a.addressLine1}-${a.addressLine2 || ''}`}>
                  <button type="button" onClick={() => onSelect(a)} className="flex w-full items-start gap-3 py-3.5 text-left">
                    <span
                      className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: selected ? themeColors.button : '#CBD5E1' }}
                    >
                      {selected && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: themeColors.button }} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900">{labelFor(a)}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                        {[a.addressLine2, a.addressLine1].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button type="button" onClick={onAddNew} className="mt-1 flex w-full items-center gap-3 border-t border-slate-100 py-4 text-left">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2" style={{ borderColor: themeColors.button, color: themeColors.button }}>
            <FiPlus className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold" style={{ color: themeColors.button }}>Add New Address</span>
        </button>
      </div>
    </div>
  );
};

export default AddressSheet;
