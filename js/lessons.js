// SAT Math Lesson Content
// 10 comprehensive lessons covering all Digital SAT Math topics

window.SAT_LESSONS = [
{
    id: "linear-equations",
    topic: "algebra",
    title: "Linear Equations",
    description: "Master solving equations with one variable - the #1 most tested topic on the SAT.",
    difficulty: 1,
    estimatedMinutes: 20,
    keyFormulas: [
        "To solve for $x$: undo operations in reverse order (PEMDAS backwards)",
        "Whatever you do to one side, you MUST do to the other",
        "Distribute before combining: $a(b + c) = ab + ac$"
    ],
    questionIds: ["alg-lin-001","alg-lin-002","alg-lin-003","alg-lin-004","alg-lin-005"],
    content: "<h3>What is a Linear Equation?</h3><p>A linear equation is an equation where the variable (usually $x$) has no exponents. The SAT <strong>loves</strong> these questions, and they are the easiest points to earn. Master this section first.</p><h3>One-Step Equations</h3><p>These are the simplest: just one operation to undo.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $x + 5 = 12$</p><div class=\"explanation-text\"><div class=\"step\">Subtract 5 from both sides: $x = 7$</div></div></div><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $3x = 21$</p><div class=\"explanation-text\"><div class=\"step\">Divide both sides by 3: $x = 7$</div></div></div><h3>Two-Step Equations</h3><p>Undo addition/subtraction first, THEN multiplication/division.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $2x + 5 = 13$</p><div class=\"explanation-text\"><div class=\"step\">Step 1: Subtract 5 from both sides: $2x = 8$</div><div class=\"step\">Step 2: Divide both sides by 2: $x = 4$</div></div></div><h3>Multi-Step Equations</h3><p>When there are parentheses, <strong>distribute first</strong>, then combine like terms.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $3(x + 2) - 4 = 11$</p><div class=\"explanation-text\"><div class=\"step\">Step 1: Distribute: $3x + 6 - 4 = 11$</div><div class=\"step\">Step 2: Combine like terms: $3x + 2 = 11$</div><div class=\"step\">Step 3: Subtract 2: $3x = 9$</div><div class=\"step\">Step 4: Divide by 3: $x = 3$</div></div></div><h3>Variables on Both Sides</h3><p>Get all variable terms on one side and all constants on the other.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $5x - 3 = 2x + 9$</p><div class=\"explanation-text\"><div class=\"step\">Step 1: Subtract $2x$ from both sides: $3x - 3 = 9$</div><div class=\"step\">Step 2: Add 3: $3x = 12$</div><div class=\"step\">Step 3: Divide by 3: $x = 4$</div></div></div><h3>Equations with Fractions</h3><p>The fastest approach: <strong>multiply everything by the LCD</strong> (least common denominator) to clear all fractions.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $\\frac{x}{3} + \\frac{x}{4} = 7$</p><div class=\"explanation-text\"><div class=\"step\">LCD is 12. Multiply everything by 12: $4x + 3x = 84$</div><div class=\"step\">Combine: $7x = 84$</div><div class=\"step\">Divide: $x = 12$</div></div></div><div class=\"lesson-key-point\"><strong>SAT Tip</strong>On the SAT, if an equation looks complicated, try plugging in the answer choices! Start with choice B or C.</div>"
},
{
    id: "linear-functions",
    topic: "algebra",
    title: "Linear Functions & Graphs",
    description: "Understand slope, y-intercept, and how to read linear graphs - appears on every SAT.",
    difficulty: 1,
    estimatedMinutes: 25,
    keyFormulas: [
        "Slope-intercept form: $y = mx + b$ where $m$ = slope, $b$ = y-intercept",
        "Slope formula: $m = \\frac{y_2 - y_1}{x_2 - x_1}$",
        "Parallel lines: same slope | Perpendicular lines: slopes multiply to $-1$"
    ],
    questionIds: ["alg-lf-001","alg-lf-002","alg-lf-003","alg-lf-004","alg-lf-005"],
    content: "<h3>Slope-Intercept Form: $y = mx + b$</h3><p>This is the most important equation format on the SAT. Know it cold.</p><ul><li><strong>$m$</strong> = slope = rate of change (how steep the line is)</li><li><strong>$b$</strong> = y-intercept = where the line crosses the y-axis (the starting value)</li></ul><h3>Understanding Slope</h3><p>Slope tells you how much $y$ changes when $x$ increases by 1.</p><ul><li>Positive slope: line goes UP from left to right</li><li>Negative slope: line goes DOWN from left to right</li><li>Zero slope: horizontal line</li><li>Undefined slope: vertical line</li></ul><div class=\"lesson-formula\">$m = \\frac{\\text{rise}}{\\text{run}} = \\frac{y_2 - y_1}{x_2 - x_1}$</div><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Find the slope through $(2, 3)$ and $(6, 11)$</strong></p><div class=\"explanation-text\"><div class=\"step\">$m = \\frac{11-3}{6-2} = \\frac{8}{4} = 2$</div></div></div><h3>Interpreting in Context</h3><p>The SAT loves to ask what slope and y-intercept mean in real-world scenarios.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>A plumber charges according to $C = 50h + 75$ where $C$ is cost and $h$ is hours.</p><p><strong>Slope (50):</strong> The plumber charges $50 per hour</p><p><strong>Y-intercept (75):</strong> There is a $75 flat/base fee</p></div><h3>Parallel and Perpendicular Lines</h3><ul><li><strong>Parallel</strong> lines have the <strong>same slope</strong></li><li><strong>Perpendicular</strong> lines have slopes that are <strong>negative reciprocals</strong> (flip and negate)</li></ul><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Line A has slope 3. What is the slope of a perpendicular line?</p><div class=\"explanation-text\"><div class=\"step\">Flip: $\\frac{1}{3}$. Negate: $-\\frac{1}{3}$.</div></div></div><div class=\"lesson-key-point\"><strong>SAT Tip</strong>When the SAT asks you to find the equation of a line, get slope first, then use $y = mx + b$ with a known point to find $b$.</div>"
},
{
    id: "systems",
    topic: "algebra",
    title: "Systems of Equations",
    description: "Solve two equations with two unknowns - a guaranteed topic on every SAT.",
    difficulty: 2,
    estimatedMinutes: 25,
    keyFormulas: [
        "Substitution: Solve one equation for a variable, plug into the other",
        "Elimination: Add or subtract equations to eliminate a variable",
        "No solution = parallel lines (same slope, different intercept)",
        "Infinite solutions = same line (one equation is a multiple of the other)"
    ],
    questionIds: ["alg-sys-001","alg-sys-002","alg-sys-003","alg-sys-004","alg-sys-005"],
    content: "<h3>What is a System?</h3><p>A system is two equations with two unknowns. You need to find values that make BOTH equations true.</p><h3>Method 1: Substitution</h3><p>Best when one variable is already isolated (like $y = $ something or $x = $ something).</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $y = 2x + 1$ and $3x + y = 11$</p><div class=\"explanation-text\"><div class=\"step\">Step 1: First equation already gives us $y = 2x + 1$</div><div class=\"step\">Step 2: Substitute into second: $3x + (2x + 1) = 11$</div><div class=\"step\">Step 3: Solve: $5x + 1 = 11$, $5x = 10$, $x = 2$</div><div class=\"step\">Step 4: Back-substitute: $y = 2(2) + 1 = 5$</div><div class=\"step\">Solution: $(2, 5)$</div></div></div><h3>Method 2: Elimination</h3><p>Best when you can easily add or subtract equations to cancel a variable.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $x + y = 10$ and $x - y = 4$</p><div class=\"explanation-text\"><div class=\"step\">Step 1: Add the equations: $2x = 14$, so $x = 7$</div><div class=\"step\">Step 2: Substitute: $7 + y = 10$, so $y = 3$</div></div></div><h3>Number of Solutions</h3><div class=\"lesson-key-point\"><strong>Key Concept</strong><br><strong>One solution:</strong> Lines intersect at one point (different slopes)<br><strong>No solution:</strong> Lines are parallel (same slope, different y-intercept)<br><strong>Infinite solutions:</strong> Lines are the same (one equation is a multiple of the other)</div><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>How many solutions?</strong> $2x + 4y = 8$ and $x + 2y = 4$</p><div class=\"explanation-text\"><div class=\"step\">The first equation = 2 times the second. Same line! Infinite solutions.</div></div></div>"
},
{
    id: "ratios-percents",
    topic: "problem-solving",
    title: "Ratios, Proportions & Percentages",
    description: "Master the concepts that appear in nearly every SAT math section.",
    difficulty: 1,
    estimatedMinutes: 25,
    keyFormulas: [
        "Proportion: $\\frac{a}{b} = \\frac{c}{d}$, cross multiply: $ad = bc$",
        "Percent of: $x\\% \\text{ of } n = \\frac{x}{100} \\times n$",
        "Percent change: $\\frac{\\text{new} - \\text{old}}{\\text{old}} \\times 100$",
        "Percent increase: new = original $\\times (1 + r)$ | Decrease: $\\times (1 - r)$"
    ],
    questionIds: ["ps-rat-001","ps-rat-002","ps-pct-001","ps-pct-002","ps-pct-004"],
    content: "<h3>Ratios</h3><p>A ratio compares two quantities. If the ratio of cats to dogs is 3:5, that means for every 3 cats there are 5 dogs.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>The ratio of boys to girls is 2:3. If there are 30 students total, how many boys?</p><div class=\"explanation-text\"><div class=\"step\">Total parts: $2 + 3 = 5$</div><div class=\"step\">Each part: $30 \\div 5 = 6$</div><div class=\"step\">Boys: $2 \\times 6 = 12$</div></div></div><h3>Proportions</h3><p>When two ratios are equal, cross-multiply to solve.</p><div class=\"lesson-formula\">$\\frac{a}{b} = \\frac{c}{d} \\implies ad = bc$</div><h3>Percentages</h3><p>Percent means \"per hundred.\" 15% means 15 out of every 100.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>What is 35% of 80?</strong></p><div class=\"explanation-text\"><div class=\"step\">$0.35 \\times 80 = 28$</div></div></div><h3>Percent Change</h3><p>This is the #1 most-missed percent concept on the SAT.</p><div class=\"lesson-formula\">$\\text{Percent Change} = \\frac{\\text{New} - \\text{Old}}{\\text{Old}} \\times 100$</div><div class=\"lesson-key-point\"><strong>Critical Rule</strong>Always divide by the ORIGINAL value, not the new value. This is the most common mistake.</div><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Price goes from $40 to $52. Percent increase?</p><div class=\"explanation-text\"><div class=\"step\">Change: $52 - 40 = 12$</div><div class=\"step\">Percent: $\\frac{12}{40} \\times 100 = 30\\%$</div></div></div><h3>Successive Percent Changes</h3><p>A tricky SAT favorite: +10% then -10% does NOT return to the original!</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Start with 100. Increase 20%, then decrease 20%.</p><div class=\"explanation-text\"><div class=\"step\">After +20%: $100 \\times 1.20 = 120$</div><div class=\"step\">After -20%: $120 \\times 0.80 = 96$ (NOT 100!)</div></div></div>"
},
{
    id: "statistics",
    topic: "problem-solving",
    title: "Statistics & Data",
    description: "Mean, median, mode and interpreting data - easy points once you know the rules.",
    difficulty: 1,
    estimatedMinutes: 20,
    keyFormulas: [
        "Mean (average) = $\\frac{\\text{sum of values}}{\\text{number of values}}$",
        "Median = middle value when data is sorted",
        "Mode = most frequently occurring value",
        "Range = maximum - minimum"
    ],
    questionIds: ["ps-stat-001","ps-stat-002","ps-stat-003","ps-stat-004","ps-stat-005"],
    content: "<h3>Mean (Average)</h3><p>Add all values and divide by how many there are.</p><div class=\"lesson-formula\">$\\text{Mean} = \\frac{\\text{Sum}}{\\text{Count}}$</div><div class=\"lesson-key-point\"><strong>Powerful Trick</strong>If you know the mean and count, you can find the sum: $\\text{Sum} = \\text{Mean} \\times \\text{Count}$. The SAT uses this constantly!</div><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>5 tests have a mean of 82. What is the total of all scores?</p><div class=\"explanation-text\"><div class=\"step\">Sum = $82 \\times 5 = 410$</div></div></div><h3>Median</h3><p>The middle value when sorted. For an even number of values, average the two middle ones.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Find the median of: 14, 7, 3, 9, 12</p><div class=\"explanation-text\"><div class=\"step\">Sort: 3, 7, 9, 12, 14</div><div class=\"step\">Middle value (3rd of 5): 9</div></div></div><h3>Mean vs. Median</h3><p>The SAT often asks how adding or removing a value affects these.</p><ul><li>Adding a value above the mean raises the mean</li><li>Adding a value below the mean lowers the mean</li><li>Outliers affect the mean much more than the median</li><li>Mean > Median = right skew (pulled by high values)</li></ul><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Data: 5, 6, 7, 8, 9 (mean = 7, median = 7). Add 100.</p><div class=\"explanation-text\"><div class=\"step\">New data: 5, 6, 7, 8, 9, 100</div><div class=\"step\">New mean: $135/6 = 22.5$ (jumped way up!)</div><div class=\"step\">New median: average of 7 and 8 = 7.5 (barely changed)</div></div></div>"
},
{
    id: "quadratics",
    topic: "advanced-math",
    title: "Quadratic Equations",
    description: "Factoring, the quadratic formula, and vertex form - essential for scoring 650+.",
    difficulty: 2,
    estimatedMinutes: 30,
    keyFormulas: [
        "Standard form: $ax^2 + bx + c = 0$",
        "Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$",
        "Vertex form: $y = a(x-h)^2 + k$, vertex at $(h, k)$",
        "Vertex x-coordinate: $x = \\frac{-b}{2a}$",
        "Discriminant: $b^2 - 4ac$ | positive=2 solutions, zero=1, negative=0"
    ],
    questionIds: ["am-quad-001","am-quad-002","am-quad-003","am-quad-004","am-quad-005"],
    content: "<h3>What is a Quadratic?</h3><p>A quadratic equation has an $x^2$ term. The graph is a parabola (U-shape).</p><h3>Method 1: Factoring</h3><p>For $x^2 + bx + c = 0$, find two numbers that <strong>multiply to $c$</strong> and <strong>add to $b$</strong>.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Solve:</strong> $x^2 - 5x + 6 = 0$</p><div class=\"explanation-text\"><div class=\"step\">Need two numbers that multiply to 6 and add to -5</div><div class=\"step\">Those numbers are -2 and -3</div><div class=\"step\">Factor: $(x-2)(x-3) = 0$</div><div class=\"step\">Set each factor = 0: $x = 2$ or $x = 3$</div></div></div><h3>Method 2: Quadratic Formula</h3><p>Works for ANY quadratic. Use when factoring is not obvious.</p><div class=\"lesson-formula\">$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$</div><div class=\"lesson-key-point\"><strong>Memorization Tip</strong>\"Negative b, plus or minus the square root, of b squared minus 4ac, all over 2a.\" Say it out loud 10 times!</div><h3>The Discriminant</h3><p>The expression under the square root, $b^2 - 4ac$, tells you how many solutions:</p><ul><li>$b^2-4ac > 0$: Two real solutions</li><li>$b^2-4ac = 0$: Exactly one solution</li><li>$b^2-4ac < 0$: No real solutions</li></ul><h3>Vertex Form</h3><p>$y = a(x-h)^2 + k$ tells you the vertex is at $(h, k)$.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>$y = 2(x-3)^2 + 5$ has vertex at $(3, 5)$.</p><p>$y = -(x+1)^2 - 4$ has vertex at $(-1, -4)$. (Note: $x+1 = x-(-1)$)</p></div><h3>Finding the Vertex from Standard Form</h3><div class=\"lesson-formula\">$x_{\\text{vertex}} = \\frac{-b}{2a}$</div><p>Then plug this x-value back in to find the y-coordinate.</p>"
},
{
    id: "exponents-functions",
    topic: "advanced-math",
    title: "Exponents, Polynomials & Functions",
    description: "The rules of exponents and how functions work - know these cold.",
    difficulty: 2,
    estimatedMinutes: 25,
    keyFormulas: [
        "Product: $x^a \\cdot x^b = x^{a+b}$",
        "Quotient: $\\frac{x^a}{x^b} = x^{a-b}$",
        "Power: $(x^a)^b = x^{ab}$",
        "Zero: $x^0 = 1$ | Negative: $x^{-n} = \\frac{1}{x^n}$",
        "FOIL: $(a+b)(c+d) = ac+ad+bc+bd$"
    ],
    questionIds: ["am-exp-001","am-exp-002","am-exp-003","am-func-001","am-func-002"],
    content: "<h3>Exponent Rules</h3><p>These rules are tested on EVERY SAT. Memorize them.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">The Rules</div><p><strong>Product Rule:</strong> $x^3 \\cdot x^4 = x^{3+4} = x^7$ (same base? ADD exponents)</p><p><strong>Quotient Rule:</strong> $\\frac{x^8}{x^3} = x^{8-3} = x^5$ (dividing? SUBTRACT exponents)</p><p><strong>Power Rule:</strong> $(x^3)^4 = x^{3 \\cdot 4} = x^{12}$ (power of a power? MULTIPLY)</p><p><strong>Zero Rule:</strong> $x^0 = 1$ (anything to the 0 is 1)</p><p><strong>Negative Rule:</strong> $x^{-3} = \\frac{1}{x^3}$ (negative exponent? Flip to denominator)</p></div><h3>FOIL (Multiplying Binomials)</h3><p>$(a+b)(c+d)$: multiply First, Outer, Inner, Last, then combine.</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p><strong>Expand:</strong> $(x+3)(x-5)$</p><div class=\"explanation-text\"><div class=\"step\">First: $x \\cdot x = x^2$</div><div class=\"step\">Outer: $x \\cdot (-5) = -5x$</div><div class=\"step\">Inner: $3 \\cdot x = 3x$</div><div class=\"step\">Last: $3 \\cdot (-5) = -15$</div><div class=\"step\">Combine: $x^2 - 5x + 3x - 15 = x^2 - 2x - 15$</div></div></div><div class=\"lesson-key-point\"><strong>Common Pattern</strong>$(a+b)^2 = a^2 + 2ab + b^2$. Do NOT write $a^2 + b^2$ and forget the middle term!</div><h3>Functions</h3><p>$f(x)$ is just a fancy way of writing a rule. $f(3)$ means \"plug 3 in for $x$.\"</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>If $f(x) = 2x^2 - 3x + 1$, find $f(4)$.</p><div class=\"explanation-text\"><div class=\"step\">$f(4) = 2(16) - 3(4) + 1 = 32 - 12 + 1 = 21$</div></div></div><h3>Function Composition</h3><p>$f(g(x))$ means: compute $g(x)$ first, then plug that result into $f$.</p>"
},
{
    id: "geometry-essentials",
    topic: "geometry",
    title: "Geometry Essentials",
    description: "Area formulas, the Pythagorean theorem, and special triangles.",
    difficulty: 1,
    estimatedMinutes: 25,
    keyFormulas: [
        "Rectangle: area = $lw$, perimeter = $2l + 2w$",
        "Triangle: area = $\\frac{1}{2}bh$, angles sum to $180°$",
        "Circle: area = $\\pi r^2$, circumference = $2\\pi r$",
        "Pythagorean theorem: $a^2 + b^2 = c^2$",
        "Common triples: 3-4-5, 5-12-13, 8-15-17"
    ],
    questionIds: ["geo-ap-001","geo-ap-002","geo-tri-001","geo-tri-002","geo-tri-004"],
    content: "<h3>Area Formulas You Must Know</h3><ul><li><strong>Rectangle:</strong> $A = lw$</li><li><strong>Triangle:</strong> $A = \\frac{1}{2}bh$</li><li><strong>Circle:</strong> $A = \\pi r^2$</li><li><strong>Trapezoid:</strong> $A = \\frac{1}{2}(b_1 + b_2)h$</li></ul><div class=\"lesson-key-point\"><strong>Common Trap</strong>The SAT gives you the DIAMETER but the formula uses RADIUS. Always check: radius = diameter / 2!</div><h3>The Pythagorean Theorem</h3><div class=\"lesson-formula\">$a^2 + b^2 = c^2$</div><p>where $c$ is the HYPOTENUSE (the longest side, opposite the right angle).</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Right triangle with legs 6 and 8. Find the hypotenuse.</p><div class=\"explanation-text\"><div class=\"step\">$36 + 64 = 100$, so $c = 10$ (a 3-4-5 triple scaled by 2!)</div></div></div><h3>Special Right Triangles</h3><p><strong>45-45-90:</strong> sides are $x : x : x\\sqrt{2}$ (legs are equal, hypotenuse = leg $\\times \\sqrt{2}$)</p><p><strong>30-60-90:</strong> sides are $x : x\\sqrt{3} : 2x$ (shortest side $\\times 2$ = hypotenuse)</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>In a 30-60-90 triangle, the shortest side is 4. Find all sides.</p><div class=\"explanation-text\"><div class=\"step\">Short side: 4</div><div class=\"step\">Long leg: $4\\sqrt{3} \\approx 6.93$</div><div class=\"step\">Hypotenuse: $2 \\times 4 = 8$</div></div></div><h3>Similar Triangles</h3><p>If two triangles are similar, their sides are proportional. Set up a proportion and cross-multiply.</p>"
},
{
    id: "circles-volume",
    topic: "geometry",
    title: "Circles & Volume",
    description: "Circle equations, arc length, sector area, and 3D volume formulas.",
    difficulty: 2,
    estimatedMinutes: 20,
    keyFormulas: [
        "Circle equation: $(x-h)^2 + (y-k)^2 = r^2$, center $(h,k)$",
        "Arc length = $\\frac{\\theta}{360} \\times 2\\pi r$",
        "Sector area = $\\frac{\\theta}{360} \\times \\pi r^2$",
        "Cylinder: $V = \\pi r^2 h$ | Cone: $V = \\frac{1}{3}\\pi r^2 h$",
        "Sphere: $V = \\frac{4}{3}\\pi r^3$"
    ],
    questionIds: ["geo-cir-001","geo-cir-002","geo-cir-003","geo-vol-001","geo-vol-002"],
    content: "<h3>The Circle Equation</h3><div class=\"lesson-formula\">$(x-h)^2 + (y-k)^2 = r^2$</div><p>Center is at $(h, k)$ and radius is $r$.</p><div class=\"lesson-key-point\"><strong>Sign Trap!</strong>$(x-2)^2 + (y+3)^2 = 25$: center is $(2, -3)$, NOT $(2, 3)$. Remember $(y+3) = (y-(-3))$, so $k = -3$. And $r^2 = 25$ means $r = 5$, not 25.</div><h3>Arc Length and Sector Area</h3><p>A sector is a \"pizza slice\" of a circle. The key idea: use the fraction of the full circle.</p><div class=\"lesson-formula\">$\\text{Fraction} = \\frac{\\text{central angle}}{360°}$</div><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Circle with radius 6, central angle 90°. Find the sector area.</p><div class=\"explanation-text\"><div class=\"step\">Fraction: $\\frac{90}{360} = \\frac{1}{4}$</div><div class=\"step\">Full area: $\\pi(6)^2 = 36\\pi$</div><div class=\"step\">Sector area: $\\frac{1}{4}(36\\pi) = 9\\pi$</div></div></div><h3>Volume Formulas</h3><ul><li><strong>Rectangular box:</strong> $V = lwh$</li><li><strong>Cylinder:</strong> $V = \\pi r^2 h$ (circle base $\\times$ height)</li><li><strong>Cone:</strong> $V = \\frac{1}{3}\\pi r^2 h$ (one-third of a cylinder)</li><li><strong>Sphere:</strong> $V = \\frac{4}{3}\\pi r^3$</li></ul><div class=\"lesson-key-point\"><strong>Remember</strong>Cone = (1/3) of a cylinder. Pyramid = (1/3) of a prism. The \"pointy\" versions are always 1/3.</div>"
},
{
    id: "probability-advanced",
    topic: "problem-solving",
    title: "Probability & Advanced Topics",
    description: "Basic probability, exponential growth/decay, and intro to trigonometry.",
    difficulty: 2,
    estimatedMinutes: 20,
    keyFormulas: [
        "Probability = $\\frac{\\text{favorable outcomes}}{\\text{total outcomes}}$",
        "Inclusion-exclusion: $|A \\cup B| = |A| + |B| - |A \\cap B|$",
        "Exponential growth: $y = a(1+r)^t$ | Decay: $y = a(1-r)^t$",
        "SOH CAH TOA: $\\sin=\\frac{O}{H}$, $\\cos=\\frac{A}{H}$, $\\tan=\\frac{O}{A}$"
    ],
    questionIds: ["ps-prob-001","ps-prob-002","ps-prob-003","am-expn-001","geo-trig-001"],
    content: "<h3>Basic Probability</h3><div class=\"lesson-formula\">$P(\\text{event}) = \\frac{\\text{favorable outcomes}}{\\text{total outcomes}}$</div><p>Probability is always between 0 and 1 (or 0% and 100%).</p><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>Bag has 4 red, 6 blue, 5 green marbles. P(blue)?</p><div class=\"explanation-text\"><div class=\"step\">Total: $4+6+5 = 15$. P(blue) $= \\frac{6}{15} = \\frac{2}{5}$</div></div></div><h3>Overlapping Groups (Inclusion-Exclusion)</h3><p>When items can be in two groups, subtract the overlap to avoid double-counting.</p><div class=\"lesson-formula\">$|A \\text{ or } B| = |A| + |B| - |A \\text{ and } B|$</div><h3>Exponential Growth and Decay</h3><ul><li><strong>Growth:</strong> $y = a(1 + r)^t$ (things getting bigger: population, investments)</li><li><strong>Decay:</strong> $y = a(1 - r)^t$ (things getting smaller: depreciation, radioactive decay)</li></ul><div class=\"lesson-example\"><div class=\"lesson-example-label\">Example</div><p>$5000 invested at 6% annual growth. Value after 3 years?</p><div class=\"explanation-text\"><div class=\"step\">$y = 5000(1.06)^3 = 5000(1.191) = \\$5955.08$</div></div></div><h3>Basic Trigonometry (SOH CAH TOA)</h3><p>Only applies to RIGHT triangles. Memorize this:</p><ul><li><strong>S</strong>in = <strong>O</strong>pposite / <strong>H</strong>ypotenuse</li><li><strong>C</strong>os = <strong>A</strong>djacent / <strong>H</strong>ypotenuse</li><li><strong>T</strong>an = <strong>O</strong>pposite / <strong>A</strong>djacent</li></ul><div class=\"lesson-key-point\"><strong>SAT Tip</strong>Trig questions on the SAT are usually straightforward: identify which sides you have, pick the right ratio, and solve. Draw and label the triangle!</div>"
}
];
