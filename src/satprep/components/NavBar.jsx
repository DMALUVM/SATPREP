import React from 'react';

const STUDENT_LINKS = [
  ['/onboarding', 'Start Here'],
  ['/daily', 'Daily'],
  ['/diagnostic', 'Diagnostic'],
  ['/practice', 'Practice'],
  ['/timed', 'Timed'],
  ['/review', 'Review'],
  ['/verbal', 'Verbal 700+'],
  ['/progress', 'Progress'],
];

const PARENT_LINKS = [['/parent', 'Parent']];

export default function NavBar({ route, navigate, role, onSignOut }) {
  const links = role === 'parent' ? [...STUDENT_LINKS, ...PARENT_LINKS] : STUDENT_LINKS;

  return (
    <header className="sat-nav">
      <div className="sat-nav__brand" onClick={() => navigate('/daily')}>
        <span className="sat-nav__badge">SAT</span>
        <div>
          <div className="sat-nav__title">Math + Verbal 1300+</div>
          <div className="sat-nav__subtitle">4-week mission</div>
        </div>
      </div>
      <nav className="sat-nav__links">
        {links.map(([path, label]) => (
          <button
            key={path}
            className={`sat-nav__link ${route.startsWith(path) ? 'is-active' : ''}`}
            onClick={() => navigate(path)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>
      <button className="sat-nav__signout" onClick={onSignOut} type="button">
        Sign out
      </button>
    </header>
  );
}
