import React, { useState, useEffect, useMemo } from 'react';
import { FiChevronDown, FiChevronRight, FiCheck, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import adminWorkerService from '../../../../services/adminWorkerService';

/**
 * Admin: choose which categories and services are offered in each zone.
 * Customers only see what their zone offers; workers are matched by zone too.
 */
const ZoneServices = () => {
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState('');
  const [tree, setTree] = useState([]);
  const [catIds, setCatIds] = useState(new Set());
  const [svcIds, setSvcIds] = useState(new Set());
  const [open, setOpen] = useState(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminWorkerService.getZones();
        const list = res?.data || [];
        setZones(list);
        if (list.length) setZoneId(list[0]._id);
      } catch {
        toast.error('Failed to load zones');
      }
    })();
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/admin/zone-catalog/${zoneId}`);
        const categories = data.data || [];
        setTree(categories);
        setCatIds(new Set(categories.filter((c) => c.inZone).map((c) => c._id)));
        setSvcIds(new Set(categories.flatMap((c) => c.services).filter((s) => s.inZone).map((s) => s._id)));
        setDirty(false);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load zone services');
      } finally {
        setLoading(false);
      }
    })();
  }, [zoneId]);

  const toggle = (setter, id) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setDirty(true);
  };

  const toggleOpen = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const setAll = (on) => {
    setCatIds(new Set(on ? tree.map((c) => c._id) : []));
    setSvcIds(new Set(on ? tree.flatMap((c) => c.services).map((s) => s._id) : []));
    setDirty(true);
  };

  const setCategoryWithServices = (cat, on) => {
    setCatIds((prev) => { const next = new Set(prev); on ? next.add(cat._id) : next.delete(cat._id); return next; });
    setSvcIds((prev) => {
      const next = new Set(prev);
      cat.services.forEach((s) => (on ? next.add(s._id) : next.delete(s._id)));
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await api.put(`/admin/zone-catalog/${zoneId}`, {
        categoryIds: [...catIds],
        serviceIds: [...svcIds]
      });
      toast.success(data.message || 'Saved');
      setDirty(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => tree.filter((c) => !q
    || c.title.toLowerCase().includes(q)
    || c.services.some((s) => s.title.toLowerCase().includes(q))), [tree, q]);

  const zone = zones.find((z) => z._id === zoneId);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Zone Services</h2>
        <p className="text-xs text-gray-500">
          Choose what customers see in each zone. Customers in a zone only see the categories and services ticked here.
        </p>
      </div>

      {zones.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-12 text-center text-sm text-gray-500">
          No zones yet. Create one in Zone Setup first.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {zones.map((z) => (
              <button
                key={z._id}
                type="button"
                onClick={() => (!dirty || window.confirm('Discard unsaved changes?')) && setZoneId(z._id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  z._id === zoneId ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {z.name}{z.status !== 'active' && ' (inactive)'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search category or service"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button type="button" onClick={() => setAll(true)} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">Select all</button>
            <button type="button" onClick={() => setAll(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">Clear all</button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {visible.map((cat) => {
                const catOn = catIds.has(cat._id);
                const isOpen = open.has(cat._id) || (q && cat.services.some((s) => s.title.toLowerCase().includes(q)));
                const selectedCount = cat.services.filter((s) => svcIds.has(s._id)).length;
                return (
                  <div key={cat._id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-600"
                        checked={catOn}
                        onChange={(e) => setCategoryWithServices(cat, e.target.checked)}
                      />
                      <button type="button" onClick={() => toggleOpen(cat._id)} className="flex-1 flex items-center justify-between gap-2 text-left">
                        <span className="min-w-0">
                          <b className={`text-sm ${catOn ? 'text-gray-900' : 'text-gray-400'}`}>{cat.title}</b>
                          {!cat.isActive && <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">inactive</span>}
                        </span>
                        <span className="flex items-center gap-2 text-[11px] text-gray-500 shrink-0">
                          {cat.services.length > 0 && `${selectedCount}/${cat.services.length} services`}
                          {cat.services.length > 0 && (isOpen ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />)}
                        </span>
                      </button>
                    </div>
                    {isOpen && cat.services.length > 0 && (
                      <div className="pl-12 pr-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {cat.services.map((s) => (
                          <label key={s._id} className={`flex items-center gap-2 text-xs ${catOn ? 'text-gray-700 cursor-pointer' : 'text-gray-300'}`}>
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 accent-emerald-600"
                              disabled={!catOn}
                              checked={svcIds.has(s._id)}
                              onChange={() => toggle(setSvcIds, s._id)}
                            />
                            {s.title}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {visible.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">Nothing matches.</p>}
            </div>
          )}

          <div className="sticky bottom-3 flex items-center justify-between gap-3 bg-white/95 backdrop-blur border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
            <p className="text-xs text-gray-600">
              <b>{zone?.name}</b>: {catIds.size} categor{catIds.size === 1 ? 'y' : 'ies'}, {svcIds.size} service{svcIds.size === 1 ? '' : 's'} offered
            </p>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40"
            >
              <FiCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ZoneServices;
