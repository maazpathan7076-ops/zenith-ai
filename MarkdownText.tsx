import React from 'react';
import { CodeBlockView } from './CodeBlockView';
import { extractBalancedBraces, formatLatexString, LaTeXMathView } from './LaTeXMathView';

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string; depth: number }
  | { type: 'numbered'; number: string; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; language: string; code: string }
  | { type: 'math'; formula: string }
  | { type: 'divider' };

function isTableDivider(line: string): boolean {
  const clean = line.replace(/[|\-:\s]/g, '');
  return line.includes('-') && clean.length === 0;
}

function parseTableRow(row: string): string[] {
  const rawParts = row.split('|').map((s) => s.trim());
  if (rawParts.length > 0 && rawParts[0] === '') rawParts.shift();
  if (rawParts.length > 0 && rawParts[rawParts.length - 1] === '') rawParts.pop();
  return rawParts;
}

export function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = raw.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code block ```lang ... ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 2. Display Math block $$ ... $$ or \[ ... \]
    // Check if line contains $$ ... $$ or \[ ... \] embedded in text (not inside bullet/numbered prefixes)
    if (
      (trimmed.includes('$$') && !trimmed.startsWith('$$')) ||
      (trimmed.includes('\\[') && !trimmed.startsWith('\\['))
    ) {
      const hasDollar = trimmed.includes('$$');
      const hasBracket = trimmed.includes('\\[');
      let startMarker = '$$';
      if (!hasDollar) {
        startMarker = '\\[';
      } else if (hasBracket && trimmed.indexOf('\\[') < trimmed.indexOf('$$')) {
        startMarker = '\\[';
      }
      const splitIdx = trimmed.indexOf(startMarker);
      const before = trimmed.slice(0, splitIdx).trim();
      const after = trimmed.slice(splitIdx);

      // If 'before' is just a bullet or number prefix (e.g. '*' or '-' or '1.'), let list parser handle it
      if (!/^([-*]|\d+\.)\s*$/.test(before)) {
        if (before) {
          blocks.push({ type: 'paragraph', text: before });
        }
        lines[i] = after;
        continue;
      }
    }

    if (trimmed.startsWith('$$') || trimmed.startsWith('\\[')) {
      const isBracket = trimmed.startsWith('\\[');
      const endMarker = isBracket ? '\\]' : '$$';
      const startMarker = isBracket ? '\\[' : '$$';
      const rest = trimmed.slice(startMarker.length);
      const endIdx = rest.indexOf(endMarker);

      if (endIdx !== -1) {
        const formula = rest.slice(0, endIdx).trim();
        if (formula) {
          blocks.push({
            type: 'math',
            formula,
          });
        }
        const remaining = rest.slice(endIdx + endMarker.length).trim();
        if (remaining) {
          lines.splice(i + 1, 0, remaining);
        }
        i++;
        continue;
      } else {
        const mathLines: string[] = [];
        if (rest.trim()) mathLines.push(rest.trim());
        i++;
        while (i < lines.length && !lines[i].includes(endMarker)) {
          mathLines.push(lines[i].trim());
          i++;
        }
        if (i < lines.length) {
          const closeIdx = lines[i].indexOf(endMarker);
          const lastPart = lines[i].slice(0, closeIdx).trim();
          if (lastPart) mathLines.push(lastPart);
          const afterClose = lines[i].slice(closeIdx + endMarker.length).trim();
          if (afterClose) {
            lines.splice(i + 1, 0, afterClose);
          }
          i++;
        }
        blocks.push({
          type: 'math',
          formula: mathLines.join('\n'),
        });
        continue;
      }
    }

    // 3. Markdown Table
    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableDivider(lines[i + 1].trim())) {
      const headers = parseTableRow(trimmed);
      i += 2; // skip header and divider line
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i].trim()));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 4. Horizontal divider
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // 5. Headings
    if (trimmed.startsWith('#')) {
      const level = Math.min(trimmed.match(/^#+/)?.[0].length || 1, 4);
      const text = trimmed.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', level, text });
      i++;
      continue;
    }

    // 6. Blockquote
    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'blockquote', text: trimmed.replace(/^>\s*/, '') });
      i++;
      continue;
    }

    // 7. Bullet lists (with indentation)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\s+[-*]\s/.test(line)) {
      const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
      const depth = Math.min(Math.floor(leadingSpaces / 2), 3);
      const text = trimmed.replace(/^[-*]\s+/, '');
      blocks.push({ type: 'bullet', text, depth });
      i++;
      continue;
    }

    // 8. Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({
        type: 'numbered',
        number: numMatch[1],
        text: numMatch[2],
      });
      i++;
      continue;
    }

    // 9. Normal paragraph
    if (trimmed.length > 0) {
      blocks.push({ type: 'paragraph', text: trimmed });
    }
    i++;
  }

  return blocks;
}

// Helper to check for closing unescaped dollar sign
function findClosingDollar(str: string, startIndex: number): number {
  let idx = startIndex;
  while (idx < str.length) {
    const next$ = str.indexOf('$', idx);
    if (next$ === -1) return -1;
    if (next$ > 0 && str[next$ - 1] === '\\') {
      idx = next$ + 1;
      continue;
    }
    if (next$ + 1 < str.length && str[next$ + 1] === '$') {
      idx = next$ + 2;
      continue;
    }
    return next$;
  }
  return -1;
}

// Helper to determine if a '$' is normal currency (e.g. $100, $50.00, $50 to $100)
function isCurrencyDollar(str: string, startIndex: number): boolean {
  const after = str.slice(startIndex + 1);
  const currencyMatch = after.match(
    /^(\d+(?:,\d{3})*(?:\.\d{1,2})?(?:[kKmMbB])?)(?:\s|[.,;:!?)]|\/|$)/
  );
  if (!currencyMatch) return false;

  const next$ = findClosingDollar(str, startIndex + 1);
  if (next$ === -1) return true;

  const between = str.substring(startIndex + 1, next$);
  if (
    /\b(and|or|to|for|is|are|the|a|in|at|from|with|per|each)\b/i.test(between) &&
    !/[\\=+*^<>]/.test(between)
  ) {
    return true;
  }

  if (/^\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(between)) {
    const afterNext$ = str.slice(next$ + 1);
    if (!afterNext$.includes('$')) {
      return true;
    }
  }

  return false;
}

// Helper to parse display math $$...$$
function parseDisplayMathAt(
  str: string,
  startIndex: number
): { formula: string; endIndex: number } | null {
  if (!str.startsWith('$$', startIndex)) return null;
  if (startIndex > 0 && str[startIndex - 1] === '\\') return null;

  let searchIdx = startIndex + 2;
  while (searchIdx < str.length) {
    const end$ = str.indexOf('$$', searchIdx);
    if (end$ === -1) return null;
    if (str[end$ - 1] === '\\') {
      searchIdx = end$ + 2;
      continue;
    }
    const formula = str.substring(startIndex + 2, end$).trim();
    if (!formula) return null;
    return { formula, endIndex: end$ + 2 };
  }
  return null;
}

// Helper to determine if a '$' at startIndex is valid inline math
function parseInlineMathAt(
  str: string,
  startIndex: number
): { formula: string; endIndex: number } | null {
  if (str[startIndex] !== '$') return null;
  // Ignore display math $$
  if (str[startIndex + 1] === '$') return null;
  // Escaped \$
  if (startIndex > 0 && str[startIndex - 1] === '\\') return null;

  // Currency check
  if (isCurrencyDollar(str, startIndex)) return null;

  // Find next unescaped $
  let searchIndex = startIndex + 1;
  while (searchIndex < str.length) {
    const next$ = str.indexOf('$', searchIndex);
    if (next$ === -1) return null;
    if (str[next$ - 1] === '\\') {
      searchIndex = next$ + 1;
      continue;
    }
    if (next$ + 1 < str.length && str[next$ + 1] === '$') {
      searchIndex = next$ + 2;
      continue;
    }

    const rawContent = str.substring(startIndex + 1, next$);
    const content = rawContent.trim();

    // Rule 1: Not empty
    if (!content) return null;

    // Rule 2: No newlines in inline math
    if (rawContent.includes('\n')) return null;

    // Rule 3: If contains plain English words without math symbols, not math
    if (
      /\b(and|or|to|for|is|are|the|from|with|were|been)\b/i.test(content) &&
      !/[\\=+*^<>/_]/.test(content)
    ) {
      return null;
    }

    return { formula: content, endIndex: next$ + 1 };
  }

  return null;
}

export const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const renderFormattedTokens = (str: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < str.length) {
      // 1. Inline code: `code` (CRITICAL: never parse or modify LaTeX inside code blocks)
      if (str[i] === '`') {
        const nextBacktick = str.indexOf('`', i + 1);
        if (nextBacktick !== -1) {
          const code = str.substring(i + 1, nextBacktick);
          nodes.push(
            <code
              key={key++}
              className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[13px] text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
            >
              {code}
            </code>
          );
          i = nextBacktick + 1;
          continue;
        }
      }

      // 2. Display math: $$formula$$
      const displayMath = parseDisplayMathAt(str, i);
      if (displayMath) {
        nodes.push(<LaTeXMathView key={key++} latex={displayMath.formula} />);
        i = displayMath.endIndex;
        continue;
      }

      // 3. Display math with brackets: \[formula\]
      if (str.startsWith('\\[', i)) {
        const nextClose = str.indexOf('\\]', i + 2);
        if (nextClose !== -1) {
          const formula = str.substring(i + 2, nextClose);
          nodes.push(<LaTeXMathView key={key++} latex={formula} />);
          i = nextClose + 2;
          continue;
        }
      }

      // 4. Inline math: $formula$
      const inlineMath = parseInlineMathAt(str, i);
      if (inlineMath) {
        nodes.push(
          <span
            key={key++}
            className="font-serif italic text-indigo-600 dark:text-indigo-400 font-medium px-1 max-w-full overflow-x-auto align-middle inline-block whitespace-nowrap scrollbar-none"
          >
            {formatLatexString(inlineMath.formula)}
          </span>
        );
        i = inlineMath.endIndex;
        continue;
      }

      // 5. Escaped LaTeX math parentheses \(formula\)
      if (str.startsWith('\\(', i)) {
        const nextClose = str.indexOf('\\)', i + 2);
        if (nextClose !== -1) {
          const formula = str.substring(i + 2, nextClose);
          nodes.push(
            <span
              key={key++}
              className="font-serif italic text-indigo-600 dark:text-indigo-400 font-medium px-1 max-w-full overflow-x-auto align-middle inline-block whitespace-nowrap scrollbar-none"
            >
              {formatLatexString(formula)}
            </span>
          );
          i = nextClose + 2;
          continue;
        }
      }

      // 6. Links: [Label](url)
      if (str[i] === '[') {
        const closeBracket = str.indexOf(']', i + 1);
        if (
          closeBracket !== -1 &&
          closeBracket + 1 < str.length &&
          str[closeBracket + 1] === '('
        ) {
          const closeParen = str.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            const label = str.substring(i + 1, closeBracket);
            const url = str.substring(closeBracket + 2, closeParen);
            nodes.push(
              <a
                key={key++}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-500 hover:text-sky-600 underline font-medium"
              >
                {label}
              </a>
            );
            i = closeParen + 1;
            continue;
          }
        }
      }

      // 7. Bold: **text** or __text__
      if (str.startsWith('**', i)) {
        const nextBold = str.indexOf('**', i + 2);
        if (nextBold !== -1) {
          const boldText = str.substring(i + 2, nextBold);
          nodes.push(
            <strong key={key++} className="font-bold">
              {boldText}
            </strong>
          );
          i = nextBold + 2;
          continue;
        }
      } else if (str.startsWith('__', i)) {
        const nextBold = str.indexOf('__', i + 2);
        if (nextBold !== -1) {
          const boldText = str.substring(i + 2, nextBold);
          nodes.push(
            <strong key={key++} className="font-bold">
              {boldText}
            </strong>
          );
          i = nextBold + 2;
          continue;
        }
      }

      // 8. Italic: *text*
      if (
        str[i] === '*' &&
        (i === 0 || str[i - 1] !== '*') &&
        i + 1 < str.length &&
        str[i + 1] !== '*'
      ) {
        const nextStar = str.indexOf('*', i + 1);
        if (nextStar !== -1) {
          const italicText = str.substring(i + 1, nextStar);
          nodes.push(
            <em key={key++} className="italic">
              {italicText}
            </em>
          );
          i = nextStar + 1;
          continue;
        }
      }

      // 9. Standalone LaTeX set notation: \{ ... \}
      if (str.startsWith('\\{', i)) {
        const closeBrace = str.indexOf('\\}', i + 2);
        if (closeBrace !== -1) {
          const formula = str.substring(i, closeBrace + 2);
          nodes.push(
            <span
              key={key++}
              className="font-serif italic text-indigo-600 dark:text-indigo-400 font-medium px-1 max-w-full overflow-x-auto align-middle inline-block whitespace-nowrap scrollbar-none"
            >
              {formatLatexString(formula)}
            </span>
          );
          i = closeBrace + 2;
          continue;
        }
      }

      // 10. Standalone LaTeX command detection (e.g. \frac, \sqrt, \mathbb, \theta, \pi, \le, etc.)
      if (
        str.startsWith('\\frac', i) ||
        str.startsWith('\\sqrt', i) ||
        str.startsWith('\\mathbb', i) ||
        str.startsWith('\\sin', i) ||
        str.startsWith('\\cos', i) ||
        str.startsWith('\\tan', i) ||
        str.startsWith('\\theta', i) ||
        str.startsWith('\\pi', i) ||
        str.startsWith('\\le', i) ||
        str.startsWith('\\ge', i) ||
        str.startsWith('\\in', i) ||
        str.startsWith('\\mid', i)
      ) {
        if (str.startsWith('\\frac', i)) {
          const num = extractBalancedBraces(str, i + 5);
          if (num) {
            const den = extractBalancedBraces(str, num.endIndex);
            if (den) {
              const expr = str.substring(i, den.endIndex);
              nodes.push(
                <span
                  key={key++}
                  className="font-serif italic text-indigo-600 dark:text-indigo-400 font-medium px-1 max-w-full overflow-x-auto align-middle inline-block whitespace-nowrap scrollbar-none"
                >
                  {formatLatexString(expr)}
                </span>
              );
              i = den.endIndex;
              continue;
            }
          }
        } else if (str.startsWith('\\sqrt', i) || str.startsWith('\\mathbb', i)) {
          const cmd = str.startsWith('\\sqrt', i) ? '\\sqrt' : '\\mathbb';
          let cursor = i + cmd.length;
          if (cmd === '\\sqrt' && cursor < str.length && str[cursor] === '[') {
            const close = str.indexOf(']', cursor);
            if (close !== -1) cursor = close + 1;
          }
          const brace = extractBalancedBraces(str, cursor);
          if (brace) {
            const expr = str.substring(i, brace.endIndex);
            nodes.push(
              <span
                key={key++}
                className="font-serif italic text-indigo-600 dark:text-indigo-400 font-medium px-1 max-w-full overflow-x-auto align-middle inline-block whitespace-nowrap scrollbar-none"
              >
                {formatLatexString(expr)}
              </span>
            );
            i = brace.endIndex;
            continue;
          }
        }

        // Single word latex command
        const rest = str.substring(i);
        const match = rest.match(/^\\[a-zA-Z]+/);
        if (match) {
          const expr = match[0];
          nodes.push(
            <span
              key={key++}
              className="font-serif italic text-indigo-600 dark:text-indigo-400 font-medium px-1 max-w-full overflow-x-auto align-middle inline-block whitespace-nowrap scrollbar-none"
            >
              {formatLatexString(expr)}
            </span>
          );
          i += expr.length;
          continue;
        }
      }

      nodes.push(str[i]);
      i++;
    }

    return nodes;
  };

  return <>{renderFormattedTokens(text)}</>;
};

