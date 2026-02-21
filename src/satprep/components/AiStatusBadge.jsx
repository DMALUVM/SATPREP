import React, { useEffect, useState } from 'react';
import { fetchAiExplanation } from '../lib/apiClient';

// Module-level cache so the probe only fires once across the entire app session
let cachedResult = null; // null = not checked, true/false = result

export default function AiStatusBadge() {
  const [enabled, setEnabled] = useState(cachedResult);

  useEffect(() => {
    if (cachedResult !== null) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      cachedResult = false;
      setEnabled(false);
      return;
    }
    fetchAiExplanation({ stem: '__ping__', student_answer: '0', correct_answer: '1' })
      .then(() => {
        cachedResult = true;
        setEnabled(true);
      })
      .catch((err) => {
        cachedResult = err?.status !== 503;
        setEnabled(cachedResult);
      });
  }, []);

  if (!enabled) return null;

  return <span className="sat-ai-badge">AI Tutor Active</span>;
}
