/**
 * @typedef {Object} SatQuestion
 * @property {string} id
 * @property {'algebra'|'advanced-math'|'problem-solving-data'|'geometry-trig'} domain
 * @property {string} skill
 * @property {1|2|3|4|5} difficulty
 * @property {'multiple_choice'|'grid_in'} format
 * @property {'module-1'|'module-2'|'mixed'} module
 * @property {boolean} calculator_allowed
 * @property {string} stem
 * @property {string[]} [choices]
 * @property {number|string} answer_key
 * @property {string[]} explanation_steps
 * @property {string} strategy_tip
 * @property {string} trap_tag
 * @property {number} target_seconds
 * @property {string[]} tags
 * @property {boolean} [is_variant]
 * @property {string} [canonical_id]
 * @property {number} [variant_index]
 * @property {string} [template_key]
 * @property {number} [template_seed]
 */

/**
 * @typedef {Object} AttemptRecord
 * @property {string} id
 * @property {string} student_id
 * @property {string} question_id
 * @property {boolean} is_correct
 * @property {{answer: number|string|null}} response_payload
 * @property {number} seconds_spent
 * @property {'diagnostic'|'practice'|'timed'|'review'} session_mode
 * @property {string} created_at
 */

/**
 * @typedef {Object} SkillMastery
 * @property {string} student_id
 * @property {string} skill
 * @property {number} mastery_score
 * @property {number} confidence
 * @property {string} last_seen_at
 * @property {string} due_for_review_at
 */

/**
 * @typedef {Object} DailyMission
 * @property {string} student_id
 * @property {string} plan_date
 * @property {Array<{type: string, label: string, question_ids: string[], target_minutes: number}>} tasks
 * @property {number} target_minutes
 * @property {'pending'|'in_progress'|'complete'} status
 * @property {{completed_tasks: number, accuracy: number, pace_seconds: number}} completion_summary
 */

/**
 * @typedef {Object} WeeklyReport
 * @property {string} student_id
 * @property {string} week_start
 * @property {string[]} highlights
 * @property {string[]} risks
 * @property {{predicted_math_score: number, weekly_accuracy: number, pace_seconds: number}} score_trend
 * @property {Record<string, {accuracy: number, attempts: number}>} domain_breakdown
 * @property {string[]} recommended_actions
 */

export {};
