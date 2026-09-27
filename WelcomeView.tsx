import React from 'react';
import { Calculator, Code, FileText, Lightbulb, Sparkles } from 'lucide-react';

interface PromptStarter {
  title: string;
  prompt: string;
  icon: React.ReactNode;
  accentColor: string;
}

interface WelcomeViewProps {
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectPrompt }) => {
  const starters: PromptStarter[] = [
    {
      title: 'Explain Concept',
      prompt: 'Explain quantum computing in simple terms with an everyday analogy.',
      icon: <Lightbulb className="h-5 w-5" />,
      accentColor: '#6366F1',
    },
    {
      title: 'Code Architecture',
      prompt: 'Write a modern TypeScript async function with error handling and retry logic.',
      icon: <Code className="h-5 w-5" />,
      accentColor: '#0EA5E9',
    },
    {
      title: 'Math & Physics',
      prompt: 'Derive the solution step-by-step for the integral: $$\\int x \\cdot e^x \\, dx$$',
      icon: <Calculator className="h-5 w-5" />,
      accentColor: '#8B5CF6',
    },
    {
      title: 'Draft Content',
      prompt:
        'Draft a warm, polite email thanking a colleague for collaboration while declining an extra project.',
      icon: <FileText className="h-5 w-5" />,
      accentColor: '#EC4899',
    },
  ];

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center overflow-y-auto px-4 py-8 text-center"
      data-testid="welcome_view"
    >
      <div className="w-full max-w-xl space-y-6">
        {/* Glowing Zenith AI Emblem */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#6366F1] via-[#06B6D4] to-[#8B5CF6] text-white shadow-lg shadow-indigo-500/25">
          <Sparkles className="h-8 w-8" />
        </div>

        {/* Headings */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Where would you like to start?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Zenith AI is ready to analyze, write, code, and solve with you.
          </p>
        </div>

        {/* Grid of Starter Cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-left pt-2">
          {starters.map((item) => (
            <button
              key={item.title}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-400 hover:shadow-md dark:border-[#2F3547] dark:bg-[#181B26] dark:hover:border-indigo-500"
              data-testid={`prompt_starter_${item.title.replace(/\s+/g, '_').toLowerCase()}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${item.accentColor}18`,
                    color: item.accentColor,
                  }}
                >
                  {item.icon}
                </div>
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {item.title}
                </span>
              </div>
              <p className="mt-2.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {item.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
