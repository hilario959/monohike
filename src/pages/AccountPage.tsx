import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Hike } from '../types/hike';
import { formatDistance, formatDuration } from '../utils/format';

const getWeekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const AccountPage = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start.toISOString().slice(0, 10);
  });
  const [rangeEnd, setRangeEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error) {
        setEmail(data.user?.email ?? null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const loadHikes = async () => {
      setStatsLoading(true);
      setStatsError(null);
      const { data, error } = await supabase
        .from('hikes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        setStatsError(error.message);
        setHikes([]);
      } else {
        setHikes(data ?? []);
      }
      setStatsLoading(false);
    };
    loadHikes();
  }, []);

  const filteredHikes = useMemo(() => {
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return hikes.filter((hike) => {
      const hikeDate = new Date(hike.started_at);
      return hikeDate >= start && hikeDate <= end;
    });
  }, [hikes, rangeStart, rangeEnd]);

  const monthlyTotals = useMemo(() => {
    return filteredHikes.reduce(
      (totals, hike) => {
        totals.distanceMeters += hike.distance_meters;
        totals.durationSec += hike.duration_sec;
        return totals;
      },
      { distanceMeters: 0, durationSec: 0 }
    );
  }, [filteredHikes]);

  const weeklyStreak = useMemo(() => {
    const weeksWithHikes = new Set<string>();
    hikes.forEach((hike) => {
      const weekStart = getWeekStart(new Date(hike.started_at));
      weeksWithHikes.add(weekStart.toISOString().slice(0, 10));
    });
    let streak = 0;
    let cursor = getWeekStart(new Date());
    while (weeksWithHikes.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = addDays(cursor, -7);
    }
    return streak;
  }, [hikes]);

  const avatarLabel = email ? email.trim().slice(0, 2).toUpperCase() : 'MH';

  return (
    <section>
      <div className="card profile-card">
        <div className="profile-avatar">{avatarLabel}</div>
        {loading ? (
          <p className="muted">Loading account...</p>
        ) : (
          <p className="profile-email">{email ?? 'Unknown user'}</p>
        )}
      </div>

      <div className="stats-row">
        <div className="card stats-card">
          <p className="section-title">Your Stats 📈</p>
          <div className="stats-range-inputs">
            <label className="range-field" htmlFor="profile-range-start">
              <span className="muted">Start</span>
              <input
                id="profile-range-start"
                type="date"
                value={rangeStart}
                onChange={(event) => setRangeStart(event.target.value)}
                max={rangeEnd}
              />
            </label>
            <label className="range-field" htmlFor="profile-range-end">
              <span className="muted">End</span>
              <input
                id="profile-range-end"
                type="date"
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
                min={rangeStart}
              />
            </label>
          </div>
          {statsLoading ? (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              Loading stats...
            </p>
          ) : statsError ? (
            <p className="alert" style={{ marginTop: '0.75rem' }}>
              {statsError}
            </p>
          ) : (
            <div className="stat-grid compact" style={{ marginTop: '0.75rem' }}>
              <div className="stat">
                <div className="stat-label">Distance</div>
                <div className="stat-value">{formatDistance(monthlyTotals.distanceMeters)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Time</div>
                <div className="stat-value">{formatDuration(monthlyTotals.durationSec)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="card stats-card streak-card">
          <div className="streak-header">
            <div>
              <p className="section-title">Your Streak 🔥</p>
              <p className="muted">Weeks in a row with a hike.</p>
              <p className="muted compact-note">Resets after a missed week.</p>
            </div>
            <div className="streak-value">{weeklyStreak}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="button-row">
          <button className="outline-button button-full" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
};

export default AccountPage;
