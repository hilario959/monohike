import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import HikeDetailPage from './pages/HikeDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountPage from './pages/AccountPage';
import { HikeRecorderProvider } from './contexts/HikeRecorderContext';
import { supabase } from './lib/supabaseClient';

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('monohike-theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('monohike-theme', theme);
  }, [theme]);

  const showBackButton = session && location.pathname.startsWith('/hike/');

  return (
    <div className="app-shell">
      {session && (
        <header className="app-header">
          <div className="header-left">
            {showBackButton && (
              <button
                type="button"
                className="header-button header-back"
                onClick={() => navigate('/')}
                aria-label="Back to home"
              >
                <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                  <path
                    d="M15.5 5.5a1 1 0 0 1 0 1.4L10.4 12l5.1 5.1a1 1 0 0 1-1.4 1.4l-5.8-5.8a1 1 0 0 1 0-1.4l5.8-5.8a1 1 0 0 1 1.4 0z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
            <img
              src={`${import.meta.env.BASE_URL}icons/icon.svg`}
              alt="MonoHike"
              className="header-logo"
            />
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="header-button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path
                  d="M12 3a6 6 0 0 1 3.5 11v1.5a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 15.5V14A6 6 0 0 1 12 3zm-2 14.5h4V19a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path
                  d="M21 14.5a8.5 8.5 0 0 1-11.5-11.5 1 1 0 0 0-1.3-1.3A10.5 10.5 0 1 0 22.3 15.8a1 1 0 0 0-1.3-1.3z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
            <NavLink to="/account" className="header-button" aria-label="My profile">
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path
                  d="M12 12.75a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 1.75c-3.33 0-6.5 1.67-6.5 4.25a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1c0-2.58-3.17-4.25-6.5-4.25z"
                  fill="currentColor"
                />
              </svg>
              <span className="header-button__label">My profile</span>
            </NavLink>
          </div>
        </header>
      )}

      <main className="app-content">
        {authLoading ? (
          <div className="card">
            <p className="section-title">Loading...</p>
          </div>
        ) : session ? (
          <HikeRecorderProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/record" element={<RecordPage />} />
              <Route path="/hike/:id" element={<HikeDetailPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HikeRecorderProvider>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </main>

      {session && !showBackButton && (
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
                <path
                  d="M12 6l4.3 4.3a1 1 0 1 1-1.41 1.41L13 9.83V18a1 1 0 1 1-2 0V9.83l-1.89 1.88a1 1 0 1 1-1.41-1.41L12 6z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="bottom-nav__label">Hike</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
};

export default App;
