import React from 'react';
import { CheckCircle, Circle, Sparkles, X } from 'lucide-react';
import { ALL_MODELS, AiModelInfo } from '../types/chat';

interface ModelSelectorSheetProps {
  selectedModelId: string;
  onModelSelected: (model: AiModelInfo) => void;
  onClose: () => void;
}

export const ModelSelectorSheet: React.FC<ModelSelectorSheetProps> = ({
  selectedModelId,
  onModelSelected,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#2F3547] dark:bg-[#181B26]"
        data-testid="model_selector_sheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI Model Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select the intelligence profile for this chat
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

        {/* Model List */}
        <div className="mt-3 space-y-2.5">
          {ALL_MODELS.map((model) => {
            const isSelected = model.id === selectedModelId;
            return (
              <button
                key={model.id}
                onClick={() => {
                  onModelSelected(model);
                  onClose();
                }}
                className={`flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-[#2F3547] dark:bg-[#232736]/50 dark:hover:bg-[#232736]'
                }`}
                data-testid={`model_item_${model.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {model.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        model.indicator === 'High Quality'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {model.indicator}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {model.description}
                  </p>
                </div>

                <div>
                  {isSelected ? (
                    <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
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
