import React, { useState } from 'react';
import { Check, Copy, Sigma } from 'lucide-react';

interface DisplayFractionInfo {
  prefix: string;
  numerator: string;
  denominator: string;
  suffix: string;
}

export function extractBalancedBraces(
  text: string,
  startIndex: number
): { content: string; endIndex: number } | null {
  const open = text.indexOf('{', startIndex);
  if (open === -1) return null;
  let depth = 1;
  let i = open + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    if (depth === 0) {
      return { content: text.substring(open + 1, i), endIndex: i + 1 };
    }
    i++;
  }
  return null;
}

export function parseDisplayFraction(latex: string): DisplayFractionInfo | null {
  const trimmed = latex.trim();
  const fracIndex = trimmed.indexOf('\\frac');
  if (fracIndex === -1) return null;
  const prefix = trimmed.substring(0, fracIndex).trim();
  const numBrace = extractBalancedBraces(trimmed, fracIndex + 5);
  if (!numBrace) return null;
  const denBrace = extractBalancedBraces(trimmed, numBrace.endIndex);
  if (!denBrace) return null;
  const suffix = trimmed.substring(denBrace.endIndex).trim();
  return {
    prefix,
    numerator: numBrace.content,
    denominator: denBrace.content,
    suffix,
  };
}

const SUPER_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ',
  'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ',
  'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ'
};

const SUB_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ'
};

const BLACKBOARD_MAP: Record<string, string> = {
  A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼',
  F: '𝔽', G: '𝔾', H: 'ℍ', I: '𝕀', J: '𝕁',
  K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆',
  P: 'ℙ', Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋',
  U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏', Y: '𝕐',
  Z: 'ℤ',
};

