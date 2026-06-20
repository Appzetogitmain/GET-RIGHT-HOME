import React, { useState, useEffect } from 'react';
import { api } from '../../../services/apiService';
import toast from 'react-hot-toast';
import { Search, Filter, Star, Crown, Calendar, CheckCircle2, Clock, MoreVertical, X } from 'lucide-react';

const AdminFeaturedProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [planType, setPlanType] = useState('None');
  const [durationDays, setDurationDays] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/featured-properties?limit=100');
      if (res.data.success) {
        setProperties(res.data.properties);
      }
    } catch (err) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (property) => {
    setSelectedProperty(property);
    setPlanType(property.featuredDetails?.planType || 'None');
    setDurationDays(property.featuredDetails?.durationDays || '');
    setAdminNotes(property.featuredDetails?.adminNotes || '');
    setIsModalOpen(true);
  };

  const handleSaveFeatured = async () => {
    try {
      const payload = {
        isFeatured: planType !== 'None',
        planType: planType,
        durationDays: durationDays ? parseInt(durationDays) : null,
        adminNotes: adminNotes
      };

      const res = await api.put(`/admin/featured-properties/${selectedProperty._id}`, payload);
      if (res.data.success) {
        toast.success('Featured status updated!');
        setIsModalOpen(false);
        fetchProperties(); // Refresh list
      }
    } catch (err) {
      toast.error('Failed to update featured status');
    }
  };

  const getPlanBadge = (plan) => {
    switch(plan) {
      case 'Pro': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold flex items-center gap-1"><Crown size={12}/> Pro Plan</span>;
      case 'Gold': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold flex items-center gap-1"><Star size={12}/> Gold Plan</span>;
      case 'Silver': return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1"><Star size={12}/> Silver Plan</span>;
      default: return <span className="px-2 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-md text-xs font-medium">Standard</span>;
    }
  };

  const getOwnerTypeBadge = (property) => {
    if (property.isAddedByAdmin && !property.userId && !property.partnerId) {
      return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Admin (Get-Right-Home)</span>;
    }
    const role = property.userId?.role || property.partnerId?.role || 'owner';
    return <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold capitalize">{role}</span>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" /> Featured & Handpicked Properties
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage premium tags, visibility durations, and hierarchical ranking.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-semibold">Property</th>
                <th className="p-4 font-semibold">Owner / Listed By</th>
                <th className="p-4 font-semibold">Current Tag</th>
                <th className="p-4 font-semibold">Duration & Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading properties...</td></tr>
              ) : properties.map(p => (
                <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800 truncate max-w-[200px]">{p.propertyName}</p>
                    <p className="text-xs text-slate-500">{p.propertyType} • {p.transactionType}</p>
                  </td>
                  <td className="p-4">
                    {getOwnerTypeBadge(p)}
                    <p className="text-xs text-slate-600 mt-1 truncate max-w-[150px]">
                      {p.userId?.name || p.partnerId?.name || 'Get-Right-Home'}
                    </p>
                  </td>
                  <td className="p-4">
                    {getPlanBadge(p.featuredDetails?.planType)}
                  </td>
                  <td className="p-4">
                    {p.featuredDetails?.isFeatured ? (
                      <div>
                        {p.featuredDetails.durationDays ? (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><Clock size={12}/> {p.featuredDetails.durationDays} Days</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><Clock size={12}/> Infinite</span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Since: {new Date(p.featuredDetails.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Not Featured</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => handleOpenModal(p)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      Manage Tag
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Featured Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Manage Featured Tag</h3>
                <p className="text-xs text-slate-500">{selectedProperty?.propertyName}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Plan Tier</label>
                <div className="grid grid-cols-2 gap-3">
                  {['None', 'Silver', 'Gold', 'Pro'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => setPlanType(plan)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        planType === plan 
                          ? 'border-[#0073E6] bg-blue-50/50 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-800 text-sm">{plan === 'None' ? 'Remove Tag' : `${plan} Plan`}</div>
                      {plan !== 'None' && <div className="text-[10px] text-slate-500 mt-0.5">Increases ranking hierarchy</div>}
                    </button>
                  ))}
                </div>
              </div>

              {planType !== 'None' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Duration (Days)</label>
                    <input
                      type="number"
                      placeholder="Leave empty for infinite duration"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0073E6] focus:ring-1 focus:ring-[#0073E6] text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">If left empty, property will remain featured until sold or manually removed.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Admin Notes</label>
                    <textarea
                      placeholder="e.g., Paid ₹5000 for Gold Plan on 1st Jan"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0073E6] focus:ring-1 focus:ring-[#0073E6] text-sm h-20 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFeatured}
                className="px-5 py-2.5 rounded-xl bg-[#0073E6] hover:bg-blue-700 text-white font-bold transition-colors shadow-sm text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeaturedProperties;
