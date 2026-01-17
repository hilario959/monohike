import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { liveQuery } from 'dexie';
import { db, type Hike } from '../db/db';
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

const HomePage = () => {
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start.toISOString().slice(0, 10);
  });
  const [rangeEnd, setRangeEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.hikes.orderBy('createdAt').reverse().toArray()
    ).subscribe({
      next: (items) => setHikes(items),
      error: (err) => console.error(err)
    });

    return () => subscription.unsubscribe();
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
      const hikeDate = new Date(hike.startedAt);
      return hikeDate >= start && hikeDate <= end;
    });
  }, [hikes, rangeStart, rangeEnd]);

  const monthlyTotals = useMemo(() => {
    return filteredHikes.reduce(
      (totals, hike) => {
        totals.distanceMeters += hike.distanceMeters;
        totals.durationSec += hike.durationSec;
        return totals;
      },
      { distanceMeters: 0, durationSec: 0 }
    );
  }, [filteredHikes]);

  const weeklyStreak = useMemo(() => {
    const weeksWithHikes = new Set<string>();
    hikes.forEach((hike) => {
      const weekStart = getWeekStart(new Date(hike.startedAt));
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

  return (
    <section>
      <div className="stats-row">
        <div className="card stats-card">
          <p className="section-title">Stats Range 📈</p>
          <div className="stats-range-inputs">
            <label className="range-field" htmlFor="range-start">
              <span className="muted">Start</span>
              <input
                id="range-start"
                type="date"
                value={rangeStart}
                onChange={(event) => setRangeStart(event.target.value)}
                max={rangeEnd}
              />
            </label>
            <label className="range-field" htmlFor="range-end">
              <span className="muted">End</span>
              <input
                id="range-end"
                type="date"
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
                min={rangeStart}
              />
            </label>
          </div>
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
        </div>

        <div className="card stats-card streak-card">
          <div className="streak-header">
            <div>
              <p className="section-title">Weekly streak 🔥</p>
              <p className="muted">Weeks in a row with a hike.</p>
              <p className="muted compact-note">Resets after a missed week.</p>
            </div>
            <div className="streak-value">{weeklyStreak}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="section-title">Your Hikes 🏔️</p>
        {hikes.length === 0 ? (
          <p className="muted">No hikes yet. Head to Navigate to start tracking.</p>
        ) : (
          <div>
            {hikes.map((hike) => (
              <Link key={hike.id} to={`/hike/${hike.id}`} className="card" style={{ display: 'block' }}>
                <strong>{hike.name ?? new Date(hike.startedAt).toLocaleDateString()}</strong>
                <p className="muted">{formatDuration(hike.durationSec)} · {formatDistance(hike.distanceMeters)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePage;