export function formatLatexString(latex: string): string {
  let text = latex.trim();

  // 0. Normalize variants
  text = text.replace(/\\(dfrac|tfrac)/g, '\\frac');

  // 1. Text blocks: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, etc.
  const textCommands = [
    '\\text',
    '\\mathrm',
    '\\mathbf',
    '\\mathit',
    '\\textbf',
    '\\textit',
    '\\operatorname',
  ];
  for (const cmd of textCommands) {
    let idx = text.indexOf(cmd);
    while (idx !== -1) {
      const brace = extractBalancedBraces(text, idx + cmd.length);
      if (brace) {
        text = text.substring(0, idx) + brace.content + text.substring(brace.endIndex);
        idx = text.indexOf(cmd);
        continue;
      }
      idx = text.indexOf(cmd, idx + cmd.length);
    }
  }

  // 2. Blackboard bold: \mathbb{R} -> ℝ, \mathbb{N} -> ℕ, etc.
  let bbIdx = text.indexOf('\\mathbb');
  while (bbIdx !== -1) {
    const brace = extractBalancedBraces(text, bbIdx + 7);
    if (brace) {
      const char = brace.content.trim();
      const replacement = BLACKBOARD_MAP[char] || char;
      text = text.substring(0, bbIdx) + replacement + text.substring(brace.endIndex);
      bbIdx = text.indexOf('\\mathbb');
      continue;
    }
    // Also handle \mathbb without braces: \mathbb R
    const after = text.substring(bbIdx + 7).trimStart();
    const match = after.match(/^[A-Za-z]/);
    if (match) {
      const char = match[0];
      const replacement = BLACKBOARD_MAP[char] || char;
      const charIdx = text.indexOf(char, bbIdx + 7);
      text = text.substring(0, bbIdx) + replacement + text.substring(charIdx + 1);
      bbIdx = text.indexOf('\\mathbb');
      continue;
    }
    bbIdx = text.indexOf('\\mathbb', bbIdx + 7);
  }

  // 3. Degrees
  text = text
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\^\\circ/g, '°')
    .replace(/\\degree/g, '°')
    .replace(/\\circ/g, '°');

  // 4. Fractions: \frac{a}{b} and \frac a b
  let fracIdx = text.indexOf('\\frac');
  while (fracIdx !== -1) {
    const num = extractBalancedBraces(text, fracIdx + 5);
    if (num) {
      const den = extractBalancedBraces(text, num.endIndex);
      if (den) {
        const n = formatLatexString(num.content.trim());
        const d = formatLatexString(den.content.trim());
        let replacement = '';
        if (n === '1' && d === '2') replacement = '½';
        else if (n === '1' && d === '3') replacement = '⅓';
        else if (n === '2' && d === '3') replacement = '⅔';
        else if (n === '1' && d === '4') replacement = '¼';
        else if (n === '3' && d === '4') replacement = '¾';
        else if (n === '1' && d === '5') replacement = '⅕';
        else if (n === '2' && d === '5') replacement = '⅖';
        else if (n === '3' && d === '5') replacement = '⅗';
        else if (n === '4' && d === '5') replacement = '⅘';
        else if (n === '1' && d === '6') replacement = '⅙';
        else if (n === '5' && d === '6') replacement = '⅚';
        else if (n === '1' && d === '8') replacement = '⅛';
        else if (n === '3' && d === '8') replacement = '⅜';
        else if (n === '5' && d === '8') replacement = '⅝';
        else if (n === '7' && d === '8') replacement = '⅞';
        else if (!n.includes(' ') && !d.includes(' ') && !n.includes('\\') && !d.includes('\\')) {
          replacement = `${n}/${d}`;
        } else {
          replacement = `(${n}) / (${d})`;
        }
        text = text.substring(0, fracIdx) + replacement + text.substring(den.endIndex);
        fracIdx = text.indexOf('\\frac');
        continue;
      }
    }
    // Also handle \frac without braces: \frac 1 2, \frac12, \frac ab
    const after = text.substring(fracIdx + 5).trimStart();
    const matchSimple = after.match(/^([a-zA-Z0-9])\s*([a-zA-Z0-9])/);
    if (matchSimple) {
      const n = matchSimple[1];
      const d = matchSimple[2];
      const replacement = n === '1' && d === '2' ? '½' : `${n}/${d}`;
      const matchEnd = text.indexOf(d, fracIdx + 5) + 1;
      text = text.substring(0, fracIdx) + replacement + text.substring(matchEnd);
      fracIdx = text.indexOf('\\frac');
      continue;
    }
    fracIdx = text.indexOf('\\frac', fracIdx + 5);
  }

  // 5. Square roots: \sqrt{...} and \sqrt[n]{...} and \sqrt x
  let sqrtIdx = text.indexOf('\\sqrt');
  while (sqrtIdx !== -1) {
    let cursor = sqrtIdx + 5;
    let rootIndex = '';
    if (cursor < text.length && text[cursor] === '[') {
      const closeBracket = text.indexOf(']', cursor);
      if (closeBracket !== -1) {
        rootIndex = text.substring(cursor + 1, closeBracket).trim();
        cursor = closeBracket + 1;
      }
    }
    const brace = extractBalancedBraces(text, cursor);
    if (brace) {
      const inner = formatLatexString(brace.content.trim());
      const prefix =
        rootIndex === '3' ? '∛' : rootIndex === '4' ? '∜' : rootIndex ? `${rootIndex}√` : '√';
      const replacement = inner.length === 1 ? `${prefix}${inner}` : `${prefix}(${inner})`;
      text = text.substring(0, sqrtIdx) + replacement + text.substring(brace.endIndex);
      sqrtIdx = text.indexOf('\\sqrt');
      continue;
    }
    const after = text.substring(cursor).trimStart();
    const matchSingle = after.match(/^[a-zA-Z0-9]/);
    if (matchSingle) {
      const char = matchSingle[0];
      const prefix = rootIndex === '3' ? '∛' : rootIndex === '4' ? '∜' : rootIndex ? `${rootIndex}√` : '√';
      const replacement = `${prefix}${char}`;
      const charIdx = text.indexOf(char, cursor);
      text = text.substring(0, sqrtIdx) + replacement + text.substring(charIdx + 1);
      sqrtIdx = text.indexOf('\\sqrt');
      continue;
    }
    sqrtIdx = text.indexOf('\\sqrt', sqrtIdx + 5);
  }

  // 6. Delimiters and size modifiers (processed before command symbols to avoid collisions)
  const delimiterPairs: [string, string][] = [
    ['\\left(', '('],
    ['\\right)', ')'],
    ['\\left[', '['],
    ['\\right]', ']'],
    ['\\left\\{', '{'],
    ['\\right\\}', '}'],
    ['\\left|', '|'],
    ['\\right|', '|'],
    ['\\left.', ''],
    ['\\right.', ''],
    ['\\left', ''],
    ['\\right', ''],
    ['\\lbrace', '{'],
    ['\\rbrace', '}'],
    ['\\{', '{'],
    ['\\}', '}'],
  ];
  for (const [k, v] of delimiterPairs) {
    text = text.split(k).join(v);
  }

  // 7. Greek letters, math operators, relations, sets, and functions
  const commandsList: [string, string][] = [
    // Greek lowercase
    ['\\alpha', 'α'], ['\\beta', 'β'], ['\\gamma', 'γ'], ['\\delta', 'δ'],
    ['\\epsilon', 'ε'], ['\\varepsilon', 'ε'], ['\\zeta', 'ζ'], ['\\eta', 'η'],
    ['\\theta', 'θ'], ['\\vartheta', 'θ'], ['\\iota', 'ι'], ['\\kappa', 'κ'],
    ['\\lambda', 'λ'], ['\\mu', 'μ'], ['\\nu', 'ν'], ['\\xi', 'ξ'],
    ['\\pi', 'π'], ['\\varpi', 'ϖ'], ['\\rho', 'ρ'], ['\\varrho', 'ϱ'],
    ['\\sigma', 'σ'], ['\\varsigma', 'ς'], ['\\tau', 'τ'], ['\\upsilon', 'υ'],
    ['\\phi', 'φ'], ['\\varphi', 'ϕ'], ['\\chi', 'χ'], ['\\psi', 'ψ'], ['\\omega', 'ω'],
    // Greek uppercase
    ['\\Gamma', 'Γ'], ['\\Delta', 'Δ'], ['\\Theta', 'Θ'], ['\\Lambda', 'Λ'],
    ['\\Xi', 'Ξ'], ['\\Pi', 'Π'], ['\\Sigma', 'Σ'], ['\\Upsilon', 'Υ'],
    ['\\Phi', 'Φ'], ['\\Psi', 'Ψ'], ['\\Omega', 'Ω'],
    // Operators
    ['\\pm', ' ± '], ['\\mp', ' ∓ '], ['\\times', ' × '], ['\\cdot', ' · '], ['\\div', ' ÷ '],
    ['\\ast', ' * '], ['\\star', ' ★ '],
    // Relations (longest first)
    ['\\approx', ' ≈ '], ['\\equiv', ' ≡ '], ['\\simeq', ' ≃ '], ['\\cong', ' ≅ '], ['\\propto', ' ∝ '],
    ['\\leq', ' ≤ '], ['\\le', ' ≤ '],
    ['\\geq', ' ≥ '], ['\\ge', ' ≥ '],
    ['\\neq', ' ≠ '], ['\\ne', ' ≠ '],
    ['\\sim', ' ∼ '], ['\\infty', '∞'],
    // Sets & Logic
    ['\\notin', ' ∉ '], ['\\in', ' ∈ '],
    ['\\subseteq', ' ⊆ '], ['\\subset', ' ⊂ '],
    ['\\supseteq', ' ⊇ '], ['\\supset', ' ⊃ '],
    ['\\cup', ' ∪ '], ['\\cap', ' ∩ '], ['\\setminus', ' \\ '],
    ['\\emptyset', '∅'], ['\\varnothing', '∅'],
    ['\\forall', '∀'], ['\\exists', '∃'], ['\\nexists', '∄'],
    ['\\land', ' ∧ '], ['\\lor', ' ∨ '], ['\\neg', '¬'],
    ['\\mid', ' | '], ['\\vert', ' | '], ['\\parallel', ' ∥ '],
    // Arrows
    ['\\Leftrightarrow', ' ⇔ '], ['\\Rightarrow', ' ⇒ '], ['\\Leftarrow', ' ⇐ '],
    ['\\rightarrow', ' → '], ['\\leftarrow', ' ← '], ['\\iff', ' ⇔ '],
    ['\\to', ' → '], ['\\mapsto', ' ↦ '],
    // Calculus & Specials
    ['\\iiint', '∭'], ['\\iint', '∬'], ['\\oint', '∮'], ['\\int', '∫'],
    ['\\sum', '∑'], ['\\prod', '∏'], ['\\partial', '∂'], ['\\nabla', '∇'],
    ['\\hbar', 'ℏ'], ['\\prime', '′'],
    // Functions
    ['\\arcsin', 'arcsin'], ['\\arccos', 'arccos'], ['\\arctan', 'arctan'],
    ['\\sinh', 'sinh'], ['\\cosh', 'cosh'], ['\\tanh', 'tanh'],
    ['\\sin', 'sin'], ['\\cos', 'cos'], ['\\tan', 'tan'], ['\\cot', 'cot'],
    ['\\sec', 'sec'], ['\\csc', 'csc'],
    ['\\ln', 'ln'], ['\\log', 'log'], ['\\exp', 'exp'], ['\\lim', 'lim'],
    ['\\det', 'det'], ['\\max', 'max'], ['\\min', 'min'],
    // Spacing
    ['\\displaystyle', ''], ['\\textstyle', ''],
    ['\\qquad', '    '], ['\\quad', '  '],
    ['\\,', ' '], ['\\;', ' '], ['\\:', ' '], ['\\!', ''],
  ];

  // Sort by command length descending to avoid prefix collision
  commandsList.sort((a, b) => b[0].length - a[0].length);

  for (const [cmd, rep] of commandsList) {
    if (/^\\[a-zA-Z]+$/.test(cmd)) {
      // Use negative lookahead so alphabetic command only matches at command boundary
      const reg = new RegExp('\\' + cmd + '(?![a-zA-Z])', 'g');
      text = text.replace(reg, rep);
    } else {
      text = text.split(cmd).join(rep);
    }
  }

  // 8. Superscripts: ^{...} and ^X
  let supBraceIdx = text.indexOf('^{');
  while (supBraceIdx !== -1) {
    const brace = extractBalancedBraces(text, supBraceIdx + 1);
    if (brace) {
      const mapped = brace.content.split('').map((c) => SUPER_MAP[c] || c).join('');
      text = text.substring(0, supBraceIdx) + mapped + text.substring(brace.endIndex);
      supBraceIdx = text.indexOf('^{');
      continue;
    }
    supBraceIdx = text.indexOf('^{', supBraceIdx + 2);
  }
  text = text.replace(/\^([0-9a-zA-Z+\-=()])/g, (_, ch) => SUPER_MAP[ch] || `^${ch}`);

  // 9. Subscripts: _{...} and _X
  let subBraceIdx = text.indexOf('_{');
  while (subBraceIdx !== -1) {
    const brace = extractBalancedBraces(text, subBraceIdx + 1);
    if (brace) {
      const mapped = brace.content.split('').map((c) => SUB_MAP[c] || c).join('');
      text = text.substring(0, subBraceIdx) + mapped + text.substring(brace.endIndex);
      subBraceIdx = text.indexOf('_{');
      continue;
    }
    subBraceIdx = text.indexOf('_{', subBraceIdx + 2);
  }
  text = text.replace(/_([0-9a-zA-Z+\-=()])/g, (_, ch) => SUB_MAP[ch] || `_${ch}`);

  // 10. Spacing around '='
  text = text.replace(/([^\s=])=([^\s=])/g, '$1 = $2');
  text = text.replace(/([^\s=])=/g, '$1 = ');
  text = text.replace(/=([^\s=])/g, ' = $1');

  // Clean double spaces
  text = text.replace(/ {2,}/g, ' ');

  return text.trim();
}

