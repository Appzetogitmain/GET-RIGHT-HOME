import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSearch, FiCheck, FiUser, FiMapPin, FiPhone,
  FiStar, FiAlertCircle, FiCheckCircle, FiShield, FiTag, FiZap
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import adminWorkerService from '../../../../../services/adminWorkerService';
import { adminBookingService } from '../../../../../services/adminBookingService';

const AssignWorkerModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [activeTab, setActiveTab] = useState('zone'); // 'zone' | 'all' (mobile tab toggle)

  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
    } else {
      setSearch('');
      setWorkers([]);
      setActiveTab('zone');
    }
  }, [isOpen]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await adminWorkerService.getAllWorkers({ approvalStatus: 'approved' });
      if (res.success) {
        setWorkers(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching workers', error);
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (workerId) => {
    try {
      setAssigningId(workerId);
      const res = await adminBookingService.assignWorker(booking._id, workerId);
      if (res.success) {
        toast.success(res.message || 'Worker assigned successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to assign worker');
    } finally {
      setAssigningId(null);
    }
  };

  // Resolve target zone identifier and name from booking
  const bookingZoneId = useMemo(() => {
    if (!booking) return null;
    if (booking.zoneId?._id) return String(booking.zoneId._id);
    if (typeof booking.zoneId === 'string') return booking.zoneId;
    return null;
  }, [booking]);

  const bookingZoneName = useMemo(() => {
    if (!booking) return '';
    if (booking.zoneName) return booking.zoneName;
    if (booking.zoneId && typeof booking.zoneId === 'object' && booking.zoneId.name) {
      return booking.zoneId.name;
    }
    if (booking.address?.city) return booking.address.city;
    if (booking.customerLocation?.city) return booking.customerLocation.city;
    return '';
  }, [booking]);

  // Check if a worker belongs to the booking's zone
  const isWorkerInZone = (worker) => {
    if (!bookingZoneId && !bookingZoneName) return false;
    const targetName = bookingZoneName.toLowerCase().trim();

    // 1. Check zoneIds array by ID
    if (bookingZoneId && Array.isArray(worker.zoneIds)) {
      const matchId = worker.zoneIds.some(z => {
        const zid = z?._id ? String(z._id) : String(z);
        return zid === String(bookingZoneId);
      });
      if (matchId) return true;
    }

    // 2. Check zoneIds array by populated zone name
    if (targetName && Array.isArray(worker.zoneIds)) {
      const matchName = worker.zoneIds.some(z => {
        if (typeof z === 'object' && z?.name) {
          return z.name.toLowerCase().trim() === targetName;
        }
        return false;
      });
      if (matchName) return true;
    }

    // 3. Check worker.zones string array
    if (targetName && Array.isArray(worker.zones)) {
      const matchName = worker.zones.some(z =>
        typeof z === 'string' && z.toLowerCase().trim() === targetName
      );
      if (matchName) return true;
    }

    // 4. Check worker.address.city
    if (targetName && worker.address?.city) {
      if (worker.address.city.toLowerCase().trim() === targetName) {
        return true;
      }
    }

    // 5. Check if booking address city matches worker address city
    if (booking?.address?.city && worker.address?.city) {
      if (booking.address.city.toLowerCase().trim() === worker.address.city.toLowerCase().trim()) {
        return true;
      }
    }

    return false;
  };

  // Check if worker category matches booking serviceCategory
  const isCategoryMatch = (worker) => {
    if (!booking?.serviceCategory) return false;
    const targetCategory = booking.serviceCategory.toLowerCase().trim();
    return (worker.serviceCategories || []).some(cat =>
      cat && (cat.toLowerCase().trim().includes(targetCategory) || targetCategory.includes(cat.toLowerCase().trim()))
    );
  };

  // Helper to sort: category match first, then online status, then name
  const sortWorkerList = (list) => {
    return [...list].sort((a, b) => {
      const aCat = isCategoryMatch(a) ? 1 : 0;
      const bCat = isCategoryMatch(b) ? 1 : 0;
      if (bCat !== aCat) return bCat - aCat;

      const aOnline = (a.isOnline || a.status === 'ONLINE' || a.status === 'online') ? 1 : 0;
      const bOnline = (b.isOnline || b.status === 'ONLINE' || b.status === 'online') ? 1 : 0;
      if (bOnline !== aOnline) return bOnline - aOnline;

      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // Filter workers based on search term
  const filteredAll = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return workers;
    return workers.filter(w => {
      const name = (w.name || '').toLowerCase();
      const phone = (w.phone || '').toLowerCase();
      const city = (w.address?.city || '').toLowerCase();
      const cats = (w.serviceCategories || []).join(' ').toLowerCase();
      const zones = (w.zones || []).join(' ').toLowerCase();
      return name.includes(q) || phone.includes(q) || city.includes(q) || cats.includes(q) || zones.includes(q);
    });
  }, [workers, search]);

  // Separate into Zone workers and All workers
  const zoneWorkers = useMemo(() => {
    const inZone = filteredAll.filter(w => isWorkerInZone(w));
    return sortWorkerList(inZone);
  }, [filteredAll, bookingZoneId, bookingZoneName]);

  const allWorkers = useMemo(() => {
    return sortWorkerList(filteredAll);
  }, [filteredAll]);

  // Render a worker card
  const renderWorkerCard = (worker, isInZoneList = false) => {
    const id = worker._id || worker.id;
    const catMatch = isCategoryMatch(worker);
    const inZone = isWorkerInZone(worker);
    const isOnline = worker.isOnline || worker.status === 'ONLINE' || worker.status === 'online';
    const city = worker.address?.city || (worker.zones && worker.zones[0]) || 'City N/A';
    const categoriesStr = (worker.serviceCategories || []).join(', ') || 'General';

    return (
      <div
        key={id}
        className={`p-3 rounded-xl border transition-all hover:shadow-sm ${
          catMatch
            ? 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Avatar & Info */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="relative shrink-0 mt-0.5">
              {worker.profilePhoto ? (
                <img
                  src={worker.profilePhoto}
                  alt={worker.name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                  catMatch ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {worker.name ? worker.name.charAt(0).toUpperCase() : <FiUser className="w-4 h-4" />}
                </div>
              )}
              {/* Online pulse indicator */}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-bold text-gray-900 truncate">{worker.name}</h4>
                {worker.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 rounded">
                    <FiStar className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    {worker.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                {worker.phone && (
                  <span className="flex items-center gap-1">
                    <FiPhone className="w-2.5 h-2.5 text-gray-400" />
                    {worker.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 truncate">
                  <FiMapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                  {city}
                </span>
              </div>

              <p className="text-[10px] text-gray-600 mt-1 line-clamp-1" title={categoriesStr}>
                <span className="font-semibold text-gray-700">Skills:</span> {categoriesStr}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {catMatch && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                    <FiCheck className="w-2.5 h-2.5" /> Category Match
                  </span>
                )}
                {!isInZoneList && inZone && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded">
                    <FiMapPin className="w-2.5 h-2.5" /> In Booking Zone
                  </span>
                )}
                {isOnline ? (
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded">
                    Online
                  </span>
                ) : (
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded">
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Assign Button */}
          <button
            type="button"
            onClick={() => handleAssign(id)}
            disabled={assigningId === id}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              assigningId === id
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 active:scale-95'
            }`}
          >
            {assigningId === id ? (
              <>
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <FiCheck className="w-3.5 h-3.5" /> Assign
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const isManualRequired =
    booking?.status === 'manual_assignment_required' ||
    booking?.assignmentStatus === 'manual_assignment_required' ||
    booking?.rejectionReason;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] max-w-5xl bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">Assign Worker Manually</h2>
                    {booking?.bookingType === 'instant' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white flex items-center gap-1">
                        <FiZap className="w-3 h-3" /> Instant
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">
                        📅 Scheduled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                    <span>
                      Booking <span className="font-bold text-gray-900">#{booking?.bookingNumber || booking?._id?.slice(-6).toUpperCase()}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Category: <span className="font-semibold text-blue-600">{booking?.serviceCategory || 'Service'}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-gray-700 font-medium">
                      <FiMapPin className="w-3.5 h-3.5 text-rose-500" />
                      Target Zone: <span className="font-bold text-gray-900">{bookingZoneName || 'Not Set'}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Rejection / Escalation Alert Banner */}
              {isManualRequired && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                  <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Manual Assignment Required: </span>
                    {booking.rejectionReason ? (
                      <span>Worker rejected with reason: <span className="italic font-medium">"{booking.rejectionReason}"</span>. Please assign another worker or platform vendor below.</span>
                    ) : (
                      <span>No worker accepted the initial dispatch or job was rejected. Please assign an available worker or vendor directly.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative mt-3">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search workers by name, phone, city, or skill category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                />
              </div>

              {/* Mobile View Tab Switcher */}
              <div className="flex md:hidden items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('zone')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'zone'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <FiMapPin className="w-3.5 h-3.5" />
                  In-Zone ({zoneWorkers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <FiUser className="w-3.5 h-3.5" />
                  All Vendors ({allWorkers.length})
                </button>
              </div>
            </div>

            {/* Split Content Area */}
            <div className="p-4 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs font-medium">Loading approved workers...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  {/* LEFT COLUMN: In-Zone Workers */}
                  <div
                    className={`flex flex-col rounded-xl border border-blue-100 bg-blue-50/20 overflow-hidden ${
                      activeTab !== 'zone' ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    {/* Column Header */}
                    <div className="p-3 bg-gradient-to-r from-blue-100/60 to-indigo-100/40 border-b border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs">
                          <FiMapPin className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900">
                            {bookingZoneName ? `${bookingZoneName} Zone Workers` : 'In-Zone Workers'}
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            Workers registered or located in this booking's zone
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                        {zoneWorkers.length}
                      </span>
                    </div>

                    {/* Worker List */}
                    <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[50vh] md:max-h-[55vh]">
                      {zoneWorkers.length === 0 ? (
                        <div className="text-center py-10 px-4">
                          <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FiMapPin className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-gray-700">No workers in this zone</p>
                          <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
                            {bookingZoneName
                              ? `No registered workers found directly inside '${bookingZoneName}'.`
                              : 'No specific zone specified on this booking.'}
                          </p>
                          <p className="text-[11px] text-blue-600 font-medium mt-2">
                            👉 Select any available vendor from the "All Vendors" column on the right.
                          </p>
                        </div>
                      ) : (
                        zoneWorkers.map(w => renderWorkerCard(w, true))
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: All Vendors / All Workers */}
                  <div
                    className={`flex flex-col rounded-xl border border-gray-200 bg-gray-50/20 overflow-hidden ${
                      activeTab !== 'all' ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    {/* Column Header */}
                    <div className="p-3 bg-gradient-to-r from-gray-100 to-slate-100 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-gray-700 text-white flex items-center justify-center text-xs">
                          <FiUser className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900">All Platform Vendors & Workers</h3>
                          <p className="text-[10px] text-gray-500">
                            Browse and assign any approved provider platform-wide
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-700 text-white">
                        {allWorkers.length}
                      </span>
                    </div>

                    {/* Worker List */}
                    <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[50vh] md:max-h-[55vh]">
                      {allWorkers.length === 0 ? (
                        <div className="text-center py-10 px-4">
                          <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FiUser className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-gray-700">No workers found</p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Try adjusting your search query to find workers.
                          </p>
                        </div>
                      ) : (
                        allWorkers.map(w => renderWorkerCard(w, false))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300" /> Offline
                </span>
                <span className="hidden sm:inline text-blue-600 font-medium">
                  ★ Category matches are prioritized at top
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AssignWorkerModal;
