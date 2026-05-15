import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, Pencil, PlusCircle, Trash2, 
  Eye, AlertCircle, ArrowLeft, Plus, LayoutGrid, 
  Search, Clock, CheckCircle2, Timer
} from 'lucide-react';
import { propertyService } from '../../services/apiService';
import { toast } from 'react-hot-toast';

const MyProperties = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyService.getMy();
      setProperties(res.properties || []);
    } catch (e) {
      setError(e?.message || 'Failed to load properties');
      toast.error('Could not fetch your properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAddProperty = () => {
    navigate('/list-property');
  };

  const handleEditProperty = (property) => {
    const state = { property };
    const type = property.propertyType?.toLowerCase();
    
    if (type === 'hotel') navigate(`/list-property/join-hotel/${property._id}`, { state });
    else if (type === 'villa') navigate(`/list-property/join-villa/${property._id}`, { state });
    else if (type === 'hostel') navigate(`/list-property/join-hostel/${property._id}`, { state });
    else if (type === 'pg') navigate(`/list-property/join-pg/${property._id}`, { state });
    else if (type === 'resort') navigate(`/list-property/join-resort/${property._id}`, { state });
    else if (type === 'homestay') navigate(`/list-property/join-homestay/${property._id}`, { state });
    else if (property.dynamicCategory) {
        const catId = typeof property.dynamicCategory === 'object' ? property.dynamicCategory._id : property.dynamicCategory;
        navigate(`/list-property/wizard/${catId}/${property._id}`, { state });
    }
  };

  const handleViewDetails = (property) => {
    navigate(`/my-property-dashboard/${property._id}`);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      await propertyService.delete(propertyToDelete._id);
      setProperties(properties.filter(p => p._id !== propertyToDelete._id));
      setPropertyToDelete(null);
      toast.success('Property deleted successfully');
    } catch (e) {
      toast.error(e?.message || 'Failed to delete property');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProperties = properties.filter(p => 
    p.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address?.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 pt-safe-top">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">My Properties</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Manage your listings
              </p>
            </div>
          </div>
          <button
            onClick={handleAddProperty}
            className="p-2 bg-gray-900 text-white rounded-xl shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search your listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-3xl text-sm font-bold shadow-sm outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
          />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Listings</p>
            <p className="text-2xl font-black text-gray-900">{properties.length}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Live Now</p>
            <p className="text-2xl font-black text-emerald-600">
              {properties.filter(p => p.status === 'approved' && p.isLive).length}
            </p>
          </div>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Property List</h2>
            <LayoutGrid size={16} className="text-gray-400" />
          </div>

          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-100 rounded-[2rem] animate-pulse" />
            ))
          ) : filteredProperties.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredProperties.map((property, idx) => (
                <motion.div
                  key={property._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm group"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-gray-50 overflow-hidden relative shrink-0">
                      {property.coverImage ? (
                        <img src={property.coverImage} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                          <Building2 size={24} />
                        </div>
                      )}
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider backdrop-blur-md border ${getStatusColor(property.status)}`}>
                        {property.status}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="text-sm font-black text-gray-900 truncate mb-0.5">{property.propertyName}</h3>
                      <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mb-2">
                        <MapPin size={10} /> {property.address?.city}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {property.status === 'pending' ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black border border-amber-100">
                            <Timer size={10} /> UNDER REVIEW
                          </div>
                        ) : property.status === 'approved' ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black border border-emerald-100">
                            <CheckCircle2 size={10} /> VERIFIED
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditProperty(property)}
                        className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => setPropertyToDelete(property)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleViewDetails(property)}
                      className="px-5 py-2.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Building2 size={32} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">No Properties Yet</h3>
              <p className="text-xs font-medium text-gray-400 max-w-[200px] leading-relaxed mb-8">
                List your house, PG or villa and start earning today.
              </p>
              <button 
                onClick={handleAddProperty}
                className="px-8 py-4 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-gray-200 active:scale-95 transition-all"
              >
                Start Listing Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPropertyToDelete(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12 translate-x-4 -translate-y-4">
              <Trash2 size={120} />
            </div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Delete Listing?</h3>
              <p className="text-xs font-medium text-gray-400 leading-relaxed mb-8">
                Are you sure you want to delete <span className="text-gray-900 font-bold">"{propertyToDelete.propertyName}"</span>? This action is permanent.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPropertyToDelete(null)}
                  className="py-4 bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteProperty}
                  disabled={isDeleting}
                  className="py-4 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-all flex items-center justify-center"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyProperties;