interface LaTeXMathViewProps {
  latex: string;
}

export const LaTeXMathView: React.FC<LaTeXMathViewProps> = ({ latex }) => {
  const [copied, setCopied] = useState(false);

  const cleanLatex = latex
    .trim()
    .replace(/^\$\$|\$\$$/g, '')
    .replace(/^\\\[|\\\]$/g, '')
    .replace(/^\\\(|\\\)$/g, '')
    .trim();

  const fractionInfo = parseDisplayFraction(cleanLatex);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 max-w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
          <Sigma className="h-4 w-4" />
          <span className="tracking-wider">EQUATION</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Copy formula"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] text-emerald-500">Copied!</span>
            </>
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Horizontally scrollable equation content on mobile */}
      <div className="overflow-x-auto py-2 text-center font-serif text-lg text-slate-900 dark:text-slate-100 max-w-full scrollbar-thin">
        {fractionInfo ? (
          <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap min-w-max">
            {fractionInfo.prefix && (
              <span className="text-base sm:text-lg">{formatLatexString(fractionInfo.prefix)}</span>
            )}
            <div className="inline-flex flex-col items-center">
              <span className="px-2 text-base sm:text-lg">
                {formatLatexString(fractionInfo.numerator)}
              </span>
              <div className="h-[1.5px] w-full bg-slate-700 dark:bg-slate-300 my-0.5" />
              <span className="px-2 text-base sm:text-lg">
                {formatLatexString(fractionInfo.denominator)}
              </span>
            </div>
            {fractionInfo.suffix && (
              <span className="text-base sm:text-lg">{formatLatexString(fractionInfo.suffix)}</span>
            )}
          </div>
        ) : (
          <span className="inline-block whitespace-nowrap min-w-max text-base sm:text-lg">
            {formatLatexString(cleanLatex)}
          </span>
        )}
      </div>
    </div>
  );
};
