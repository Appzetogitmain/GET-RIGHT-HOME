import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Pencil, PlusCircle, Trash2, Eye, AlertCircle, Lock, PhoneCall, MessageCircle } from 'lucide-react';
import { propertyService, legalService } from '../../../services/apiService';
import subscriptionService from '../../../services/subscriptionService';
import PartnerHeader from '../components/PartnerHeader';
import { toast } from 'react-hot-toast';

const PartnerProperties = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertiesByType, setPropertiesByType] = useState({});
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [registrationDate, setRegistrationDate] = useState(null);
  const [trialSettings, setTrialSettings] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [adminContact, setAdminContact] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBuilder = user.userType === 'builder' || user.role === 'builder';

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyService.getMy();
      const grouped = {};
      (res.properties || []).forEach(p => {
        const type = p.propertyType || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
      });
      setPropertiesByType(grouped);
    } catch (e) {
      setError(e?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const [subData, trialData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getTrialSettings()
      ]);

      if (subData.success) {
        setSubscription(subData.subscription);
        setRegistrationDate(subData.createdAt || subData.partnerSince || null);
      }
      if (trialData.success) {
        setTrialSettings(trialData);
      }
    } catch (e) {
      console.error('Failed to fetch subscription or trial settings:', e);
    }
  };

  const fetchAdminContact = async () => {
    try {
      const res = await legalService.getAdminContact();
      if (res && res.success) {
        setAdminContact(res);
      }
    } catch (e) {
      console.error('Failed to fetch admin contact', e);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchSubscription();
    if (isBuilder) {
      fetchAdminContact();
    }
  }, []);

  const checkSubscriptionLimit = () => {
    // Check if subscription exists and is active
    const isSubActive =
      subscription?.status === 'active' &&
      subscription?.expiryDate &&
      new Date(subscription.expiryDate) > new Date();

    const trialDurationDays = trialSettings?.freeTrialDurationDays || 30;
    const partnerRegDate = registrationDate ? new Date(registrationDate) : new Date();
    const trialEndDate = new Date(partnerRegDate);
    trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);
    const isTrialActive = new Date() <= trialEndDate;

    if (!isSubActive && !isTrialActive) {
      toast.error("Your subscription / trial has expired. Please subscribe to continue.");
      setShowSubscriptionModal(true);
      return false;
    }

    // Check property limit
    const totalProperties = Object.values(propertiesByType).reduce((sum, list) => sum + list.length, 0);
    const maxAllowed = isSubActive
      ? (subscription?.planId?.maxProperties || 0)
      : (trialSettings?.freeTrialListingLimit || 10);

    if (totalProperties >= maxAllowed) {
      if (isSubActive) {
        toast.error(`Property limit reached! Your plan allows ${maxAllowed} properties.`);
      } else {
        toast.error(`Free trial limit reached! You can add up to ${maxAllowed} properties during trial.`);
      }
      setShowSubscriptionModal(true);
      return false;
    }

    return true;
  };

  const handleAddProperty = () => {
    if (!checkSubscriptionLimit()) return;
    navigate('/hotel/join');
  };

  const handleEditProperty = (property) => {
    if (property.propertyType === 'hotel') {
      navigate('/hotel/join-hotel', { state: { property } });
    } else if (property.propertyType === 'villa') {
      navigate('/hotel/join-villa', { state: { property } });
    } else if (property.propertyType === 'hostel') {
      navigate('/hotel/join-hostel', { state: { property } });
    } else if (property.propertyType === 'pg') {
      navigate('/hotel/join-pg', { state: { property } });
    } else if (property.propertyType === 'resort') {
      navigate('/hotel/join-resort', { state: { property } });
    } else if (property.propertyType === 'homestay') {
      navigate('/hotel/join-homestay', { state: { property } });
    } else if (property.propertyType === 'tent') {
      navigate('/hotel/join-hotel', { state: { property } });
    } else if (property.dynamicCategory) {
      const catId = typeof property.dynamicCategory === 'object' ? property.dynamicCategory._id : property.dynamicCategory;
      navigate(`/hotel/wizard/${catId}`, { state: { property, categoryName: property.dynamicCategory?.displayName } });
    }
  };

  const handleViewDetails = (property) => {
    navigate(`/hotel/properties/${property._id}`);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      await propertyService.delete(propertyToDelete._id);

      // Update local state without refetching
      const updatedGroups = { ...propertiesByType };
      const type = propertyToDelete.propertyType || 'other';
      if (updatedGroups[type]) {
        updatedGroups[type] = updatedGroups[type].filter(p => p._id !== propertyToDelete._id);
        if (updatedGroups[type].length === 0) {
          delete updatedGroups[type];
        }
      }
      setPropertiesByType(updatedGroups);
      setPropertyToDelete(null);
    } catch (e) {
      setError(e?.message || 'Failed to delete property');
    } finally {
      setIsDeleting(false);
    }
  };

  const sections = Object.entries(propertiesByType);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PartnerHeader title="My Properties" subtitle="Manage your listings by property type" />

      <div className="px-4 pt-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} /> Your Listings
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddProperty}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004F4D] text-white text-[11px] font-bold uppercase tracking-wide active:scale-95"
            >
              <PlusCircle size={14} /> Add New
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-xs text-gray-500">Loading properties...</p>
        )}

        {!loading && sections.length === 0 && (
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>No properties found. Start by adding your first property.</p>
          </div>
        )}

        <div className="space-y-6">
          {sections.map(([type, list]) => (
            <div key={type} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    {list[0]?.dynamicCategory?.displayName || type.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-gray-500">{list.length} {list.length === 1 ? 'property' : 'properties'}</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {list.map(property => (
                  <div key={property._id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {property.coverImage ? (
                        <img
                          src={property.coverImage}
                          alt={property.propertyName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {property.propertyName}
                          </p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                            <span>
                              {property.address?.city || 'Unknown City'}, {property.address?.state || ''}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${property.status === 'pending' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                            {property.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] text-gray-400 line-clamp-2">
                          {property.shortDescription || 'No short description'}
                        </p>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleViewDetails(property)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-700 text-[10px] font-bold uppercase border border-gray-200"
                          >
                            <Eye size={11} /> Details
                          </button>
                          <button
                            onClick={() => handleEditProperty(property)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase border border-teal-100"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPropertyToDelete(property)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Builder Pending Project Banner */}
                      {isBuilder && property.status === 'pending' && (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-blue-900">Project Pending Approval</p>
                              <p className="text-[10px] text-blue-700 mt-0.5">For project approval and lead packages, connect with our support team.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/${adminContact?.whatsapp?.replace(/\D/g, '') || '916304471791'}?text=Hi, I want to discuss my pending project: ${property.propertyName}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-[10px] font-bold hover:bg-[#20bd5a] transition-colors"
                            >
                              <MessageCircle size={12} /> WhatsApp
                            </a>
                            <a
                              href={`tel:${adminContact?.phone || '+916304471791'}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors"
                            >
                              <PhoneCall size={12} /> Call Support
                            </a>
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {propertyToDelete && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm transition-opacity" onClick={() => setPropertyToDelete(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-full max-w-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Property?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete <span className="font-bold text-gray-800">{propertyToDelete.propertyName}</span>? This action cannot be undone and will delete all associated rooms and data.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPropertyToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProperty}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm transition-opacity" onClick={() => setShowSubscriptionModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-full max-w-md px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Subscription Required</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {(() => {
                    const isSubActive =
                      subscription?.status === 'active' &&
                      subscription?.expiryDate &&
                      new Date(subscription.expiryDate) > new Date();

                    const trialDurationDays = trialSettings?.freeTrialDurationDays || 30;
                    const partnerRegDate = registrationDate ? new Date(registrationDate) : new Date();
                    const trialEndDate = new Date(partnerRegDate);
                    trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);
                    const isTrialActive = new Date() <= trialEndDate;

                    if (isSubActive) {
                      return `You've reached your plan's property limit (${subscription?.planId?.maxProperties || 0} properties). Upgrade your plan to add more properties.`;
                    } else if (isTrialActive) {
                      return `You've reached your free trial property limit (${trialSettings?.freeTrialListingLimit || 10} properties). Subscribe to a plan to list more properties.`;
                    } else {
                      return "Your free trial has expired and you do not have an active subscription. Choose a plan to list your properties.";
                    }
                  })()}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowSubscriptionModal(false);
                      navigate('/hotel/subscriptions');
                    }}
                    className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
                  >
                    View Subscription Plans
                  </button>
                  <button
                    onClick={() => setShowSubscriptionModal(false)}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerProperties;
