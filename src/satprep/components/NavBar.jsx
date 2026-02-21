import React, { useState } from 'react';

const STUDENT_LINKS = [
  ['/daily', 'Daily'],
  ['/diagnostic', 'Diagnostic'],
  ['/practice', 'Practice'],
  ['/timed', 'Timed'],
  ['/review', 'Review'],
  ['/verbal', 'Verbal 700+'],
  ['/progress', 'Progress'],
  ['/onboarding', 'Start Here'],
];

const PARENT_LINKS = [['/parent', 'Parent']];

export default function NavBar({ route, navigate, role, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = role === 'parent' ? [...STUDENT_LINKS, ...PARENT_LINKS] : STUDENT_LINKS;

  function handleNav(path) {
    navigate(path);
    setMenuOpen(false);
  }

  return (
    <header className="sat-nav">
      <div className="sat-nav__brand" onClick={() => handleNav('/daily')}>
        <span className="sat-nav__badge">SAT</span>
        <div>
          <div className="sat-nav__title">Math + Verbal 1300+</div>
          <div className="sat-nav__subtitle">4-week mission</div>
        </div>
      </div>
      <button
        className="sat-nav__hamburger"
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? '\u2715' : '\u2630'}
      </button>
      <nav className={`sat-nav__links ${menuOpen ? 'is-open' : ''}`}>
        {links.map(([path, label]) => (
          <button
            key={path}
            className={`sat-nav__link ${route.startsWith(path) ? 'is-active' : ''}`}
            onClick={() => handleNav(path)}
            type="button"
          >
            {label}
          </button>
        ))}
        <button className="sat-nav__signout" onClick={onSignOut} type="button">
          Sign out
        </button>
      </nav>
    </header>
  );
}
