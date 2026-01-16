import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import HikeDetailPage from './pages/HikeDetailPage';
import { db } from './db/db';

const App = () => {
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    db.open().catch((error) => {
      setDbError(error instanceof Error ? error.message : 'Unable to access local storage.');
    });
  }, []);

  if (dbError) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="app-title">Monohike</p>
            <p className="app-subtitle">AllTrails-lite, offline-first</p>
          </div>
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
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/hike/:id" element={<HikeDetailPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/record" className={({ isActive }) => (isActive ? 'active' : '')}>
          Record
        </NavLink>
      </nav>
    </div>
  );
};

export default App;
