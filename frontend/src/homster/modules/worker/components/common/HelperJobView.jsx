import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiMapPin, FiNavigation, FiPhone, FiTool, FiUser, FiUsers } from 'react-icons/fi';
import Header from '../layout/Header';
import { workerTheme as themeColors } from '../../../../theme';

/**
 * What a helper sees for a job admin added them to: where, when, what and who
 * to work with. It is read-only and deliberately shows no amounts of any kind
 * — their payment arrives in the wallet when the job is completed.
 */
const HelperJobView = ({ job }) => {
  const navigate = useNavigate();
  const lead = job.leadWorker;
  const mapQuery = encodeURIComponent(`${job.address?.addressLine1 || ''}, ${job.address?.city || ''}`);
  const when = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Job Details" />

      <main className="px-4 py-6">
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <FiUsers className="h-5 w-5" />
            <h3 className="font-bold">You are helping on this job</h3>
          </div>
          <p className="mt-1 text-sm text-blue-700">
            Work with {lead?.name || 'the lead professional'}. Your payment will be added to your wallet once the job is completed.
          </p>
        </div>

        {lead && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FiUser className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-gray-400">Lead professional</p>
              <p className="font-bold text-gray-900">{lead.name}</p>
            </div>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                <FiPhone className="h-5 w-5" />
              </a>
            )}
          </div>
        )}

        <div className="mb-5 rounded-2xl bg-white p-5 shadow-md">
          <h3 className="text-lg font-bold text-gray-900">{job.serviceName}</h3>
          <p className="text-xs font-bold uppercase text-gray-400">Booking #{job.bookingNumber}</p>

          <div className="mt-4 space-y-4 border-t border-gray-50 pt-4">
            <div className="flex items-start gap-3">
              <FiClock className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">When</p>
                <p className="text-sm font-medium text-gray-700">{when}</p>
                <p className="text-sm font-bold text-blue-600">{job.scheduledTime}</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="mb-3 flex items-start gap-3">
                <FiMapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400">Service location</p>
                  <p className="text-sm font-semibold text-gray-800">{job.address?.addressLine1}, {job.address?.city}</p>
                </div>
              </div>
              <div className="mb-3 h-36 overflow-hidden rounded-lg border border-blue-100 bg-gray-200">
                <iframe
                  title="map"
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: 'none' }}
                  src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                  loading="lazy"
                  tabIndex="-1"
                />
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white"
                style={{ background: themeColors.button }}
              >
                <FiNavigation className="h-4 w-4" /> Get directions
              </a>
            </div>
          </div>
        </div>

        {job.items?.length > 0 && (
          <div className="mb-5 rounded-2xl bg-white p-5 shadow-md">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
              <FiTool className="h-5 w-5 text-gray-500" /> Work to be done
            </h4>
            <div className="space-y-3">
              {job.items.map((item, index) => (
                <div key={index} className="flex justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <p className="font-bold text-gray-800">{item.card?.title || 'Service item'}</p>
                  <span className="text-sm font-bold text-gray-900">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {job.helpers?.length > 1 && (
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <h4 className="mb-3 font-bold text-gray-900">Team on this job</h4>
            <ul className="space-y-2">
              {job.helpers.map((h) => (
                <li key={String(h.workerId?._id || h.workerId)} className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-800">{h.name || 'Helper'}</span>
                  {h.phone && <a href={`tel:${h.phone}`} className="text-blue-600">{h.phone}</a>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/worker/jobs')}
          className="mt-6 w-full rounded-2xl border border-gray-200 bg-white py-3.5 font-bold text-gray-700"
        >
          Back to my jobs
        </button>
      </main>
    </div>
  );
};

export default HelperJobView;
