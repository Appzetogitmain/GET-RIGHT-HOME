import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Clock, Search } from 'lucide-react';
import { api } from '../../services/apiService';
import { getRecentSearches } from '../../utils/recentActivity';

/**
 * Portal-style search suggestions.
 *
 * Every suggestion is generated from inventory that actually exists
 * ("2 BHK Ready to Move Villa in Indore"), so picking one can never land on an
 * empty result page — unlike a places API, which happily suggests towns we
 * have nothing in.
 *
 * With an empty box it falls back to the user's recent searches, which is the
 * only useful thing to show before they've typed anything.
 */

const DEBOUNCE_MS = 300;

const SearchSuggestions = ({ query, open, onSelect, onClose, className = '' }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  // Lets a slow response for an older query be discarded when a newer one has
  // already been issued, so results can't arrive out of order.
  const requestIdRef = useRef(0);

  const recent = useMemo(() => (open && !query.trim() ? getRecentSearches() : []), [open, query]);

  useEffect(() => {
    const term = query.trim();

    // A new query invalidates whatever was highlighted.
    setActiveIndex((prev) => (prev === -1 ? prev : -1));

    if (!open || term.length < 2) {
      // Functional no-ops when already empty, so this doesn't schedule a
      // pointless re-render on every keystroke below the threshold.
      setSuggestions((prev) => (prev.length ? [] : prev));
      setLoading((prev) => (prev ? false : prev));
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    // Debounced so typing doesn't fire a request per keystroke.
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/properties/suggestions', { params: { q: term, limit: 12 } });
        if (requestId !== requestIdRef.current) return; // superseded
        setSuggestions(res.data?.suggestions || []);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Close when focus moves away from the box + list together.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);

  const rows = query.trim() ? suggestions : recent;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (!rows.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % rows.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? rows.length - 1 : i - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        onSelect?.(rows[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, rows, activeIndex, onSelect, onClose]);

  if (!open) return null;
  if (!loading && rows.length === 0) return null;

  const isRecent = !query.trim();

  return (
    <div
      ref={containerRef}
      className={`absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 ${className}`}
    >
      {isRecent && (
        <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
          Recent searches
        </p>
      )}

      {loading && rows.length === 0 && (
        <div className="px-4 py-3 flex items-center gap-2 text-[13px] text-gray-400">
          <Search size={14} className="animate-pulse" /> Searching…
        </div>
      )}

      <ul className="max-h-[60vh] overflow-y-auto">
        {rows.map((row, idx) => (
          <li key={`${row.label}-${idx}`}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => onSelect?.(row)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                idx === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {isRecent
                ? <Clock size={13} className="mt-0.5 text-gray-400 shrink-0" />
                : <ArrowUpRight size={13} className="mt-0.5 text-gray-400 shrink-0" />}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-gray-800 leading-snug">
                  {row.label}
                </span>
              </span>
              {typeof row.count === 'number' && (
                <span className="shrink-0 text-[10px] font-bold text-gray-400 mt-0.5">
                  {row.count}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchSuggestions;
