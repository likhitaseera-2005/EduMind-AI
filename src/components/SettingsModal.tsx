import React, { useState, useEffect } from 'react';
import { X, Settings, Sun, Moon, Trash2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { LearningLevel } from '../types.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  learningLevel: LearningLevel;
  onChangeLearningLevel: (lvl: LearningLevel) => void;
  subject: string;
  onChangeSubject: (s: string) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  learningLevel,
  onChangeLearningLevel,
  subject: _subject,
  onChangeSubject: _onChangeSubject,
  onClearAllConversations,
}) => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const data = await api.getHealth();
      setHealthStatus(data);
    } catch (e: any) {
      setHealthStatus({ error: e?.message || 'Server check failed' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#222222]">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Settings & Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6">
          {/* Theme setting */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Appearance Theme</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Toggle between dark and light workspace</div>
            </div>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>

          {/* Default Learning Mode */}
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Default Pedagogical Mode
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
              Dictates explanation depth, analogy frequency, and problem hints
            </div>
            <select
              value={learningLevel}
              onChange={e => onChangeLearningLevel(e.target.value as LearningLevel)}
              className="w-full text-xs rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="Beginner">Beginner • Intuitive analogies & gentle foundations</option>
              <option value="Intermediate">Intermediate • Balanced academic rigor & practical examples</option>
              <option value="Advanced">Advanced • In-depth mathematical formalism & edge cases</option>
              <option value="Exam preparation">Exam preparation • High-yield recall, exam tips & common traps</option>
            </select>
          </div>

          {/* Backend Diagnostics */}
          <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" />
                Groq AI System Status
              </span>
              <button
                onClick={checkHealth}
                disabled={isCheckingHealth}
                className="text-zinc-400 hover:text-zinc-200 p-1"
                title="Refresh status"
              >
                <RefreshCw size={13} className={isCheckingHealth ? 'animate-spin' : ''} />
              </button>
            </div>
            {healthStatus ? (
              healthStatus.error ? (
                <div className="text-rose-400 flex items-center gap-1.5 text-[11px]">
                  <AlertCircle size={14} />
                  <span>Connection issue: {healthStatus.error}</span>
                </div>
              ) : (
                <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                  <div className="flex justify-between">
                    <span>Provider:</span>
                    <span className="text-emerald-400 font-semibold">{healthStatus.provider || 'Groq'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="text-emerald-400 font-semibold">{healthStatus.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backend Status:</span>
                    <span className="text-emerald-400">{healthStatus.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Key (GROQ_API_KEY):</span>
                    <span className={healthStatus.hasApiKey ? 'text-emerald-400' : 'text-amber-400'}>
                      {healthStatus.hasApiKey ? 'Configured (Active)' : 'Missing GROQ_API_KEY'}
                    </span>
                  </div>
                </div>
              )
            ) : (
              <span className="text-zinc-500 text-[11px]">Checking status...</span>
            )}
          </div>

          {/* Clear conversation data */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                  Clear All Chat History
                </div>
                <div className="text-[11px] text-zinc-500">
                  Permanently delete all saved sessions
                </div>
              </div>
              {confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onClearAllConversations();
                      setConfirmClear(false);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-xs bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-500"
                  >
                    Confirm Clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
