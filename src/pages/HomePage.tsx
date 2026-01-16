import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { liveQuery } from 'dexie';
import { db, type Hike } from '../db/db';
import { formatDistance, formatDuration } from '../utils/format';

const HomePage = () => {
  const [hikes, setHikes] = useState<Hike[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.hikes.orderBy('createdAt').reverse().toArray()
    ).subscribe({
      next: (items) => setHikes(items),
      error: (err) => console.error(err)
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <section>
      <div className="card">
        <p className="section-title">Your hikes</p>
        {hikes.length === 0 ? (
          <p className="muted">No hikes yet. Head to Record to start tracking.</p>
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
