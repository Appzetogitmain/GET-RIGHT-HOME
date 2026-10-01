import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiUsers } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import adminWorkerService from '../../../../services/adminWorkerService';
import { categoryService } from '../../../../services/catalogService';

const EMPTY = { name: '', description: '', categoryIds: [], isActive: true };

/**
 * Admin: create worker professions (e.g. Electrician) and pick which home-service
 * categories each one covers. A worker who selects a profession only receives
 * bookings from those categories.
 */
const Professions = () => {
  const [professions, setProfessions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        adminWorkerService.getProfessions(),
        categoryService.getAll()
      ]);
      if (pRes.success) setProfessions(pRes.data || []);
      if (cRes.success) setCategories(cRes.categories || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load professions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.title || '').localeCompare(b.title || '')),
    [categories]
  );

  const openEdit = (p) => setForm({
    _id: p._id,
    name: p.name,
    description: p.description || '',
    isActive: p.isActive,
    categoryIds: (p.categoryIds || []).map((c) => c._id || c)
  });

  const toggleCategory = (id) => setForm((f) => ({
    ...f,
    categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id]
  }));

  const save = async () => {
    if (!form.name.trim()) return toast.error('Enter a profession name');
    if (form.categoryIds.length === 0) return toast.error('Assign at least one category');
    try {
      setSaving(true);
      const payload = { name: form.name, description: form.description, isActive: form.isActive, categoryIds: form.categoryIds };
      const res = form._id
        ? await adminWorkerService.updateProfession(form._id, payload)
        : await adminWorkerService.createProfession(payload);
      toast.success(res.message || 'Saved');
      setForm(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save profession');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete profession "${p.name}"? Workers who selected it will fall back to name-based category matching.`)) return;
    try {
      await adminWorkerService.deleteProfession(p._id);
      toast.success('Profession deleted');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete profession');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Professions</h2>
          <p className="text-xs text-gray-500">A worker who selects a profession only gets bookings from the categories assigned to it.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
        >
          <FiPlus className="w-4 h-4" /> New Profession
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
      ) : professions.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-12 text-center text-sm text-gray-500">
          No professions yet. Create one (e.g. Electrician) and assign its categories.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {professions.map((p) => (
            <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(p.categoryIds || []).length === 0
                  ? <span className="text-xs text-amber-600">No categories assigned</span>
                  : p.categoryIds.map((c) => (
                    <span key={c._id} className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md px-2 py-0.5">
                      {c.title}
                    </span>
                  ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <FiUsers className="w-3.5 h-3.5" /> {p.workerCount} worker{p.workerCount === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                  <button type="button" onClick={() => remove(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setForm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{form._id ? 'Edit Profession' : 'New Profession'}</h3>
              <button type="button" onClick={() => setForm(null)} className="p-1.5 rounded-full hover:bg-gray-100"><FiX className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-700">Profession name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Electrician"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Categories ({form.categoryIds.length} selected)</label>
                <div className="mt-1 border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {sortedCategories.map((c) => (
                    <label key={c._id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={form.categoryIds.includes(c._id)} onChange={() => toggleCategory(c._id)} />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active (workers can select it)
              </label>
            </div>
            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700">Cancel</button>
              <button type="button" disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                <FiCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Professions;
