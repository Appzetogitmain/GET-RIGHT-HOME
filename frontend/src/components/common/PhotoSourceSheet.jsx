import React from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

/**
 * Bottom sheet that lets the user pick where a photo comes from:
 * the camera or the gallery. Used by the profile-photo pickers.
 */
const PhotoSourceSheet = ({ open, onClose, onCamera, onGallery }) => {
  if (!open) return null;

  const choose = (handler) => {
    onClose();
    handler();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Profile photo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose(onCamera)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm font-semibold text-gray-800 active:scale-95"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Camera size={22} />
            </span>
            Camera
          </button>
          <button
            type="button"
            onClick={() => choose(onGallery)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm font-semibold text-gray-800 active:scale-95"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ImageIcon size={22} />
            </span>
            Gallery
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoSourceSheet;
