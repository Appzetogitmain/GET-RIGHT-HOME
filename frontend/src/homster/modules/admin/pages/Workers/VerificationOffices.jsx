import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiMapPin, FiPlus, FiEdit2, FiTrash2, FiSave, FiPhone, FiClock, FiCheck,
  FiShield, FiUserCheck, FiRefreshCw, FiExternalLink
} from 'react-icons/fi';
import CardShell from '../UserCategories/components/CardShell';
import Modal from '../UserCategories/components/Modal';
import adminWorkerService from '../../../../services/adminWorkerService';

const EMPTY_OFFICE = {
  name: '', address: '', landmark: '', city: '', state: '', pincode: '',
  lat: '', lng: '', mapUrl: '', contactPerson: '', contactPhone: '',
  workingHours: '', instructions: '', zoneIds: [], isActive: true, sortOrder: 0
};

const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

const VerificationOffices = () => {
  const [settings, setSettings] = useState({ enabled: true, requiredDocuments: [], instructions: '' });
  const [docsText, setDocsText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [offices, setOffices] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [busyWorkerId, setBusyWorkerId] = useState(null);

  const [modal, setModal] = useState({ open: false, id: null, form: EMPTY_OFFICE });
  const [savingOffice, setSavingOffice] = useState(false);

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await adminWorkerService.getAllWorkers({ approvalStatus: 'offline_pending' });
      setPendingWorkers(res?.data || []);
    } catch {
      toast.error('Failed to load pending workers');
    } finally {
      setQueueLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, officesRes, zonesRes] = await Promise.all([
        adminWorkerService.getOfflineVerificationSettings(),
        adminWorkerService.getVerificationOffices(),
        adminWorkerService.getZones().catch(() => ({ data: [] }))
      ]);
      if (settingsRes?.data) {
        setSettings(settingsRes.data);
        setDocsText((settingsRes.data.requiredDocuments || []).join('\n'));
      }
      setOffices(officesRes?.data || []);
      setZones(zonesRes?.data || []);
    } catch {
      toast.error('Failed to load verification settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadQueue();
  }, []);

  const saveSettings = async (patch = {}) => {
    setSavingSettings(true);
    try {
      const payload = {
        enabled: settings.enabled,
        instructions: settings.instructions,
        requiredDocuments: docsText.split('\n').map((d) => d.trim()).filter(Boolean),
        ...patch
      };
      const res = await adminWorkerService.updateOfflineVerificationSettings(payload);
      if (res?.success) {
        setSettings(res.data);
        setDocsText((res.data.requiredDocuments || []).join('\n'));
        toast.success('Settings saved');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const openAdd = () => setModal({ open: true, id: null, form: { ...EMPTY_OFFICE, sortOrder: offices.length } });
  const openEdit = (o) => setModal({
    open: true,
    id: o._id,
    form: {
      ...EMPTY_OFFICE,
      ...o,
      lat: o.lat ?? '',
      lng: o.lng ?? '',
      zoneIds: (o.zoneIds || []).map((z) => String(z?._id || z))
    }
  });
  const setField = (k, v) => setModal((m) => ({ ...m, form: { ...m.form, [k]: v } }));
  const toggleZone = (id) => setModal((m) => {
    const has = m.form.zoneIds.includes(id);
    return { ...m, form: { ...m.form, zoneIds: has ? m.form.zoneIds.filter((z) => z !== id) : [...m.form.zoneIds, id] } };
  });

  const saveOffice = async (e) => {
    e.preventDefault();
    if (!modal.form.name.trim() || !modal.form.address.trim()) {
      toast.error('Office name and address are required');
      return;
    }
    setSavingOffice(true);
    try {
      const payload = Object.fromEntries(Object.keys(EMPTY_OFFICE).map((k) => [k, modal.form[k]]));
      const res = modal.id
        ? await adminWorkerService.updateVerificationOffice(modal.id, payload)
        : await adminWorkerService.createVerificationOffice(payload);
      if (res?.success) {
        toast.success(modal.id ? 'Office updated' : 'Office added');
        setModal({ open: false, id: null, form: EMPTY_OFFICE });
        const list = await adminWorkerService.getVerificationOffices();
        setOffices(list?.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save office');
    } finally {
      setSavingOffice(false);
    }
  };

  const toggleOfficeActive = async (o) => {
    try {
      await adminWorkerService.updateVerificationOffice(o._id, { isActive: !o.isActive });
      setOffices((prev) => prev.map((x) => (x._id === o._id ? { ...x, isActive: !o.isActive } : x)));
    } catch {
      toast.error('Failed to update office');
    }
  };

  const deleteOffice = async (o) => {
    if (!window.confirm(`Delete "${o.name}"? Workers will no longer see this office.`)) return;
    try {
      await adminWorkerService.deleteVerificationOffice(o._id);
      setOffices((prev) => prev.filter((x) => x._id !== o._id));
      toast.success('Office deleted');
    } catch {
      toast.error('Failed to delete office');
    }
  };

  const markVerified = async (w) => {
    const remarks = window.prompt(`Confirm ${w.name}'s original documents were verified at the office.\n\nRemarks (optional):`, '');
    if (remarks === null) return;
    setBusyWorkerId(w._id);
    try {
      const res = await adminWorkerService.completeOfflineVerification(w._id, remarks);
      if (res?.success) {
        toast.success(`${w.name} is now fully verified`);
        setPendingWorkers((prev) => prev.filter((x) => x._id !== w._id));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete verification');
    } finally {
      setBusyWorkerId(null);
    }
  };

  const assignOffice = async (w, officeId) => {
    try {
      await adminWorkerService.assignVerificationOffice(w._id, officeId || null);
      setPendingWorkers((prev) => prev.map((x) => (x._id === w._id
        ? { ...x, offlineVerification: { ...(x.offlineVerification || {}), officeId: officeId || null } }
        : x)));
      toast.success('Office assigned');
    } catch {
      toast.error('Failed to assign office');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>;

  const activeOffices = offices.filter((o) => o.isActive);

  return (
    <div className="space-y-4">
      {/* Settings */}
      <CardShell icon={FiShield} title="Offline (Office) Verification" subtitle="Second step after online approval">
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-emerald-600"
              checked={settings.enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setSettings((s) => ({ ...s, enabled }));
                saveSettings({ enabled });
              }}
            />
            <span>
              <span className="block text-sm font-bold text-gray-800">Require office verification after online approval</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                When ON, approving a worker only completes the online step. The worker sees the office address below and
                gets no jobs until you mark the office verification done. Turning it OFF does not release workers that are already pending.
              </span>
            </span>
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Documents to carry (one per line)</label>
              <textarea
                rows={4}
                className={inputCls}
                value={docsText}
                onChange={(e) => setDocsText(e.target.value)}
                placeholder={'Original Aadhaar Card\nOriginal PAN Card'}
              />
            </div>
            <div>
              <label className={labelCls}>Message shown to the worker</label>
              <textarea
                rows={4}
                className={inputCls}
                value={settings.instructions}
                onChange={(e) => setSettings((s) => ({ ...s, instructions: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => saveSettings()}
              disabled={savingSettings}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" /> {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </CardShell>

      {/* Offices */}
      <CardShell icon={FiMapPin} title="Verification Offices" subtitle="Locations workers visit with original documents">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500">
            Offices with zones are shown only to workers of those zones. Offices without zones are shown to everyone.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold whitespace-nowrap"
          >
            <FiPlus className="w-4 h-4" /> Add Office
          </button>
        </div>

        {offices.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl text-sm text-gray-500">
            No offices yet. Add at least one so approved workers know where to go.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {offices.map((o) => (
              <div key={o._id} className={`rounded-xl border p-4 bg-white ${o.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{o.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {[o.address, o.landmark && `Near ${o.landmark}`, o.city, o.state, o.pincode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    o.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {o.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                  {o.workingHours && <p className="flex items-center gap-1.5"><FiClock /> {o.workingHours}</p>}
                  {(o.contactPerson || o.contactPhone) && (
                    <p className="flex items-center gap-1.5"><FiPhone /> {[o.contactPerson, o.contactPhone].filter(Boolean).join(' · ')}</p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <FiMapPin /> {(o.zoneIds || []).length ? o.zoneIds.map((z) => z?.name || z).join(', ') : 'All zones'}
                  </p>
                  {(o.mapUrl || (o.lat != null && o.lng != null)) && (
                    <a
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      href={o.mapUrl || `https://www.google.com/maps?q=${o.lat},${o.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FiExternalLink /> Map pin
                    </a>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-1">
                  <button onClick={() => toggleOfficeActive(o)} className="px-2 py-1 rounded-md text-[11px] font-semibold text-gray-600 hover:bg-gray-100">
                    {o.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => openEdit(o)} className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50" title="Edit">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteOffice(o)} className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50" title="Delete">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardShell>

      {/* Queue */}
      <CardShell icon={FiUserCheck} title={`Waiting for Office Verification (${pendingWorkers.length})`} subtitle="Online approved, documents not yet checked in person">
        <div className="flex justify-end mb-2">
          <button onClick={loadQueue} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900">
            <FiRefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        {pendingWorkers.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No workers are waiting for office verification.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3 font-semibold">Worker</th>
                  <th className="py-2 pr-3 font-semibold">Approved online</th>
                  <th className="py-2 pr-3 font-semibold">Office shown to worker</th>
                  <th className="py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingWorkers.map((w) => (
                  <tr key={w._id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3">
                      <p className="font-bold text-gray-800">{w.name}</p>
                      <p className="text-gray-500">{w.phone}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600">
                      {w.offlineVerification?.requestedAt ? new Date(w.offlineVerification.requestedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs max-w-[220px]"
                        value={String(w.offlineVerification?.officeId || '')}
                        onChange={(e) => assignOffice(w, e.target.value)}
                      >
                        <option value="">All matching offices</option>
                        {activeOffices.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => markVerified(w)}
                        disabled={busyWorkerId === w._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                      >
                        <FiCheck className="w-3.5 h-3.5" /> {busyWorkerId === w._id ? 'Saving…' : 'Mark Verified'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardShell>

      {/* Add / Edit office */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null, form: EMPTY_OFFICE })}
        title={modal.id ? 'Edit Office' : 'Add Verification Office'}
      >
        <form onSubmit={saveOffice} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={labelCls}>Office name *</label>
              <input className={inputCls} value={modal.form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Get Right Home – Anantapur Office" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Full address *</label>
              <textarea rows={2} className={inputCls} value={modal.form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Landmark</label>
              <input className={inputCls} value={modal.form.landmark} onChange={(e) => setField('landmark', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={modal.form.city} onChange={(e) => setField('city', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} value={modal.form.state} onChange={(e) => setField('state', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Pincode</label>
              <input className={inputCls} value={modal.form.pincode} onChange={(e) => setField('pincode', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Google Maps link (optional)</label>
              <input className={inputCls} value={modal.form.mapUrl} onChange={(e) => setField('mapUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" />
            </div>
            <div>
              <label className={labelCls}>Latitude (optional)</label>
              <input className={inputCls} type="number" step="any" value={modal.form.lat} onChange={(e) => setField('lat', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Longitude (optional)</label>
              <input className={inputCls} type="number" step="any" value={modal.form.lng} onChange={(e) => setField('lng', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact person</label>
              <input className={inputCls} value={modal.form.contactPerson} onChange={(e) => setField('contactPerson', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact phone</label>
              <input className={inputCls} value={modal.form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Working hours</label>
              <input className={inputCls} value={modal.form.workingHours} onChange={(e) => setField('workingHours', e.target.value)} placeholder="Mon–Sat, 10:00 AM – 6:00 PM" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Extra instructions for this office</label>
              <textarea rows={2} className={inputCls} value={modal.form.instructions} onChange={(e) => setField('instructions', e.target.value)} placeholder="2nd floor, ask for the onboarding desk" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Show to workers of zones (none selected = all zones)</label>
            <div className="flex flex-wrap gap-2">
              {zones.length === 0 && <span className="text-xs text-gray-400">No zones configured</span>}
              {zones.map((z) => {
                const id = String(z._id);
                const on = modal.form.zoneIds.includes(id);
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => toggleZone(id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {z.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="accent-emerald-600" checked={modal.form.isActive} onChange={(e) => setField('isActive', e.target.checked)} />
            Visible to workers
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModal({ open: false, id: null, form: EMPTY_OFFICE })} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={savingOffice} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
              {savingOffice ? 'Saving…' : modal.id ? 'Save Changes' : 'Add Office'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VerificationOffices;
