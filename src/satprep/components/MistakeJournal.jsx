import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'satprep.mistakeJournal.v1';

function readJournal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeJournal(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MistakeJournal() {
  const [entries, setEntries] = useState(() => readJournal());
  const [expanded, setExpanded] = useState(false);
  const [newMistake, setNewMistake] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    writeJournal(entries);
  }, [entries]);

  const todayEntries = entries.filter((e) => {
    const today = new Date().toISOString().slice(0, 10);
    return e.date?.slice(0, 10) === today;
  });

  const recentEntries = entries.slice(-10).reverse();

  function addEntry() {
    if (!newMistake.trim() && !newRule.trim()) return;
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      skill: newSkill.trim() || 'general',
      mistake: newMistake.trim(),
      rule: newRule.trim(),
    };
    setEntries((prev) => [...prev, entry]);
    setNewMistake('');
    setNewRule('');
    setNewSkill('');
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="sat-journal">
      <button
        type="button"
        className="sat-journal__header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <h3>Mistake Journal</h3>
        <span className="sat-journal__count">
          {todayEntries.length} today / {entries.length} total
        </span>
        <span className="sat-btn sat-btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} aria-hidden="true">
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {!expanded ? (
        <p className="sat-muted" style={{ margin: '8px 0 0' }}>
          After each session, log your mistakes and write prevention rules here. This is required — do not skip it.
        </p>
      ) : null}

      {expanded ? (
        <>
          <div className="sat-journal__form">
            <label>
              Skill (optional)
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g. quadratics, systems, inference"
              />
            </label>
            <label>
              Mistake pattern — what went wrong?
              <textarea
                value={newMistake}
                onChange={(e) => setNewMistake(e.target.value)}
                placeholder="e.g. I forgot to flip the inequality sign when dividing by a negative"
                rows={2}
              />
            </label>
            <label>
              Prevention rule — what will you do differently?
              <textarea
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                placeholder="e.g. Circle all negative divisors before solving and check sign direction"
                rows={2}
              />
            </label>
            <button type="button" className="sat-btn sat-btn--primary" onClick={addEntry}>
              Save Entry
            </button>
          </div>

          {todayEntries.length ? (
            <div className="sat-journal__section">
              <h4>Today's Entries</h4>
              {todayEntries.map((entry) => (
                <div key={entry.id} className="sat-journal__entry">
                  <div className="sat-journal__entry-header">
                    <span className="sat-pill sat-pill--neutral">{entry.skill}</span>
                    <button type="button" className="sat-journal__remove" onClick={() => removeEntry(entry.id)}>&times;</button>
                  </div>
                  {entry.mistake ? <p><strong>Mistake:</strong> {entry.mistake}</p> : null}
                  {entry.rule ? <p><strong>Rule:</strong> {entry.rule}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {recentEntries.length ? (
            <div className="sat-journal__section">
              <h4>Recent Entries</h4>
              {recentEntries.map((entry) => (
                <div key={entry.id} className="sat-journal__entry">
                  <div className="sat-journal__entry-header">
                    <span className="sat-pill sat-pill--neutral">{entry.skill}</span>
                    <span className="sat-muted">{formatDate(entry.date)}</span>
                    <button type="button" className="sat-journal__remove" onClick={() => removeEntry(entry.id)}>&times;</button>
                  </div>
                  {entry.mistake ? <p><strong>Mistake:</strong> {entry.mistake}</p> : null}
                  {entry.rule ? <p><strong>Rule:</strong> {entry.rule}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
