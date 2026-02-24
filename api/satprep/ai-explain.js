import Anthropic from '@anthropic-ai/sdk';

import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  sendError,
} from './_lib/supabase.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

// Rate-limit: max 60 AI explanations per student per day
const DAILY_LIMIT = 60;

function buildSystemPrompt(section) {
  const base = `You are an elite SAT tutor. The student answered a question incorrectly. Give a concise, targeted explanation.

CRITICAL GROUNDING RULES — you must follow these exactly:
- ONLY reference information explicitly provided in the question, choices, and correct answer below
- NEVER invent facts, statistics, passage content, or context not present in the question
- If the question references a passage you cannot see, say "Based on the question stem" and work only from what is given
- If you are uncertain about any claim, say so explicitly rather than guessing
- Your explanation must be logically consistent with the correct answer provided

Teaching rules:
- Speak directly to the student ("you" voice), firm but supportive
- Start with WHY their answer is wrong (the specific trap or error)
- Then show the correct reasoning in 2-3 clear steps
- End with one memorable rule they can apply to similar questions
- Use plain language. For math, use standard notation (not LaTeX)
- Keep it under 150 words. Every word must teach.`;

  if (section === 'verbal') {
    return `${base}

Verbal-specific rules:
- For reading questions: cite the specific text evidence from the stem that proves the correct answer. If the full passage is not provided, explain the reasoning pattern
- For grammar/conventions: name the exact grammar rule and show why it applies here
- For rhetoric/structure: explain the author's purpose and how the correct answer captures it
- NEVER fabricate passage content. Only quote text that appears in the question stem above.`;
  }

  return `${base}

Math-specific rules:
- Show the clean algebraic steps — every step must follow from the previous one
- Double-check your arithmetic. If you compute 3 × 7, make sure you write 21
- For data/statistics: explain what the data actually says
- For geometry/trig: reference the key formula or property

Desmos calculator guidance (the SAT has a built-in Desmos graphing calculator):
- ALWAYS end with a "Desmos tip" section: tell the student whether this problem is faster with Desmos or by hand, and WHY
- If Desmos is faster, give the exact keystrokes: what to type into Desmos (e.g. "Type: y = 2x + 3, then y = -x + 6, read intersection")
- Best Desmos problems: systems of equations (graph both, read intersection), quadratics (graph and find zeros/vertex), inequalities (shade and check), finding function values
- Skip Desmos for: simple arithmetic, single-step algebra, probability/statistics, geometry formulas
- Key Desmos shortcuts: use "table" to check values, use sliders to find where expressions equal a target, graph both sides of an equation to find solutions`;
}

