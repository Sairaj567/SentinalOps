// =============================================================================
// SentinelOps - Command Palette (Ctrl+K / Cmd+K)
// =============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, AlertTriangle, Bug, GitBranch,
  Zap, Server, Settings, LogOut, Shield, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const commands: CommandItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', description: 'Security overview and metrics', icon: <LayoutDashboard className="w-4 h-4" />, action: () => navigate('/dashboard'), keywords: ['home', 'overview', 'metrics'] },
    { id: 'alerts', label: 'Alerts', description: 'Security alerts and incidents', icon: <AlertTriangle className="w-4 h-4" />, action: () => navigate('/alerts'), keywords: ['incidents', 'warnings', 'critical'] },
    { id: 'vulnerabilities', label: 'Vulnerabilities', description: 'CVE tracking and remediation', icon: <Bug className="w-4 h-4" />, action: () => navigate('/vulnerabilities'), keywords: ['cve', 'bugs', 'patches', 'security'] },
    { id: 'pipeline', label: 'Pipeline', description: 'CI/CD security scan results', icon: <GitBranch className="w-4 h-4" />, action: () => navigate('/pipeline'), keywords: ['cicd', 'builds', 'scans', 'jenkins'] },
    { id: 'threats', label: 'AI Threats', description: 'AI-powered threat detection', icon: <Zap className="w-4 h-4" />, action: () => navigate('/threats'), keywords: ['ai', 'ml', 'anomaly', 'detection'] },
    { id: 'agents', label: 'Agents', description: 'Wazuh agent management', icon: <Server className="w-4 h-4" />, action: () => navigate('/agents'), keywords: ['wazuh', 'endpoints', 'monitoring'] },
    { id: 'settings', label: 'Settings', description: 'Account and platform settings', icon: <Settings className="w-4 h-4" />, action: () => navigate('/settings'), keywords: ['preferences', 'profile', 'config'] },
    { id: 'logout', label: 'Logout', description: 'Sign out of SentinelOps', icon: <LogOut className="w-4 h-4" />, action: () => { logout(); navigate('/login'); }, keywords: ['signout', 'exit'] },
  ], [navigate, logout]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower) ||
      cmd.keywords.some(k => k.includes(lower))
    );
  }, [query, commands]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] command-backdrop flex items-start justify-center pt-[20vh]" onClick={() => setIsOpen(false)}>
      <div
        className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-slide-down"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-gray-700">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 px-3 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-gray-500 bg-gray-900 border border-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); setIsOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                  i === selectedIndex ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${i === selectedIndex ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700 text-gray-400'}`}>
                  {cmd.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cmd.label}</p>
                  <p className="text-xs text-gray-500 truncate">{cmd.description}</p>
                </div>
                {i === selectedIndex && (
                  <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-[10px]">⏎</kbd>
              <span>Select</span>
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield className="w-3 h-3 text-cyan-500" />
            <span>SentinelOps</span>
          </div>
        </div>
      </div>
    </div>
  );
}
