import React from 'react';
import {
  Brain,
  CheckCircle,
  Circle,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import { AI_MODES, AiModeConfig } from '../types/chat';

interface ModeSelectorSheetProps {
  selectedMode: AiModeConfig;
  onModeSelected: (mode: AiModeConfig) => void;
  onClose: () => void;
}

export const ModeSelectorSheet: React.FC<ModeSelectorSheetProps> = ({
  selectedMode,
  onModeSelected,
  onClose,
}) => {
  const modes = Object.values(AI_MODES);

  const getModeIcon = (modeId: string) => {
    switch (modeId) {
      case 'web_search':
        return <Globe className="h-5 w-5" />;
      case 'deep_research':
        return <Brain className="h-5 w-5" />;
      case 'create_image':
        return <ImageIcon className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#2F3547] dark:bg-[#181B26]"
        data-testid="mode_selector_sheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Zenith AI Modes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch focus mode for this conversation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode List */}
        <div className="mt-3 space-y-2.5">
          {modes.map((mode) => {
            const isSelected = mode.id === selectedMode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  onModeSelected(mode);
                  onClose();
                }}
                className={`flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-[#2F3547] dark:bg-[#232736]/50 dark:hover:bg-[#232736]'
                }`}
                data-testid={`mode_item_${mode.id}`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${mode.accentColor}18`,
                    color: mode.accentColor,
                  }}
                >
                  {getModeIcon(mode.id)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {mode.title}
                    </span>
                    <span className="text-[11px] text-slate-400">({mode.subtitle})</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <div>
                  {isSelected ? (
                    <CheckCircle
                      className="h-5 w-5"
                      style={{ color: mode.accentColor }}
                    />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
