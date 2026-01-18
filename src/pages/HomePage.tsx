import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Hike, HikePhoto } from '../types/hike';
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoMap, setPhotoMap] = useState<Record<number, string[]>>({});
  const [coverMap, setCoverMap] = useState<Record<number, string | null>>({});
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start.toISOString().slice(0, 10);
  });
  const [rangeEnd, setRangeEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const loadHikes = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('hikes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        setLoadError(error.message);
        setHikes([]);
        setPhotoMap({});
        setCoverMap({});
      } else {
        setHikes(data ?? []);
        if (data && data.length > 0) {
          const hikeIds = data.map((hike) => hike.id);
          const { data: photos } = await supabase
            .from('hike_photos')
            .select('*')
            .in('hike_id', hikeIds);
          const grouped: Record<number, string[]> = {};
          const covers: Record<number, string | null> = {};
          (photos ?? []).forEach((photo: HikePhoto) => {
            const { data: urlData } = supabase.storage
              .from('hike-photos')
              .getPublicUrl(photo.path);
            if (!grouped[photo.hike_id]) {
              grouped[photo.hike_id] = [];
            }
            grouped[photo.hike_id].push(urlData.publicUrl);
            if (photo.is_cover) {
              covers[photo.hike_id] = urlData.publicUrl;
            }
          });
          setPhotoMap(grouped);
          setCoverMap(covers);
        } else {
          setPhotoMap({});
          setCoverMap({});
        }
      }
      setLoading(false);
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
        {loading ? (
          <p className="muted">Loading hikes...</p>
        ) : loadError ? (
          <p className="alert">{loadError}</p>
        ) : hikes.length === 0 ? (
          <p className="muted">No hikes yet. Head to Navigate to start tracking.</p>
        ) : (
          <div>
            {hikes.map((hike) => (
              <Link key={hike.id} to={`/hike/${hike.id}`} className="card" style={{ display: 'block' }}>
                <strong>{hike.name ?? new Date(hike.started_at).toLocaleDateString()}</strong>
                <p className="muted">
                  {formatDuration(hike.duration_sec)} · {formatDistance(hike.distance_meters)}
                </p>
                {photoMap[hike.id]?.length ? (
                  <div className="hike-photo-row">
                    {coverMap[hike.id] ? (
                      <img src={coverMap[hike.id] ?? ''} alt="" className="hike-photo-thumb is-cover" />
                    ) : null}
                    {photoMap[hike.id]
                      .filter((url) => url !== coverMap[hike.id])
                      .slice(0, coverMap[hike.id] ? 2 : 3)
                      .map((url, index) => (
                        <img key={`${hike.id}-photo-${index}`} src={url} alt="" className="hike-photo-thumb" />
                      ))}
                    {photoMap[hike.id].length > 3 && (
                      <span className="hike-photo-more">+{photoMap[hike.id].length - 3}</span>
                    )}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePage;
