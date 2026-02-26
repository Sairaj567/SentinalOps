// =============================================================================
// SentinelOps - Settings Page
// =============================================================================

import React, { useState } from 'react';
import {
  Settings as SettingsIcon, User, Bell, Key, Palette,
  Save, Eye, EyeOff, RefreshCw, Shield
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuthStore();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    highAlerts: true,
    mediumAlerts: false,
    pipelineResults: true,
    agentStatus: true,
    emailNotifications: false,
  });

  const [apiKey, setApiKey] = useState('sk-sentinelops-xxxxxxxxxxxxxxxxxxxx');
  const [showApiKey, setShowApiKey] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const handleRegenerateKey = () => {
    const newKey = `sk-sentinelops-${Array.from({ length: 32 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('')}`;
    setApiKey(newKey);
    toast.success('API key regenerated');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
          <SettingsIcon className="w-7 h-7 text-gray-400" />
          <span>Settings</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your account, notifications, and platform preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <User className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 capitalize">
              {user?.role || 'analyst'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveProfile}
            className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Bell className="w-5 h-5 text-yellow-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'Immediate notification for critical security events' },
            { key: 'highAlerts', label: 'High-Severity Alerts', desc: 'Notifications for high-severity alerts' },
            { key: 'mediumAlerts', label: 'Medium Alerts', desc: 'Notifications for medium-severity alerts' },
            { key: 'pipelineResults', label: 'Pipeline Results', desc: 'Notifications when CI/CD pipeline scans complete' },
            { key: 'agentStatus', label: 'Agent Status Changes', desc: 'Alert when agents go offline or reconnect' },
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[item.key as keyof typeof notifications] ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveNotifications}
            className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">API Key</h2>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Use this API key to authenticate requests to the SentinelOps API from external tools.
        </p>

        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={handleRegenerateKey}
            className="flex items-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Palette className="w-5 h-5 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Appearance</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === t
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${
                t === 'dark' ? 'bg-gray-800 border-2 border-gray-600' :
                t === 'light' ? 'bg-white border-2 border-gray-300' :
                'bg-gradient-to-r from-gray-800 to-white border-2 border-gray-500'
              }`} />
              <p className="text-white text-sm capitalize font-medium">{t}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Platform Information</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Version</p>
            <p className="text-white font-mono">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-500">Backend</p>
            <p className="text-white font-mono">Node.js / Express</p>
          </div>
          <div>
            <p className="text-gray-500">ML Engine</p>
            <p className="text-white font-mono">Python / Flask</p>
          </div>
          <div>
            <p className="text-gray-500">License</p>
            <p className="text-white font-mono">MIT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
