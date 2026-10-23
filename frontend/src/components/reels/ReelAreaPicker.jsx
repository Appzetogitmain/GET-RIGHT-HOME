import React, { useState } from 'react';
import { MapPin, Locate, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Step 1 of the reel upload wizard: pick a preset area, use live location, or
 * type any area/city manually. Reports a plain string through onChange.
 */
export default function ReelAreaPicker({ areas, value, onChange }) {
  const [locating, setLocating] = useState(false);
  const isPreset = areas.includes(value);

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&zoom=14&addressdetails=1`
          );
          const data = await res.json();
          const a = data.address || {};
          const area = a.suburb || a.neighbourhood || a.city_district || a.town || a.village || '';
          const city = a.city || a.state_district || a.county || '';
          const label = [area, city].filter(Boolean).join(', ');
          if (!label) throw new Error('No address found');
          onChange(label);
          toast.success(`Location set: ${label}`);
        } catch {
          toast.error('Could not detect your area. Please type it manually.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === 1 ? 'Location permission denied. Please type the area manually.' : 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleLiveLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider hover:bg-blue-500/20 disabled:opacity-60 transition-all"
      >
        {locating ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
        {locating ? 'Detecting location...' : 'Use my live location'}
      </button>

      <div>
        <span className="text-[10px] text-white/55 uppercase tracking-wide block mb-2">Or type the area / city manually:</span>
        <input
          type="text"
          value={isPreset ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Indiranagar, Bengaluru"
          maxLength={80}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
        />
      </div>

      <span className="text-[10px] text-white/55 uppercase tracking-wide block">Or select the area closest to the property:</span>
      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
        {areas.map((area) => (
          <button
            key={area}
            type="button"
            onClick={() => onChange(area)}
            className={`py-3 px-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
              value === area
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
            }`}
          >
            <span>{area}</span>
            <MapPin size={11} className={value === area ? 'text-white' : 'text-neutral-500'} />
          </button>
        ))}
      </div>
    </div>
  );
}
