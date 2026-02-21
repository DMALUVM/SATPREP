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
  let next = out.replace(sqrtRegex, 'square root of ($1)');
  while (next !== out) {
    out = next;
    next = out.replace(sqrtRegex, 'square root of ($1)');
  }
  return out;
}

export function toStudentFriendlyMathText(input) {
  if (typeof input !== 'string') return '';

  return normalizeSqrt(normalizeFraction(input))
    .replace(/\$\$?/g, '')
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\sin\b/g, 'sine')
    .replace(/\\cos\b/g, 'cosine')
    .replace(/\\tan\b/g, 'tangent')
    .replace(/\bsin\b/gi, 'sine')
    .replace(/\bcos\b/gi, 'cosine')
    .replace(/\btan\b/gi, 'tangent')
    .replace(/\b(sine|cosine|tangent)\s+([A-Za-z])\b/g, '$1 of angle $2')
    .replace(/\\theta\b/g, 'theta')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\times/g, ' x ')
    .replace(/\\cdot/g, ' x ')
    .replace(/\\leq?\b/g, '<=')
    .replace(/\\geq?\b/g, '>=')
    .replace(/\\neq\b/g, '!=')
    .replace(/\\approx\b/g, 'approximately')
    .replace(/\\pm\b/g, '+/-')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toStudentFriendlyMathList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => toStudentFriendlyMathText(value));
}
