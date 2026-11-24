import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiCheckCircle, FiClock, FiMapPin, FiPhone, FiNavigation, FiFileText,
  FiRefreshCw, FiLogOut, FiHeadphones, FiUser, FiInfo
} from 'react-icons/fi';
import workerService from '../../../../services/workerService';
import { workerAuthService } from '../../../../services/authService';
import Logo from '../../../../components/common/Logo';
import LogoLoader from '../../../../components/common/LogoLoader';
import { setCachedOfflineVerificationStatus } from '../../utils/offlineVerification';

const BRAND = '#347989';
const POLL_MS = 30000;

const directionsUrl = (office) => {
  if (office.mapUrl) return office.mapUrl;
  if (office.lat != null && office.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}`;
  }
  const q = [office.name, office.address, office.landmark, office.city, office.state, office.pincode].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

const Step = ({ done, active, title, subtitle, isLast }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          done ? 'bg-emerald-500 text-white' : active ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-50' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {done ? <FiCheckCircle className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
      </div>
      {!isLast && <div className={`w-0.5 flex-1 min-h-[28px] ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
    </div>
    <div className="pb-5">
      <p className={`text-sm font-bold ${done ? 'text-emerald-700' : active ? 'text-amber-700' : 'text-gray-500'}`}>{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const VerificationPending = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    try {
      const res = await workerService.getVerificationStatus();
      if (!res?.success) throw new Error(res?.message || 'Failed');
      const d = res.data;
      setCachedOfflineVerificationStatus(d.offlineVerification?.status);
      if (d.fullyVerified) {
        toast.success('Your account is fully verified! You can now receive jobs.');
        navigate('/worker/dashboard', { replace: true });
        return;
      }
      setData(d);
      if (manual) toast('Office verification is still pending', { icon: '⏳' });
    } catch (err) {
      if (manual || !data) toast.error(err.response?.data?.message || 'Could not load verification status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const handleLogout = async () => {
    await workerAuthService.logout();
    navigate('/worker/login', { replace: true });
  };

  if (loading && !data) return <LogoLoader />;

  const offices = data?.offices || [];
  const docs = data?.requiredDocuments || [];

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Logo className="h-9 w-auto" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-rose-600 px-2 py-1.5 rounded-lg"
        >
          <FiLogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Status hero */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <FiClock className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-lg font-extrabold text-gray-900">Pending Office Verification</h1>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            {data?.instructions || 'Your online verification is approved. Please visit our office with your original documents to complete verification.'}
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <Step done title="Registration submitted" subtitle="Your details and documents were uploaded" />
          <Step done title="Online verification approved" subtitle="Admin has approved your uploaded documents" />
          <Step active title="Office (offline) verification" subtitle="Visit the office below with your original documents" />
          <Step isLast title="Start receiving jobs" subtitle="Your account becomes fully active after office verification" />
        </div>

        {/* Offices */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-800 px-1 flex items-center gap-2">
            <FiMapPin style={{ color: BRAND }} /> {offices.length > 1 ? 'Visit any of these offices' : 'Visit this office'}
          </h2>

          {offices.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 border border-dashed border-gray-200 text-center text-sm text-gray-500">
              Office details will be shared soon. Please contact support for the office address.
            </div>
          ) : (
            offices.map((office) => (
              <div key={office._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="font-bold text-gray-900">{office.name}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {office.address}
                  {office.landmark ? `, Near ${office.landmark}` : ''}
                  {[office.city, office.state].filter(Boolean).length ? `, ${[office.city, office.state].filter(Boolean).join(', ')}` : ''}
                  {office.pincode ? ` - ${office.pincode}` : ''}
                </p>

                <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                  {office.workingHours && (
                    <p className="flex items-center gap-2"><FiClock className="shrink-0 text-gray-400" /> {office.workingHours}</p>
                  )}
                  {office.contactPerson && (
                    <p className="flex items-center gap-2"><FiUser className="shrink-0 text-gray-400" /> {office.contactPerson}</p>
                  )}
                  {office.instructions && (
                    <p className="flex items-start gap-2"><FiInfo className="shrink-0 text-gray-400 mt-0.5" /> {office.instructions}</p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a
                    href={directionsUrl(office)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: BRAND }}
                  >
                    <FiNavigation className="w-4 h-4" /> Directions
                  </a>
                  {office.contactPhone ? (
                    <a
                      href={`tel:${office.contactPhone.replace(/\s/g, '')}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border"
                      style={{ color: BRAND, borderColor: BRAND }}
                    >
                      <FiPhone className="w-4 h-4" /> Call Office
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate('/worker/support')}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600"
                    >
                      <FiHeadphones className="w-4 h-4" /> Support
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Documents to carry */}
        {docs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
              <FiFileText style={{ color: BRAND }} /> Documents to carry
            </h2>
            <ul className="space-y-1.5">
              {docs.map((d) => (
                <li key={d} className="flex items-center gap-2 text-sm text-gray-700">
                  <FiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => load({ manual: true })}
          disabled={refreshing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 disabled:opacity-60"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking…' : 'Check verification status'}
        </button>
        <button
          onClick={() => navigate('/worker/support')}
          className="w-full text-center text-xs font-semibold text-gray-500 py-1"
        >
          Need help? Contact support
        </button>
      </div>
    </div>
  );
};

export default VerificationPending;
