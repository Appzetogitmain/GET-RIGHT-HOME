import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiX, FiClock, FiCalendar, FiAlertCircle, FiCheck, FiArrowRight } from 'react-icons/fi';
import { workerTheme as themeColors } from '../../../../../theme';
import api from '../../../../../services/api';

const WorkerOfflineModal = ({
  isOpen,
  onClose,
  onSubmitRequest,
  submitting = false
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startSlot, setStartSlot] = useState(null);
  const [endSlot, setEndSlot] = useState(null);
  const [selectingType, setSelectingType] = useState('start'); // 'start' or 'end'
  const [reason, setReason] = useState('Personal Leave');
  const [customReason, setCustomReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const quickReasons = [
    'Personal Leave',
    'Health / Sick',
    'Emergency',
    'Vehicle / Tool Issue',
    'Family Event',
    'Other'
  ];

  // Fetch slots on open
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        const res = await api.get('/public/operating-hours');
        if (res.data?.slots && res.data.slots.length > 0) {
          setAvailableSlots(res.data.slots);
        } else {
          setAvailableSlots(getDefaultSlots());
        }
      } catch (err) {
        setAvailableSlots(getDefaultSlots());
      } finally {
        setLoadingSlots(false);
      }
    };

    if (isOpen) {
      fetchSlots();
      // Reset form on open
      setSelectedDate(new Date());
      setStartSlot(null);
      setEndSlot(null);
      setSelectingType('start');
      setReason('Personal Leave');
      setCustomReason('');
    }
  }, [isOpen]);

  const getDefaultSlots = () => [
    { value: '09:00', end: '10:00', display: '9:00 AM' },
    { value: '10:00', end: '11:00', display: '10:00 AM' },
    { value: '11:00', end: '12:00', display: '11:00 AM' },
    { value: '12:00', end: '13:00', display: '12:00 PM' },
    { value: '13:00', end: '14:00', display: '1:00 PM' },
    { value: '14:00', end: '15:00', display: '2:00 PM' },
    { value: '15:00', end: '16:00', display: '3:00 PM' },
    { value: '16:00', end: '17:00', display: '4:00 PM' },
    { value: '17:00', end: '18:00', display: '5:00 PM' },
    { value: '18:00', end: '19:00', display: '6:00 PM' },
    { value: '19:00', end: '20:00', display: '7:00 PM' },
    { value: '20:00', end: '21:00', display: '8:00 PM' }
  ];

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsClosing(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  if (!isOpen && !isClosing) return null;

  // Generate 7 upcoming dates
  const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      isToday: date.toDateString() === new Date().toDateString()
    };
  };

  const isDateSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  // Filter slots for today if needed
  const getFilteredSlots = () => {
    const now = new Date();
    const isToday = selectedDate && selectedDate.toDateString() === now.toDateString();

    if (!isToday) return availableSlots;

    const currentHour = now.getHours();
    return availableSlots.filter(slot => {
      const slotHour = parseInt(slot.value.split(':')[0], 10);
      return slotHour >= currentHour;
    });
  };

  const handleSlotClick = (slot) => {
    if (selectingType === 'start') {
      setStartSlot(slot);
      setEndSlot(null);
      setSelectingType('end');
    } else {
      // Selecting end slot
      const [startH] = (startSlot ? startSlot.value : '00:00').split(':').map(Number);
      const [endH] = slot.value.split(':').map(Number);

      if (endH <= startH) {
        // If clicked slot is before or equal to start, make it new start
        setStartSlot(slot);
        setEndSlot(null);
        setSelectingType('end');
      } else {
        setEndSlot(slot);
        setSelectingType('start');
      }
    }
  };

  // Calculate estimated duration
  const getDurationText = () => {
    if (!startSlot) return null;
    const [startH] = startSlot.value.split(':').map(Number);
    const endHVal = endSlot ? endSlot.value.split(':').map(Number)[0] : (startSlot.end ? parseInt(startSlot.end.split(':')[0], 10) : startH + 1);
    const diff = Math.max(1, endHVal - startH);
    return `${diff} hr${diff > 1 ? 's' : ''}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startSlot) {
      alert('Please select a start time slot');
      return;
    }

    let finalEndSlot = endSlot;
    if (!finalEndSlot) {
      const filtered = getFilteredSlots();
      const sIndex = filtered.findIndex(s => s.value === startSlot.value);
      if (sIndex !== -1 && sIndex + 1 < filtered.length) {
        finalEndSlot = filtered[sIndex + 1];
      } else {
        finalEndSlot = {
          value: startSlot.end || '21:00',
          display: startSlot.end ? `${parseInt(startSlot.end) % 12 || 12}:00 ${parseInt(startSlot.end) >= 12 ? 'PM' : 'AM'}` : 'End of day'
        };
      }
    }

    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const finalReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;

    onSubmitRequest({
      date: selectedDate,
      dateStr,
      startSlot,
      endSlot: finalEndSlot,
      reason: finalReason
    });
  };

  const brandColor = themeColors.button || themeColors.brand?.teal || '#00A699';

  return (
    <>
      {/* Scoped CSS to completely eliminate scrollbars */}
      <style>{`
        .modal-no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .modal-no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Backdrop with smooth blur */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Modal Container: Centered on Desktop, Bottom-sheet on Mobile */}
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-none">
        <div
          className={`pointer-events-auto bg-white w-full sm:max-w-lg md:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out border border-gray-100 ${
            isClosing ? 'translate-y-full sm:scale-95 opacity-0' : 'translate-y-0 sm:scale-100 opacity-100'
          }`}
          style={{
            maxHeight: 'min(90vh, 720px)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-white sm:rounded-t-2xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                <FiCalendar className="w-5 h-5" style={{ color: brandColor }} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  Request Offline Leave
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select your date and time slot range
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Body - Scrollbars Completely Hidden */}
          <div
            className="px-5 py-4 overflow-y-auto modal-no-scrollbar flex-1 space-y-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* 1. Date Selection (7 Days Grid - Fully Visible Without Scroll) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Select Date</span>
                </label>
                <span className="text-[11px] font-medium text-gray-500">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* 7 Columns Grid: Every single card fits across without scrolling */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {getDates().map((date, index) => {
                  const { day, date: dateNum, isToday } = formatDate(date);
                  const isSelected = isDateSelected(date);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setStartSlot(null);
                        setEndSlot(null);
                        setSelectingType('start');
                      }}
                      className="py-2.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center relative border text-center cursor-pointer group"
                      style={
                        isSelected
                          ? {
                              backgroundColor: brandColor,
                              borderColor: brandColor,
                              color: '#FFFFFF',
                              boxShadow: `0 4px 12px ${brandColor}40`
                            }
                          : {
                              backgroundColor: isToday ? '#F8FAFC' : '#FFFFFF',
                              borderColor: isToday ? '#CBD5E1' : '#E5E7EB',
                              color: '#1F2937'
                            }
                      }
                    >
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isSelected ? 'text-white/90' : isToday ? 'text-teal-600 font-bold' : 'text-gray-500'
                        }`}
                      >
                        {day}
                      </span>
                      <span className={`text-base sm:text-lg font-bold leading-tight mt-0.5 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {dateNum}
                      </span>
                      {isToday && (
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded-full font-bold mt-0.5 ${
                            isSelected ? 'bg-white text-teal-800' : 'bg-teal-50 text-teal-700'
                          }`}
                        >
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Time Range Card */}
            <div className="p-3 bg-gradient-to-r from-gray-50 via-teal-50/20 to-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-gray-500">From:</span>
                    <strong className="text-gray-900 font-bold">
                      {startSlot ? startSlot.display : 'Select Slot'}
                    </strong>
                  </div>

                  <FiArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-gray-500">To:</span>
                    <strong className="text-gray-900 font-bold">
                      {endSlot ? endSlot.display : (startSlot ? 'Click End' : '—')}
                    </strong>
                  </div>
                </div>

                {startSlot && (
                  <div className="flex items-center gap-2">
                    {getDurationText() && (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                      >
                        {getDurationText()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setStartSlot(null);
                        setEndSlot(null);
                        setSelectingType('start');
                      }}
                      className="text-[11px] text-gray-500 hover:text-red-600 font-semibold transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Time Slots Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FiClock className="w-3.5 h-3.5 text-gray-500" />
                  <span>2. Select Operating Time Slots</span>
                </label>
                <span className="text-[11px] text-gray-500 font-medium">
                  {selectingType === 'start' ? 'Click start time' : 'Click end time'}
                </span>
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl">
                  <div
                    className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: brandColor, borderTopColor: 'transparent' }}
                  />
                  <p className="text-xs text-gray-500 mt-2">Loading operating slots...</p>
                </div>
              ) : getFilteredSlots().length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold">No more slots available today</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Please choose tomorrow or an upcoming date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {getFilteredSlots().map((slot, index) => {
                    const isStart = startSlot?.value === slot.value;
                    const isEnd = endSlot?.value === slot.value;
                    const isSelected = isStart || isEnd;

                    // Compute in-between slot highlight
                    const [sH] = (startSlot ? startSlot.value : '99:99').split(':').map(Number);
                    const [eH] = (endSlot ? endSlot.value : '00:00').split(':').map(Number);
                    const [curH] = slot.value.split(':').map(Number);
                    const isInBetween = startSlot && endSlot && curH > sH && curH < eH;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSlotClick(slot)}
                        className="py-2.5 px-2 rounded-xl text-center border transition-all text-xs font-semibold relative cursor-pointer flex flex-col items-center justify-center min-h-[44px]"
                        style={
                          isSelected
                            ? {
                                backgroundColor: brandColor,
                                borderColor: brandColor,
                                color: '#FFFFFF',
                                boxShadow: `0 3px 10px ${brandColor}40`
                              }
                            : isInBetween
                            ? {
                                backgroundColor: `${brandColor}15`,
                                borderColor: `${brandColor}50`,
                                color: brandColor,
                                fontWeight: '700'
                              }
                            : {
                                backgroundColor: '#FFFFFF',
                                borderColor: '#E5E7EB',
                                color: '#374151'
                              }
                        }
                      >
                        <span className="leading-tight">{slot.display}</span>
                        {isStart && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                            Start
                          </span>
                        )}
                        {isEnd && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                            End
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Reason Selection */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                3. Reason for Leave
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      reason === r
                        ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {reason === 'Other' && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    placeholder="Enter reason for leave..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-gray-800"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* 5. Policy Notice Banner */}
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/90 rounded-xl border border-amber-200/80 text-amber-900 text-xs">
              <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px] sm:text-xs">
                <strong>Admin Approval Required:</strong> You will remain <strong>Online</strong> until the Admin approves your request.
              </p>
            </div>
          </div>

          {/* Sticky Bottom Actions - Always Visible */}
          <div className="p-4 sm:p-5 bg-white border-t border-gray-100 flex items-center gap-3 shrink-0 sm:rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="py-3 px-4 rounded-xl text-gray-700 font-semibold text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !startSlot}
              className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 4px 14px ${brandColor}40`
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : startSlot ? (
                <span>
                  Submit Offline Request ({startSlot.display}
                  {endSlot ? ` - ${endSlot.display}` : ''})
                </span>
              ) : (
                <span>Select Time Slot to Continue</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkerOfflineModal;
