import React, { useState, useEffect } from 'react';
import { api } from '../../../services/apiService';
import toast from 'react-hot-toast';
import { Search, Star, Crown, Clock, X, Plus, Edit, Trash2 } from 'lucide-react';

const AdminFeaturedProperties = () => {
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'plans'
  
  // Properties State
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('admin'); // 'admin', 'builder', 'broker_owner'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Plans State
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', color: 'amber', description: '', defaultDurationDays: 30, weight: 0 });

  // Property Manage Modal State
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('None');
  const [durationDays, setDurationDays] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchPlans();
    fetchProperties();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      console.log("Fetching plans...");
      const res = await api.get(`/admin/featured-plans?t=${new Date().getTime()}`);
      console.log("Plans response:", res.data);
      if (res.data.success) {
        setPlans(res.data.plans);
      }
    } catch (err) {
      console.error("Fetch plans error:", err);
      toast.error('Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/featured-properties?limit=500'); // Fetch enough for client-side filtering
      if (res.data.success) {
        setProperties(res.data.properties);
      }
    } catch (err) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  // --- Filtering Logic for Properties ---
  const filteredProperties = properties.filter(p => {
    // 1. Role Filtering
    let isRoleMatch = false;
    const isAddedByAdmin = p.isAddedByAdmin && !p.userId && !p.partnerId;
    const role = p.userId?.role || p.partnerId?.role || 'owner';
    
    if (roleFilter === 'admin' && isAddedByAdmin) isRoleMatch = true;
    if (roleFilter === 'builder' && role === 'builder' && !isAddedByAdmin) isRoleMatch = true;
    if (roleFilter === 'broker_owner' && (role === 'broker' || role === 'owner') && !isAddedByAdmin) isRoleMatch = true;

    if (!isRoleMatch) return false;

    // 2. Search Query Filtering (Property Name, Type, Owner Name)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const ownerName = (p.userId?.name || p.partnerId?.name || 'Get-Right-Home').toLowerCase();
      const propName = (p.propertyName || '').toLowerCase();
      const propType = (p.propertyType || '').toLowerCase();
      
      if (!propName.includes(q) && !ownerName.includes(q) && !propType.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // --- Property Manage Feature Handlers ---
  const handleOpenPropModal = (property) => {
    setSelectedProperty(property);
    setSelectedPlanId(property.featuredDetails?.planId?._id || property.featuredDetails?.planId || (property.featuredDetails?.isFeatured ? 'Standard' : 'None'));
    setDurationDays(property.featuredDetails?.durationDays || '');
    setAdminNotes(property.featuredDetails?.adminNotes || '');
    setIsPropModalOpen(true);
  };

  const handleSaveFeatured = async () => {
    try {
      const payload = {
        isFeatured: selectedPlanId !== 'None',
        planId: (selectedPlanId !== 'None' && selectedPlanId !== 'Standard') ? selectedPlanId : null,
        durationDays: durationDays ? parseInt(durationDays) : null,
        adminNotes: adminNotes
      };

      const res = await api.put(`/admin/featured-properties/${selectedProperty._id}`, payload);
      if (res.data.success) {
        toast.success('Featured status updated!');
        setIsPropModalOpen(false);
        fetchProperties();
      }
    } catch (err) {
      toast.error('Failed to update featured status');
    }
  };

  // --- Plan CRUD Handlers ---
  const handleOpenPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name, color: plan.color, description: plan.description || '', 
        defaultDurationDays: plan.defaultDurationDays || '', weight: plan.weight || 0
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: '', color: 'amber', description: '', defaultDurationDays: 30, weight: 0 });
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      if (!planForm.name) return toast.error("Plan name is required");
      if (editingPlan) {
        await api.put(`/admin/featured-plans/${editingPlan._id}`, planForm);
        toast.success("Plan updated");
      } else {
        await api.post('/admin/featured-plans', planForm);
        toast.success("Plan created");
      }
      setPlanModalOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving plan');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Delete this plan? All properties using it will revert to standard featured status.")) return;
    try {
      await api.delete(`/admin/featured-plans/${id}`);
      toast.success("Plan deleted");
      fetchPlans();
      fetchProperties();
    } catch (err) {
      toast.error('Failed to delete plan');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" /> Featured Property Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage handpicked tags and dynamic plan tiers.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
          <button 
            onClick={() => setActiveTab('properties')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'properties' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Assign Tags
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'plans' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Manage Plans
          </button>
        </div>
      </div>

      {activeTab === 'properties' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'admin', label: "Admin Listings" },
                { id: 'builder', label: "Builder Projects" },
                { id: 'broker_owner', label: "Broker & Owners" }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setRoleFilter(r.id)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${roleFilter === r.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search name, type, or owner..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-4 font-bold">Property Details</th>
                    <th className="p-4 font-bold">Listed By</th>
                    <th className="p-4 font-bold">Current Tag</th>
                    <th className="p-4 font-bold">Duration</th>
                    <th className="p-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading...</td></tr>
                  ) : filteredProperties.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">No properties found for this category.</td></tr>
                  ) : filteredProperties.map(p => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 truncate max-w-[200px]">{p.propertyName}</p>
                        <p className="text-xs text-slate-500">{p.propertyType}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-bold text-slate-800">
                          {p.userId?.name || p.partnerId?.name || 'Get-Right-Home'}
                        </p>
                      </td>
                      <td className="p-4">
                        {p.featuredDetails?.isFeatured ? (
                          <span className={`px-2 py-1 bg-${p.featuredDetails?.planId?.color || 'blue'}-100 text-${p.featuredDetails?.planId?.color || 'blue'}-700 rounded-md text-xs font-bold flex items-center gap-1 w-max`}>
                            <Star size={12}/> {p.featuredDetails.planName}
                          </span>
                        ) : <span className="text-xs text-slate-400 font-medium">Standard Listing</span>}
                      </td>
                      <td className="p-4">
                        {p.featuredDetails?.isFeatured && p.featuredDetails.durationDays ? (
                          <span className="text-xs font-bold text-emerald-600">{p.featuredDetails.durationDays} Days</span>
                        ) : p.featuredDetails?.isFeatured ? (
                          <span className="text-xs font-bold text-emerald-600">Infinite</span>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleOpenPropModal(p)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-end">
            <button 
              onClick={() => handleOpenPlanModal()}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800"
            >
              <Plus size={16} /> Create New Plan
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 bg-${plan.color}-500`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 bg-${plan.color}-100 text-${plan.color}-700 rounded-lg text-sm font-black flex items-center gap-2 w-max`}>
                    <Crown size={14} /> {plan.name}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenPlanModal(plan)} className="text-slate-400 hover:text-blue-600"><Edit size={16}/></button>
                    <button onClick={() => handleDeletePlan(plan._id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 h-10">{plan.description}</p>
                <div className="flex justify-between items-center text-xs font-bold border-t border-slate-100 pt-3">
                  <span className="text-slate-600">Default: {plan.defaultDurationDays} Days</span>
                  <span className="text-slate-600">Weight: {plan.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Tag Modal */}
      {isPropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Assign Featured Plan</h3>
                <p className="text-xs text-slate-500">{selectedProperty?.propertyName}</p>
              </div>
              <button onClick={() => setIsPropModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Select Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedPlanId('None')}
                    className={`p-3 rounded-xl border-2 text-left ${selectedPlanId === 'None' ? 'border-red-500 bg-red-50' : 'border-slate-100'}`}
                  >
                    <div className="font-bold text-sm">Remove Tag</div>
                  </button>
                  <button
                    onClick={() => { setSelectedPlanId('Standard'); setDurationDays(''); }}
                    className={`p-3 rounded-xl border-2 text-left ${selectedPlanId === 'Standard' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
                  >
                    <div className="font-bold text-sm">Standard (No Plan)</div>
                  </button>
                  {plans.map(plan => (
                    <button
                      key={plan._id}
                      onClick={() => { setSelectedPlanId(plan._id); setDurationDays(plan.defaultDurationDays); }}
                      className={`p-3 rounded-xl border-2 text-left ${selectedPlanId === plan._id ? `border-${plan.color}-500 bg-${plan.color}-50` : 'border-slate-100'}`}
                    >
                      <div className="font-bold text-sm">{plan.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              {selectedPlanId !== 'None' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Duration (Days)</label>
                    <input type="number" placeholder="Leave empty for infinite" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Admin Note</label>
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"/>
                  </div>
                </>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsPropModalOpen(false)} className="px-5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200">Cancel</button>
              <button onClick={handleSaveFeatured} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">Save Tag</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan CRUD Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h3>
              <button onClick={() => setPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Plan Name</label>
                <input type="text" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Platinum"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Color Theme (Tailwind)</label>
                <select value={planForm.color} onChange={e => setPlanForm({...planForm, color: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="slate">Slate</option>
                  <option value="amber">Gold / Amber</option>
                  <option value="purple">Purple (Pro)</option>
                  <option value="emerald">Green</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Default Duration (Days)</label>
                <input type="number" value={planForm.defaultDurationDays} onChange={e => setPlanForm({...planForm, defaultDurationDays: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sorting Weight (Higher = Top)</label>
                <input type="number" value={planForm.weight} onChange={e => setPlanForm({...planForm, weight: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                <textarea value={planForm.description} onChange={e => setPlanForm({...planForm, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"/>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setPlanModalOpen(false)} className="px-5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200">Cancel</button>
              <button onClick={handleSavePlan} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeaturedProperties;
