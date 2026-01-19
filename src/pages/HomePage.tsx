import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Hike, HikePhoto } from '../types/hike';
import { formatDistance, formatDuration } from '../utils/format';

const HomePage = () => {
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoMap, setPhotoMap] = useState<Record<number, string[]>>({});
  const [coverMap, setCoverMap] = useState<Record<number, string | null>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'date' | 'alpha'>('date');

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

  return (
    <section>
      <div className="card">
        <p className="section-title">Your Hikes 🏔️</p>
        <div className="hike-controls">
          <input
            type="search"
            placeholder="Search hikes"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button
            type="button"
            className="outline-button hike-filter"
            onClick={() => setSortMode((prev) => (prev === 'date' ? 'alpha' : 'date'))}
          >
            {sortMode === 'date' ? 'Date' : 'A–Z'}
          </button>
        </div>
        {loading ? (
          <p className="muted">Loading hikes...</p>
        ) : loadError ? (
          <p className="alert">{loadError}</p>
        ) : hikes.length === 0 ? (
          <p className="muted">No hikes yet. Head to Navigate to start tracking.</p>
        ) : (
          <div>
            {hikes
              .filter((hike) => {
                const needle = searchQuery.trim().toLowerCase();
                if (!needle) return true;
                const title = hike.name ?? new Date(hike.started_at).toLocaleDateString();
                return title.toLowerCase().includes(needle);
              })
              .sort((a, b) => {
                if (sortMode === 'alpha') {
                  const aLabel = (a.name ?? '').toLowerCase();
                  const bLabel = (b.name ?? '').toLowerCase();
                  return aLabel.localeCompare(bLabel);
                }
                return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
              })
              .map((hike) => (
              <Link
                key={hike.id}
                to={`/hike/${hike.id}`}
                className="card hike-card"
                style={{ display: 'block' }}
              >
                {coverMap[hike.id] ? (
                  <img src={coverMap[hike.id] ?? ''} alt="" className="hike-cover" />
                ) : null}
                <strong className="hike-title">
                  {hike.name ?? new Date(hike.started_at).toLocaleDateString()}
                </strong>
                <p className="muted">
                  {formatDuration(hike.duration_sec)} · {formatDistance(hike.distance_meters)}
                </p>
                <button className="secondary-button button-full">See more</button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePage;
