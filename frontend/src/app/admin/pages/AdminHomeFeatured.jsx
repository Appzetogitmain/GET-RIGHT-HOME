import React, { useState, useEffect } from 'react';
// Admin axios client: always sends the admin token (see AdminFeaturedProperties).
import { axiosInstance as api } from '../store/adminStore';
import toast from 'react-hot-toast';
import { Search, Star, X, Building2, MapPin, Edit, Trash2, Plus } from 'lucide-react';

const LIMIT = 10;

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

const AdminHomeFeatured = () => {
  const [filter, setFilter] = useState('all'); // 'all' | 'featured'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, featuredCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [modalItem, setModalItem] = useState(null);
  const [durationDays, setDurationDays] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/home-featured', {
        params: { page, limit: LIMIT, filter, search: search || undefined, t: Date.now() }
      });
      setItems(res.data?.properties || []);
      setMeta(res.data?.meta || { total: 0, featuredCount: 0, totalPages: 1 });
    } catch (err) {
      console.error('Fetch featured properties error:', err);
      toast.error(err.response?.data?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, search]);

  const openModal = (item) => {
    setModalItem(item);
    const end = item.homeFeatured?.endDate;
    setDurationDays(end ? String(Math.max(Math.ceil((new Date(end) - Date.now()) / 86400000), 1)) : '');
    setOrder(item.homeFeatured?.order ?? 0);
  };

  const save = async (item, payload) => {
    try {
      setSaving(true);
      const res = await api.put(`/admin/home-featured/${item._id}`, payload);
      toast.success(res.data?.message || 'Saved');
      setModalItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModal = () => save(modalItem, {
    isActive: true,
    durationDays: durationDays ? parseInt(durationDays) : 0,
    order: Number(order) || 0
  });

  const handleRemove = (item) => {
    if (!window.confirm(`Remove "${item.propertyName}" from Featured Properties?`)) return;
    save(item, { isActive: false });
  };

  const isExpired = (item) => item.homeFeatured?.endDate && new Date(item.homeFeatured.endDate) <= new Date();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" /> Featured Properties
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Pick properties to show in the <b>Featured Properties</b> section on the user home screen.
            Only approved &amp; live listings are shown to users.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold whitespace-nowrap">
          {meta.featuredCount || 0} featured
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[['all', 'All Properties'], ['featured', 'Featured Only']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1); }}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${filter === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, type, city or area..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-bold">Property</th>
                <th className="p-4 font-bold">Location</th>
                <th className="p-4 font-bold">Listed By</th>
                <th className="p-4 font-bold">Featured</th>
                <th className="p-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">
                  {filter === 'featured' ? 'No featured properties yet. Switch to "All Properties" to add some.' : 'No approved properties found.'}
                </td></tr>
              ) : items.map(p => {
                const img = p.coverImage || p.propertyImages?.[0] || p.images?.[0];
                const featured = p.homeFeatured?.isActive;
                const expired = featured && isExpired(p);
                return (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Building2 size={18} className="text-slate-300" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate max-w-[220px]">{p.propertyName || 'Untitled'}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {p.propertyType || p.propertyCategory || '-'}
                            {!p.isLive && <span className="ml-2 text-red-500 font-bold normal-case">· Not live</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        {[p.address?.area, p.address?.city].filter(Boolean).join(', ') || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-700">
                      {p.partnerId?.companyName || p.partnerId?.name || p.userId?.companyName || p.userId?.name || (p.isAddedByAdmin ? 'Admin' : '-')}
                    </td>
                    <td className="p-4">
                      {featured ? (
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 border ${expired ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                            <Star size={12} className={expired ? '' : 'fill-amber-500 text-amber-500'} /> {expired ? 'Expired' : 'Featured'}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Order {p.homeFeatured.order || 0} · {p.homeFeatured.endDate ? `until ${formatDate(p.homeFeatured.endDate)}` : 'no end date'}
                          </p>
                        </div>
                      ) : <span className="text-xs text-slate-400 font-medium">Not featured</span>}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {featured ? (
                        <div className="inline-flex gap-2">
                          <button onClick={() => openModal(p)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                            <Edit size={12} /> Edit
                          </button>
                          <button onClick={() => handleRemove(p)} disabled={saving} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => openModal(p)} className="px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                          <Plus size={12} /> Add to Featured
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase">
              Total: {meta.total} (Page {page} of {meta.totalPages})
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${page === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >Previous</button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => Math.min(p + 1, meta.totalPages))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${page >= meta.totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {modalItem.homeFeatured?.isActive ? 'Edit Featured' : 'Add to Featured'}
                </h3>
                <p className="text-xs text-slate-500">{modalItem.propertyName}</p>
              </div>
              <button onClick={() => setModalItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {!modalItem.isLive && (
                <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  This listing is not live, so it won't appear on the home screen until it goes live.
                </p>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Duration (days)</label>
                <input
                  type="number" min="0" placeholder="Leave empty to feature with no end date"
                  value={durationDays} onChange={e => setDurationDays(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Counted from today. The property disappears from the section automatically when it ends.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Display order</label>
                <input
                  type="number" value={order} onChange={e => setOrder(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Lower numbers show first. Listings in the user's selected city always come before other cities.</p>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setModalItem(null)} className="px-5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200">Cancel</button>
              <button onClick={handleSaveModal} disabled={saving} className="px-5 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHomeFeatured;
