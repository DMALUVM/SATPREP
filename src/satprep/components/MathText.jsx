import katex from 'katex';
import 'katex/dist/katex.min.css';
import React, { useMemo } from 'react';
import { toStudentFriendlyMathText } from '../lib/textFormat';

// Pre-process non-standard LaTeX commands for KaTeX compatibility
function preprocess(latex) {
  return latex.replace(/\\degree\b/g, '^{\\circ}');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LATEX_CMD_RE = /\\(frac|sqrt|times|cdot|theta|pi|sin|cos|tan|le|ge|neq|approx|pm|infty|degree|text)\b/;

function renderKatex(text) {
  const parts = [];
  let lastIndex = 0;

  // Match $$...$$ (display math) and $...$ (inline math)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    const latex = match[1] || match[2];
    const displayMode = !!match[1];

    try {
      parts.push(
        katex.renderToString(preprocess(latex), {
          throwOnError: false,
          displayMode,
        })
      );
    } catch {
      parts.push(escapeHtml(match[0]));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join('');
}

/**
 * Renders text with inline KaTeX math.
 * - $...$ and $$...$$ delimited LaTeX → KaTeX rendered math
 * - Bare LaTeX commands (no $ delimiters) → unicode fallback
 * - Plain text → rendered as-is
 */
export default function MathText({ text }) {
  const result = useMemo(() => {
    if (typeof text !== 'string' || !text) return { mode: 'empty' };

    if (text.includes('$')) {
      return { mode: 'katex', html: renderKatex(text) };
    }

    // Bare LaTeX without $ delimiters — use unicode fallback
    if (LATEX_CMD_RE.test(text)) {
      return { mode: 'fallback', text: toStudentFriendlyMathText(text) };
    }

    return { mode: 'plain' };
  }, [text]);

  if (result.mode === 'empty') return null;
  if (result.mode === 'katex') {
    return <span dangerouslySetInnerHTML={{ __html: result.html }} />;
  }
  if (result.mode === 'fallback') return <>{result.text}</>;
  return <>{text}</>;
}
