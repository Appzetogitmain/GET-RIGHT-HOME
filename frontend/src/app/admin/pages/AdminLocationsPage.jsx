import React, { useState, useEffect } from 'react';
import {
  Globe, MapPin, Building2, Map, Plus, Pencil, Trash2,
  ChevronRight, ChevronDown, Loader2, Check, X, ToggleLeft, ToggleRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://homezoo.onrender.com/api';

const TYPE_CONFIG = {
  country:  { label: 'Country',  icon: Globe,      color: 'blue',   next: 'state' },
  state:    { label: 'State',    icon: Map,         color: 'purple', next: 'district' },
  district: { label: 'District', icon: Building2,   color: 'emerald',next: 'city' },
  city:     { label: 'City/Area',icon: MapPin,      color: 'orange', next: null }
};

const colorClass = {
  blue:    { bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',    border: 'border-blue-200' },
  purple:  { bg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  emerald: { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  orange:  { bg: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' }
};

const authHeader = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

const api = {
  get: async (url) => { const r = await fetch(url, { headers: authHeader() }); return r.json(); },
  post: async (url, body) => { const r = await fetch(url, { method: 'POST', headers: authHeader(), body: JSON.stringify(body) }); return r.json(); },
  put: async (url, body) => { const r = await fetch(url, { method: 'PUT', headers: authHeader(), body: JSON.stringify(body) }); return r.json(); },
  patch: async (url) => { const r = await fetch(url, { method: 'PATCH', headers: authHeader() }); return r.json(); },
  delete: async (url) => { const r = await fetch(url, { method: 'DELETE', headers: authHeader() }); return r.json(); }
};

/* ─── Add / Edit Modal ─── */
const LocationModal = ({ type, parentId, parentName, editItem, onClose, onSave }) => {
  const [name, setName] = useState(editItem?.name || '');
  const [sortOrder, setSortOrder] = useState(editItem?.sortOrder || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      let res;
      if (editItem) {
        res = await api.put(`${API_BASE}/locations/${editItem._id}`, { name, sortOrder });
      } else {
        res = await api.post(`${API_BASE}/locations`, { name, type, parentId: parentId || null, sortOrder });
      }
      if (res.success) { onSave(res.data); onClose(); }
      else setError(res.message || 'Failed to save');
    } catch (e) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl ${colorClass[cfg.color].bg} flex items-center justify-center`}>
            <Icon size={20} className={`text-${cfg.color}-600`} />
          </div>
          <div>
            <h3 className="font-black text-gray-900">{editItem ? 'Edit' : 'Add'} {cfg.label}</h3>
            {parentName && <p className="text-xs text-gray-400">Under: {parentName}</p>}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{cfg.label} Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={`e.g. ${type === 'country' ? 'India' : type === 'state' ? 'Karnataka' : type === 'district' ? 'Bengaluru Urban' : 'Bengaluru South'}`}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {editItem ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Location Row ─── */
const LocationRow = ({ item, type, onEdit, onToggle, onDelete, onAddChild }) => {
  const cfg = TYPE_CONFIG[type];
  const cl = colorClass[cfg.color];

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${cl.badge}`}>{cfg.label}</span>
        <span className="text-sm font-semibold text-gray-800 truncate">{item.name}</span>
        {!item.isActive && <span className="text-[10px] text-red-500 font-bold">INACTIVE</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {cfg.next && (
          <button
            onClick={() => onAddChild(item)}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            title={`Add ${TYPE_CONFIG[cfg.next].label}`}
          >
            <Plus size={14} />
          </button>
        )}
        <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
          <Pencil size={14} />
        </button>
        <button onClick={() => onToggle(item)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Toggle Active">
          {item.isActive ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
        </button>
        <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const AdminLocationsPage = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null); // { type, parentId, parentName, editItem }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchTree = async () => {
    setLoading(true);
    const res = await api.get(`${API_BASE}/locations/tree`);
    if (res.success) setTree(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchTree(); }, []);

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleToggle = async (item) => {
    await api.patch(`${API_BASE}/locations/${item._id}/toggle`);
    fetchTree();
  };

  const handleDelete = async (item) => {
    if (!confirmDelete || confirmDelete._id !== item._id) {
      setConfirmDelete(item);
      return;
    }
    await api.delete(`${API_BASE}/locations/${item._id}`);
    setConfirmDelete(null);
    fetchTree();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Location Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage Country → State → District → City/Area hierarchy</p>
        </div>
        <button
          onClick={() => setModal({ type: 'country', parentId: null, parentName: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Add Country
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <span key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${colorClass[cfg.color].badge}`}>
              <Icon size={11} />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Confirm Delete Banner */}
      {confirmDelete && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-sm font-semibold text-red-700">
            Deactivate "{confirmDelete.name}" and all its children?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white">Confirm</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-20">
          <Globe size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold">No locations yet.</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Country" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tree.map(country => (
            <div key={country._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Country Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50/50 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpand(`c_${country._id}`)} className="text-blue-500">
                    {expanded[`c_${country._id}`] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <Globe size={16} className="text-blue-600" />
                  <span className="font-black text-gray-900">{country.name}</span>
                  <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{country.states?.length || 0} states</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setModal({ type: 'state', parentId: country._id, parentName: country.name })}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                    <Plus size={12} /> Add State
                  </button>
                  <button onClick={() => setModal({ type: 'country', parentId: null, parentName: null, editItem: country })}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100"><Pencil size={14} /></button>
                </div>
              </div>

              {/* States */}
              {expanded[`c_${country._id}`] && (
                <div className="pl-4">
                  {country.states?.map(state => (
                    <div key={state._id}>
                      {/* State Row */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleExpand(`s_${state._id}`)} className="text-purple-400">
                            {expanded[`s_${state._id}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <Map size={14} className="text-purple-500" />
                          <span className="font-bold text-sm text-gray-800">{state.name}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">{state.districts?.length || 0} districts</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal({ type: 'district', parentId: state._id, parentName: `${country.name} > ${state.name}` })}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                            <Plus size={11} /> District
                          </button>
                          <button onClick={() => setModal({ type: 'state', parentId: country._id, parentName: country.name, editItem: state })}
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"><Pencil size={13} /></button>
                        </div>
                      </div>

                      {/* Districts */}
                      {expanded[`s_${state._id}`] && (
                        <div className="pl-6">
                          {state.districts?.map(district => (
                            <div key={district._id}>
                              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => toggleExpand(`d_${district._id}`)} className="text-emerald-400">
                                    {expanded[`d_${district._id}`] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                  </button>
                                  <Building2 size={13} className="text-emerald-500" />
                                  <span className="font-semibold text-sm text-gray-800">{district.name}</span>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{district.cities?.length || 0} areas</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setModal({ type: 'city', parentId: district._id, parentName: district.name })}
                                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg">
                                    <Plus size={11} /> Area
                                  </button>
                                  <button onClick={() => setModal({ type: 'district', parentId: state._id, parentName: state.name, editItem: district })}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"><Pencil size={13} /></button>
                                </div>
                              </div>

                              {/* Cities */}
                              {expanded[`d_${district._id}`] && (
                                <div className="pl-6 bg-orange-50/30">
                                  {district.cities?.length === 0 && (
                                    <p className="px-6 py-3 text-xs text-gray-400 italic">No areas yet</p>
                                  )}
                                  {district.cities?.map(city => (
                                    <LocationRow
                                      key={city._id}
                                      item={city}
                                      type="city"
                                      onEdit={(item) => setModal({ type: 'city', parentId: district._id, parentName: district.name, editItem: item })}
                                      onToggle={handleToggle}
                                      onDelete={handleDelete}
                                      onAddChild={() => {}}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          {state.districts?.length === 0 && (
                            <p className="px-6 py-3 text-xs text-gray-400 italic">No districts yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {country.states?.length === 0 && (
                    <p className="px-6 py-3 text-xs text-gray-400 italic">No states yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <LocationModal
          type={modal.type}
          parentId={modal.parentId}
          parentName={modal.parentName}
          editItem={modal.editItem}
          onClose={() => setModal(null)}
          onSave={() => fetchTree()}
        />
      )}
    </div>
  );
};

export default AdminLocationsPage;
