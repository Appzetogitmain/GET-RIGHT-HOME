import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiVolume2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { workerTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import workerService from '../../../../services/workerService';
import { registerFCMToken, removeFCMToken } from '../../../../services/pushNotificationService';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: true,
    soundAlerts: true,
    language: 'en',
  });

  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await workerService.getProfile();
        if (res.success && res.worker?.settings) {
          setSettings(res.worker.settings);
          // Sync with localStorage for legacy components
          localStorage.setItem('workerSettings', JSON.stringify(res.worker.settings));

          // Also sync workerData for global utility usage
          const workerData = JSON.parse(localStorage.getItem('workerData') || '{}');
          localStorage.setItem('workerData', JSON.stringify({ ...workerData, settings: res.worker.settings }));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateDBSettings = async (newSettings) => {
    try {
      const res = await workerService.updateProfile({ settings: newSettings });
      if (res.success) {
        localStorage.setItem('workerSettings', JSON.stringify(newSettings));

        // Also sync workerData for global utility usage
        const workerData = JSON.parse(localStorage.getItem('workerData') || '{}');
        localStorage.setItem('workerData', JSON.stringify({ ...workerData, settings: newSettings }));

        return true;
      }
    } catch (error) {
      console.error('Update settings failed:', error);
      toast.error('Failed to sync settings with server');
    }
    return false;
  };

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await updateDBSettings(updated);

    // Handle FCM Token registration/removal if notifications toggled
    if (key === 'notifications') {
      if (updated.notifications) {
        // Turning ON
        try {
          await registerFCMToken('worker', true);
          toast.success('Notifications enabled');
        } catch (error) {
          console.error('Error enabling notifications:', error);
          toast.error('Failed to enable notifications');
        }
      } else {
        // Turning OFF
        try {
          await removeFCMToken('worker');
          toast.success('Notifications disabled');
        } catch (error) {
          console.error('Error disabling notifications:', error);
        }
      }
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Settings" />

      <main className="px-4 py-6">
        {/* Notification Settings */}
        <div
          className="bg-white rounded-xl p-4 mb-6 shadow-md"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3 className="font-bold text-gray-800 mb-4">Notifications</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiBell className="w-5 h-5" style={{ color: themeColors.icon }} />
                <span className="text-gray-800">Push Notifications</span>
              </div>
              <button
                onClick={() => handleToggle('notifications')}
                className={`w-12 h-6 rounded-full transition-all ${settings.notifications ? '' : 'bg-gray-300'
                  }`}
                style={
                  settings.notifications
                    ? {
                      background: themeColors.button,
                    }
                    : {}
                }
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-all ${settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  style={{
                    marginTop: '2px',
                  }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiVolume2 className="w-5 h-5" style={{ color: themeColors.icon }} />
                <span className="text-gray-800">Sound Alerts</span>
              </div>
              <button
                onClick={() => handleToggle('soundAlerts')}
                className={`w-12 h-6 rounded-full transition-all ${settings.soundAlerts ? '' : 'bg-gray-300'
                  }`}
                style={
                  settings.soundAlerts
                    ? {
                      background: themeColors.button,
                    }
                    : {}
                }
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-all ${settings.soundAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  style={{
                    marginTop: '2px',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;


