function normalizeFraction(text) {
  let out = String(text);
  const fracRegex = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
  let next = out.replace(fracRegex, '($1/$2)');
  while (next !== out) {
    out = next;
    next = out.replace(fracRegex, '($1/$2)');
  }
  return out;
}

function normalizeSqrt(text) {
  let out = String(text);
  const sqrtRegex = /\\sqrt\{([^{}]+)\}/g;
  let next = out.replace(sqrtRegex, '\u221A($1)');
  while (next !== out) {
    out = next;
    next = out.replace(sqrtRegex, '\u221A($1)');
  }
  return out;
}

function normalizeExponents(text) {
  const superMap = {
    '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
    '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
    '8': '\u2078', '9': '\u2079', 'n': '\u207F', '-': '\u207B',
  };
  return text
    .replace(/\^{([^{}]+)}/g, (_, exp) =>
      [...exp].map((c) => superMap[c] || c).join('')
    )
    .replace(/\^(\d)/g, (_, d) => superMap[d] || d);
}

export function toStudentFriendlyMathText(input) {
  if (typeof input !== 'string') return '';

  return normalizeExponents(normalizeSqrt(normalizeFraction(input)))
    .replace(/\$\$?/g, '')
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\theta\b/g, '\u03B8')
    .replace(/\\pi\b/g, '\u03C0')
    .replace(/\\times/g, ' \u00D7 ')
    .replace(/\\cdot/g, ' \u00B7 ')
    .replace(/\\leq?\b/g, '\u2264')
    .replace(/\\geq?\b/g, '\u2265')
    .replace(/\\neq\b/g, '\u2260')
    .replace(/\\approx\b/g, '\u2248')
    .replace(/\\pm\b/g, '\u00B1')
    .replace(/\\infty\b/g, '\u221E')
    .replace(/\\degree\b/g, '\u00B0')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toStudentFriendlyMathList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => toStudentFriendlyMathText(value));
}
