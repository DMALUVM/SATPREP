import React from 'react';

export default function StatCard({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`sat-stat sat-stat--${tone}`}>
      <div className="sat-stat__label">{label}</div>
      <div className="sat-stat__value">{value}</div>
      {detail ? <div className="sat-stat__detail">{detail}</div> : null}
    </article>
  );
}