function buildUserMessage({ stem, choices, studentAnswer, correctAnswer, skill, domain, section }) {
  const choiceLabels = ['A', 'B', 'C', 'D'];
  let choiceText = '';
  if (Array.isArray(choices) && choices.length) {
    choiceText = choices.map((c, i) => `${choiceLabels[i]}) ${c}`).join('\n');
  }

  const studentLabel = Array.isArray(choices) && choices.length
    ? `${choiceLabels[Number(studentAnswer)] || studentAnswer}) ${choices[Number(studentAnswer)] || studentAnswer}`
    : studentAnswer;

  const correctLabel = Array.isArray(choices) && choices.length
    ? `${choiceLabels[Number(correctAnswer)] || correctAnswer}) ${choices[Number(correctAnswer)] || correctAnswer}`
    : correctAnswer;

  return `Domain: ${domain || 'unknown'}
Skill: ${skill || 'unknown'}

Question:
${stem}

${choiceText ? `Choices:\n${choiceText}\n` : ''}Student answered: ${studentLabel}
Correct answer: ${correctLabel}

Explain why the student's answer is wrong and how to get the correct answer.`;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'AI tutor is not configured. Add ANTHROPIC_API_KEY to your environment variables.',
    });
  }

  try {
    const user = await requireAuthUser(req);

    // Lightweight health-check: return immediately without calling Anthropic or
    // touching the rate-limit counter so the front-end badge can probe cheaply.
    if (req.body?.stem === '__ping__') {
      return res.status(200).json({ ping: true, ai_available: true });
    }

    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, 'student');

    // Simple daily rate limit using a counter in sat_profiles.settings
    const settings = profile.settings || {};
    const today = new Date().toISOString().slice(0, 10);
    const aiUsage = settings.ai_usage || {};
    const todayCount = aiUsage.date === today ? (aiUsage.count || 0) : 0;

    if (todayCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily AI tutor limit reached (${DAILY_LIMIT}/day). Explanations reset tomorrow.`,
        limit: DAILY_LIMIT,
        used: todayCount,
      });
    }

    const {
      stem,
      choices,
      student_answer: studentAnswer,
      correct_answer: correctAnswer,
      skill,
      domain,
      section,
      follow_up: isFollowUp,
      initial_explanation: initialExplanation,
      conversation,
    } = req.body || {};

    if (!stem || studentAnswer === undefined || correctAnswer === undefined) {
      return res.status(400).json({ error: 'Missing required fields: stem, student_answer, correct_answer' });
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Build the messages array — either a fresh explanation or a follow-up conversation
    let messages;

    if (isFollowUp && initialExplanation && Array.isArray(conversation) && conversation.length) {
      // Multi-turn follow-up: include the original context, initial explanation, and conversation history
      messages = [
        {
          role: 'user',
          content: buildUserMessage({ stem, choices, studentAnswer, correctAnswer, skill, domain, section }),
        },
        {
          role: 'assistant',
          content: initialExplanation,
        },
      ];

      // Add conversation history (alternating user/assistant turns)
      for (const msg of conversation) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: String(msg.content || '').slice(0, 500),
        });
      }

      // Ensure the last message is from the user (required by the API)
      if (messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: 'Can you explain further?' });
      }
    } else {
      // Initial explanation — single turn
      messages = [
        {
          role: 'user',
          content: buildUserMessage({ stem, choices, studentAnswer, correctAnswer, skill, domain, section }),
        },
      ];
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(section || 'math'),
      messages,
    });

    const explanation = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // QA check: verify the AI response references the correct answer, not the student's wrong answer
    const choiceLabels = ['A', 'B', 'C', 'D'];
    const correctLabel = Array.isArray(choices) && choices.length
      ? choiceLabels[Number(correctAnswer)]
      : String(correctAnswer);
    const studentLabel = Array.isArray(choices) && choices.length
      ? choiceLabels[Number(studentAnswer)]
      : String(studentAnswer);

    // Flag if the AI appears to endorse the student's wrong answer as correct
    const lower = explanation.toLowerCase();
    const endorsesWrong = (
      studentLabel
      && correctLabel
      && studentLabel !== correctLabel
      && (
        lower.includes(`${studentLabel.toLowerCase()}) is correct`)
        || lower.includes(`${studentLabel.toLowerCase()} is the correct`)
        || lower.includes(`answer is ${studentLabel.toLowerCase()})`)
      )
    );

    const qaWarning = endorsesWrong
      ? '\n\n[Note: This AI explanation may contain an error. Always trust the step-by-step walkthrough above as the definitive answer.]'
      : '';

    // Update usage counter
    const newCount = todayCount + 1;
    await service
      .from('sat_profiles')
      .update({
        settings: {
          ...settings,
          ai_usage: { date: today, count: newCount },
        },
      })
      .eq('user_id', user.id);

    return res.status(200).json({
      explanation: explanation + qaWarning,
      tokens_used: response.usage?.output_tokens || 0,
      daily_remaining: DAILY_LIMIT - newCount,
      qa_flagged: endorsesWrong,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('AI explain error:', error.message);
    return sendError(res, error);
  }
}