export const MarkdownContent: React.FC<{
  content: string;
  isStreaming?: boolean;
}> = ({ content, isStreaming = false }) => {
  const blocks = React.useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="w-full space-y-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h1 key={index} className="pt-2 text-xl font-bold tracking-tight">
                  <InlineMarkdown text={block.text} />
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2 key={index} className="pt-1.5 text-lg font-bold">
                  <InlineMarkdown text={block.text} />
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3 key={index} className="pt-1 text-base font-semibold">
                  <InlineMarkdown text={block.text} />
                </h3>
              );
            }
            return (
              <h4 key={index} className="pt-0.5 text-sm font-semibold">
                <InlineMarkdown text={block.text} />
              </h4>
            );
          }

          case 'paragraph':
            return (
              <p key={index} className="my-1">
                <InlineMarkdown text={block.text} />
              </p>
            );

          case 'bullet':
            return (
              <div
                key={index}
                className="flex items-start gap-2.5"
                style={{ paddingLeft: `${block.depth * 14}px` }}
              >
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <div className="flex-1">
                  <InlineMarkdown text={block.text} />
                </div>
              </div>
            );

          case 'numbered':
            return (
              <div key={index} className="flex items-start gap-2">
                <span className="shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
                  {block.number}.
                </span>
                <div className="flex-1">
                  <InlineMarkdown text={block.text} />
                </div>
              </div>
            );

          case 'blockquote':
            return (
              <blockquote
                key={index}
                className="my-2 flex items-start gap-2.5 rounded-lg border-l-4 border-indigo-500 bg-slate-100/60 p-3 italic text-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
              >
                <div className="flex-1">
                  <InlineMarkdown text={block.text} />
                </div>
              </blockquote>
            );

          case 'table':
            return (
              <div
                key={index}
                className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700"
                        >
                          <InlineMarkdown text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx % 2 === 1
                            ? 'bg-slate-50/50 dark:bg-slate-900/30'
                            : 'bg-transparent'
                        }
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2">
                            <InlineMarkdown text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'code':
            return (
              <CodeBlockView
                key={index}
                language={block.language}
                code={block.code}
              />
            );

          case 'math':
            return <LaTeXMathView key={index} latex={block.formula} />;

          case 'divider':
            return (
              <hr
                key={index}
                className="my-3 border-t border-slate-200 dark:border-slate-800"
              />
            );

          default:
            return null;
        }
      })}

      {/* Streaming cursor indicator */}
      {isStreaming && (
        <span className="inline-block h-4 w-2 animate-pulse rounded-[1px] bg-indigo-500 align-middle ml-1" />
      )}
    </div>
  );
};
