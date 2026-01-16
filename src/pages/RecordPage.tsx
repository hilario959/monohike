import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveMap from '../components/LiveMap';
import { db } from '../db/db';
import { useHikeRecorder } from '../hooks/useHikeRecorder';
import { formatDistance, formatDuration } from '../utils/format';

const RecordPage = () => {
  const navigate = useNavigate();
  const {
    status,
    points,
    distanceMeters,
    elapsedSec,
    accuracy,
    error,
    start,
    pause,
    resume,
    finish
  } = useHikeRecorder();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFinish = async () => {
    const result = finish();
    if (!result?.startedAt) return;
    setSaving(true);
    setSaveError(null);
    try {
      const hikeId = await db.hikes.add({
        name: 'Untitled hike',
        startedAt: result.startedAt.toISOString(),
        endedAt: result.endedAt.toISOString(),
        durationSec: result.duration,
        distanceMeters,
        createdAt: new Date().toISOString()
      });

      if (points.length > 0) {
        await db.points.bulkAdd(
          points.map((point) => ({
            hikeId,
            lat: point.lat,
            lon: point.lon,
            timestamp: point.timestamp,
            accuracy: point.accuracy
          }))
        );
      }

      navigate(`/hike/${hikeId}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save hike.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      {error && (
        <div className="alert">
          <strong>Location error:</strong> {error}
          <div className="button-row" style={{ marginTop: '0.75rem' }}>
            <button className="secondary-button" onClick={start}>
              Retry
            </button>
          </div>
        </div>
      )}
      {saveError && <div className="alert">{saveError}</div>}

      <div className="card">
        <p className="section-title">Live tracking</p>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-label">Distance</div>
            <div className="stat-value">{formatDistance(distanceMeters)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Elapsed</div>
            <div className="stat-value">{formatDuration(elapsedSec)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Accuracy</div>
            <div className="stat-value">{accuracy ? `${Math.round(accuracy)} m` : '--'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Points</div>
            <div className="stat-value">{points.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <LiveMap points={points} />
      </div>

      <div className="card">
        <p className="section-title">Controls</p>
        <div className="button-row">
          {status === 'idle' && (
            <button className="primary-button" onClick={start}>
              Start
            </button>
          )}
          {status === 'tracking' && (
            <>
              <button className="secondary-button" onClick={pause}>
                Pause
              </button>
              <button className="primary-button" onClick={handleFinish} disabled={saving}>
                Finish
              </button>
            </>
          )}
          {status === 'paused' && (
            <>
              <button className="secondary-button" onClick={resume}>
                Resume
              </button>
              <button className="primary-button" onClick={handleFinish} disabled={saving}>
                Finish
              </button>
            </>
          )}
          {status === 'ended' && (
            <button className="primary-button" onClick={start}>
              Start new hike
            </button>
          )}
        </div>
        {saving && <p className="muted">Saving hike...</p>}
      </div>
    </section>
  );
};

export default RecordPage;
