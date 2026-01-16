import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import HikeDetailPage from './pages/HikeDetailPage';

const App = () => {
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
