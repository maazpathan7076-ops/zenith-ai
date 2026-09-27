import React, { useState } from 'react';
import {
  Info,
  Key,
  Palette,
  Sliders,
  Sparkles,
  Trash2,
  X,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { ALL_MODELS, AppSettings, ThemeMode } from '../types/chat';

interface SettingsDialogProps {
  settings: AppSettings;
  onUpdateTheme: (theme: ThemeMode) => void;
  onUpdateStreaming: (enabled: boolean) => void;
  onUpdateHaptic: (enabled: boolean) => void;
  onUpdateTemperature: (temp: number) => void;
  onUpdateDefaultModel: (modelId: string) => void;
  onUpdateApiKey: (key: string) => void;
  onClearAllChats: () => void;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  settings,
  onUpdateTheme,
  onUpdateStreaming,
  onUpdateHaptic,
  onUpdateTemperature,
  onUpdateDefaultModel,
  onUpdateApiKey,
  onClearAllChats,
  onClose,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(settings.customApiKey);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleApiKeyChange = (val: string) => {
    setApiKeyInput(val);
    onUpdateApiKey(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      data-testid="settings_dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[#2F3547] dark:bg-[#181B26]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-[#2F3547]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Sliders className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Appearance */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Palette className="h-4 w-4 text-indigo-500" />
              <span>Appearance</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateTheme(mode)}
                  className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-all ${
                    settings.themeMode === mode
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-[#2F3547] dark:bg-[#232736]/40 dark:text-slate-300 dark:hover:bg-[#232736]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* 2. AI Model Engine */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Bot className="h-4 w-4 text-indigo-500" />
              <span>AI Model Engine</span>
            </div>
            <div className="mt-3 space-y-2">
              {ALL_MODELS.map((model) => {
                const isSelected = model.id === settings.defaultModelId;
                return (
                  <button
                    key={model.id}
                    onClick={() => onUpdateDefaultModel(model.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-[#2F3547] dark:bg-[#232736]/40 dark:hover:bg-[#232736]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {model.name}
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400">
                        {model.indicator}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                        Default
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Temperature Slider */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-[#2F3547] dark:bg-[#232736]/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Creativity & Temperature
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {settings.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => onUpdateTemperature(parseFloat(e.target.value))}
                className="mt-2 w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* 3. Chat Preferences */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Sliders className="h-4 w-4 text-indigo-500" />
              <span>Chat Preferences</span>
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Stream Responses
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stream AI answers in real-time as tokens generate
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.isStreamingEnabled}
                  onChange={(e) => onUpdateStreaming(e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Haptic Feedback
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Subtle vibration on message actions
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.isHapticEnabled}
                  onChange={(e) => onUpdateHaptic(e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 4. Gemini API Credentials */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Key className="h-4 w-4 text-indigo-500" />
              <span>Gemini API Credentials</span>
            </div>
            <div className="mt-3">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Leave empty to use AI Studio runtime key"
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-[#2F3547] dark:text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Custom API key (optional). If not specified, AI Studio runtime key is automatically used.
              </p>
            </div>
          </div>

          {/* 5. Data & Privacy */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>Data & Privacy</span>
            </div>
            <div className="mt-3">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All Conversations</span>
              </button>
            </div>
          </div>

          {/* 6. About */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Info className="h-4 w-4 text-indigo-500" />
              <span>About Zenith AI</span>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#2F3547] dark:bg-[#232736]/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#6366F1] via-[#06B6D4] to-[#8B5CF6] text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Zenith AI v1.0.0
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                An original, production-quality AI assistant featuring real-time streaming, Markdown, LaTeX math rendering, syntax-highlighted code blocks, and conversation persistence.
              </p>
              <p className="mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                All chat history is stored strictly on your local device.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Chats */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#181B26]">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Clear All Chats?
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete all conversation history? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllChats();
                  setShowClearConfirm(false);
                }}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
