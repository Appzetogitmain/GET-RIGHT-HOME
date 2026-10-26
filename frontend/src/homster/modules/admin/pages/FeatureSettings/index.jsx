import React, { useEffect, useState } from 'react';
import { FiCreditCard, FiAward, FiUser, FiBriefcase } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { featureFlagService, DEFAULT_FEATURE_FLAGS } from '../../../../services/featureFlagService';

const GROUPS = [
  {
    title: 'User App',
    icon: FiUser,
    items: [
      { key: 'userRazorpay', label: 'Razorpay (Online Payment)', hint: 'Users can pay online. When off, new online payments are blocked.' },
      { key: 'userSubscription', label: 'Subscription (VIP Membership)', hint: 'Hides VIP / plans for users and blocks new purchases.' }
    ]
  },
  {
    title: 'Worker App',
    icon: FiBriefcase,
    items: [
      { key: 'workerRazorpay', label: 'Razorpay (Online Payment)', hint: 'Workers can pay online. When off, new online payments are blocked.' },
      { key: 'workerSubscription', label: 'Subscription', hint: 'Hides the subscription section for workers and blocks new purchases.' }
    ]
  }
];

const FeatureSettings = () => {
  const [flags, setFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    featureFlagService.getAdminFlags()
      .then(setFlags)
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load feature settings'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (item, groupTitle) => {
    const next = !flags[item.key];
    if (!next && !window.confirm(`Are you sure you want to disable ${item.label} for the ${groupTitle}?`)) return;
    setSaving(item.key);
    try {
      const updated = await featureFlagService.updateAdminFlags({ [item.key]: next });
      setFlags(updated);
      toast.success(`${item.label} ${next ? 'enabled' : 'disabled'} for the ${groupTitle}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800">Feature Settings</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Turn Razorpay and Subscription on or off separately for the User app and the Worker app.
        Existing payments and subscription data are never deleted.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg"><group.icon className="w-5 h-5 text-blue-600" /></div>
              <h2 className="text-lg font-bold text-gray-800">{group.title}</h2>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => {
                const on = flags[item.key] !== false;
                return (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 pr-3">
                      <p className="font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.hint}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={loading || saving === item.key}
                      onClick={() => toggle(item, group.title)}
                      className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 disabled:opacity-50 ${on ? 'bg-green-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureSettings;
