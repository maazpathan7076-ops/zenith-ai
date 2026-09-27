import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockViewProps {
  code: string;
  language?: string;
}

export const CodeBlockView: React.FC<CodeBlockViewProps> = ({ code, language = 'code' }) => {
  const [copied, setCopied] = useState(false);
  const cleanLanguage = (language || 'code').toLowerCase().trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting helper for code lines
  const renderHighlightedCode = (text: string) => {
    const keywords = new Set([
      'fun',
      'val',
      'var',
      'class',
      'interface',
      'object',
      'return',
      'if',
      'else',
      'for',
      'while',
      'when',
      'is',
      'in',
      'import',
      'package',
      'public',
      'private',
      'protected',
      'override',
      'def',
      'lambda',
      'const',
      'let',
      'function',
      'async',
      'await',
      'try',
      'catch',
      'finally',
      'throw',
      'null',
      'nil',
      'true',
      'false',
      'SELECT',
      'FROM',
      'WHERE',
      'JOIN',
      'INSERT',
      'UPDATE',
      'DELETE',
      'GROUP',
      'BY',
    ]);

    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Simple tokenization regex matching comments, strings, words, numbers, or symbols
      const regex = /(\/\/.*|#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[^\s\w'"]+|\s+)/g;
      const tokens = line.match(regex) || [line];

      return (
        <div key={lineIdx} className="table-row">
          <span className="table-cell pr-4 select-none text-right text-xs text-slate-600 dark:text-slate-600">
            {lineIdx + 1}
          </span>
          <span className="table-cell whitespace-pre">
            {tokens.map((token, tokIdx) => {
              if (token.startsWith('//') || token.startsWith('#')) {
                return (
                  <span key={tokIdx} className="italic text-slate-400 dark:text-slate-500">
                    {token}
                  </span>
                );
              }
              if (
                (token.startsWith('"') && token.endsWith('"')) ||
                (token.startsWith("'") && token.endsWith("'"))
              ) {
                return (
                  <span key={tokIdx} className="text-emerald-400">
                    {token}
                  </span>
                );
              }
              if (/^\d+(?:\.\d+)?$/.test(token)) {
                return (
                  <span key={tokIdx} className="text-amber-400">
                    {token}
                  </span>
                );
              }
              if (keywords.has(token)) {
                return (
                  <span key={tokIdx} className="font-semibold text-indigo-400">
                    {token}
                  </span>
                );
              }
              if (/^[A-Z][a-zA-Z0-9_]*$/.test(token)) {
                return (
                  <span key={tokIdx} className="text-sky-400">
                    {token}
                  </span>
                );
              }
              return (
                <span key={tokIdx} className="text-slate-200">
                  {token}
                </span>
              );
            })}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl bg-[#13151F] shadow-md border border-[#232736]">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#1E2130] px-3.5 py-1.5 text-xs text-slate-400">
        <span className="font-mono font-semibold lowercase text-slate-300">
          {cleanLanguage}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed">
        <div className="table min-w-full">{renderHighlightedCode(code)}</div>
      </div>
    </div>
  );
};
