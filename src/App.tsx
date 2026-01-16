import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import HikeDetailPage from './pages/HikeDetailPage';
import { db } from './db/db';

const App = () => {
  const [dbError, setDbError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('monohike-theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    db.open().catch((error) => {
      setDbError(error instanceof Error ? error.message : 'Unable to access local storage.');
    });
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('monohike-theme', theme);
  }, [theme]);

  if (dbError) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="app-title">Monohike</p>
            <p className="app-subtitle">AllTrails-lite, offline-first</p>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </header>
        <main className="app-content">
          <div className="card">
            <p className="section-title">Storage unavailable</p>
            <p className="muted">
              Monohike needs IndexedDB to store hikes. Please enable site storage or try another
              browser.
            </p>
            <p className="muted">Error: {dbError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-title">Monohike</p>
          <p className="app-subtitle">AllTrails-lite, offline-first</p>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/hike/:id" element={<HikeDetailPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
              <path
                d="M4 10.5 12 4l8 6.5v8.5a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-5H10.5v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="bottom-nav__label">Home</span>
        </NavLink>
        <NavLink
          to="/record"
          className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5" fill="currentColor" />
              <circle cx="12" cy="12" r="4" fill="#ffffff" opacity="0.8" />
            </svg>
          </span>
          <span className="bottom-nav__label">Record</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default App;
