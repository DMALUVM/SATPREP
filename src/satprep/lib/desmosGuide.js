function lower(value) {
  return String(value || '').toLowerCase();
}

function genericSteps() {
  return [
    'Type the key expression from the question into Desmos exactly as written.',
    'Use parentheses to keep the order of operations correct.',
    'Match the calculator result to the answer choice format.',
  ];
}

export function getDesmosGuide(question) {
  if (!question) return null;
  if (question.calculator_allowed === false) return null;

  const domain = lower(question.domain);
  if (domain.startsWith('verbal')) return null;

  const skill = lower(question.skill);

  if (skill === 'linear-equations') {
    return {
      title: 'Desmos Method',
      steps: [
        'Enter the left side as y = ... and the right side as y = ... on a second line.',
        'Tap the intersection point. The x-value is the solution.',
        'Quick-check by substituting x back into the original equation.',
      ],
    };
  }

  if (skill === 'systems') {
    return {
      title: 'Desmos Method',
      steps: [
        'Graph both equations exactly as written.',
        'Tap the intersection point to get (x, y).',
        'Use the coordinate value the question asks for.',
      ],
    };
  }

  if (skill === 'quadratics') {
    return {
      title: 'Desmos Method',
      steps: [
        'Graph the quadratic as y = ... and also graph y = 0.',
        'Tap the x-intercepts to get the roots.',
        'If asked for larger/smaller root, compare the two x-values.',
      ],
    };
  }

  if (skill === 'functions') {
    return {
      title: 'Desmos Method',
      steps: [
        'Define the function in Desmos, for example f(x) = ...',
        'Evaluate by typing f(value) for the requested input.',
        'For function intersections, graph both and tap their intersection.',
      ],
    };
  }

  if (skill === 'inequalities') {
    return {
      title: 'Desmos Method',
      steps: [
        'Graph the boundary equation and compare sides with a test x-value.',
        'For answer choices, plug each choice into the inequality quickly.',
        'Select the value that makes the inequality true.',
      ],
    };
  }

  if (skill === 'exponents' || skill === 'exponential') {
    return {
      title: 'Desmos Method',
      steps: [
        'Type the expression using ^ for powers and parentheses for grouped terms.',
        'Let Desmos simplify/evaluate the numeric result.',
        'Compare result to choices or required form.',
      ],
    };
  }

  if (skill === 'percentages' || skill === 'ratios') {
    return {
      title: 'Desmos Method',
      steps: [
        'Type the percent multiplier method directly: original * (1 +/- rate).',
        'For ratio/proportion equations, enter both sides and solve by intersection.',
        'Use exact calculator values first, then round only if the question asks.',
      ],
    };
  }

  if (skill === 'statistics' || skill === 'data-interpretation' || skill === 'probability') {
    return {
      title: 'Desmos Method',
      steps: [
        'Use Desmos as a computation engine for mean, percent change, and totals.',
        'For tables/graphs, enter data points in a Desmos table when helpful.',
        'Check unit labels so computed values match what the question asks.',
      ],
    };
  }

  if (skill === 'trigonometry' || domain === 'geometry-trig') {
    return {
      title: 'Desmos Method',
      steps: [
        'For trig ratios, type the ratio directly (for example opposite/hypotenuse).',
        'For unknown angles, use inverse trig keys (arcsin, arccos, arctan).',
        'Confirm Desmos is in degree mode for SAT geometry/trig questions.',
      ],
    };
  }

  if (skill === 'circles' || skill === 'right-triangles' || skill === 'area-perimeter' || skill === 'volume') {
    return {
      title: 'Desmos Method',
      steps: [
        'Enter the geometry formula with the given values directly into Desmos.',
        'Keep pi as "pi" until the final step unless the question asks for decimal.',
        'Use the result to match the requested measure (area, volume, radius, etc.).',
      ],
    };
  }

  if (skill === 'word-problems') {
    return {
      title: 'Desmos Method',
      steps: [
        'Translate the word problem into one equation first.',
        'Enter the equation/expression in Desmos and solve/evaluate.',
        'Check that your result answers the exact question prompt.',
      ],
    };
  }

  return {
    title: 'Desmos Method',
    steps: genericSteps(),
  };
}
