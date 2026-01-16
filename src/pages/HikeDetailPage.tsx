import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HikeMap from '../components/HikeMap';
import { db, type Hike, type TrackPoint } from '../db/db';
import { formatDistance, formatDuration, formatPace } from '../utils/format';
import { buildGpx, downloadFile } from '../utils/export';

const HikeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hike, setHike] = useState<Hike | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const hikeId = Number(id);
    if (Number.isNaN(hikeId)) {
      navigate('/');
      return;
    }

    const load = async () => {
      const storedHike = await db.hikes.get(hikeId);
      if (!storedHike) {
        navigate('/');
        return;
      }
      setHike(storedHike);
      setName(storedHike.name ?? '');
      const storedPoints = await db.points.where('hikeId').equals(hikeId).sortBy('timestamp');
      setPoints(storedPoints);
    };

    load();
  }, [id, navigate]);

  const pace = useMemo(() => {
    if (!hike) return '--';
    return formatPace(hike.distanceMeters, hike.durationSec);
  }, [hike]);

  const handleSaveName = async () => {
    if (!hike?.id) return;
    setSaving(true);
    await db.hikes.update(hike.id, { name: name || 'Untitled hike' });
    setHike((prev) => (prev ? { ...prev, name: name || 'Untitled hike' } : prev));
    setSaving(false);
  };

  const handleExport = () => {
    if (!hike) return;
    const gpx = buildGpx(hike, points);
    const filename = `${(hike.name ?? 'monohike').replace(/\s+/g, '-')}.gpx`;
    downloadFile(gpx, filename, 'application/gpx+xml');
  };

  const handleDelete = async () => {
    if (!hike?.id) return;
    const confirmed = window.confirm('Delete this hike permanently? This cannot be undone.');
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await db.transaction('rw', db.hikes, db.points, async () => {
        await db.points.where('hikeId').equals(hike.id).delete();
        await db.hikes.delete(hike.id);
      });
      navigate('/');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete hike.');
      setDeleting(false);
    }
  };

  if (!hike) {
    return (
      <div className="card">
        <p className="section-title">Loading hike...</p>
      </div>
    );
  }

  return (
    <section>
      <div className="card">
        <p className="section-title">Hike details</p>
        <label className="muted" htmlFor="hike-name">
          Hike name
        </label>
        <input
          id="hike-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name your hike"
        />
        <div className="button-row" style={{ marginTop: '0.75rem' }}>
          <button className="secondary-button" onClick={handleSaveName} disabled={saving}>
            {saving ? 'Saving...' : 'Save name'}
          </button>
        </div>
      </div>

      <div className="card">
        <HikeMap points={points} />
      </div>

      <div className="card">
        <p className="section-title">Stats</p>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-label">Distance</div>
            <div className="stat-value">{formatDistance(hike.distanceMeters)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{formatDuration(hike.durationSec)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Avg pace</div>
            <div className="stat-value">{pace}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Points</div>
            <div className="stat-value">{points.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="section-title">Export</p>
        <button className="primary-button" onClick={handleExport}>
          Export GPX
        </button>
      </div>

      <div className="card">
        <p className="section-title">Delete hike</p>
        {deleteError && <p className="alert">{deleteError}</p>}
        <button className="danger-button" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete hike'}
        </button>
      </div>
    </section>
  );
};

export default HikeDetailPage;
