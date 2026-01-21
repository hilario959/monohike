import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveMap from '../components/LiveMap';
import { supabase } from '../lib/supabaseClient';
import { useHikeRecorderContext } from '../contexts/HikeRecorderContext';
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
    restoredSession,
    keepAwake,
    wakeLockActive,
    wakeLockError,
    enableKeepAwake,
    disableKeepAwake,
    start,
    pause,
    resume,
    finish
  } = useHikeRecorderContext();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFinish = async () => {
    const result = finish();
    if (!result?.startedAt) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(userError?.message ?? 'You must be signed in to save a hike.');
      }

      const { data: hikeRow, error: hikeError } = await supabase
        .from('hikes')
        .insert({
          user_id: userData.user.id,
          name: 'Untitled hike',
          comment: null,
          started_at: result.startedAt.toISOString(),
          ended_at: result.endedAt.toISOString(),
          duration_sec: result.duration,
          distance_meters: distanceMeters,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (hikeError || !hikeRow) {
        throw new Error(hikeError?.message ?? 'Failed to save hike.');
      }

      const hikeId = hikeRow.id;

      if (points.length > 0) {
        const { error: pointsError } = await supabase.from('points').insert(
          points.map((point) => ({
            hike_id: hikeId,
            user_id: userData.user.id,
            lat: point.lat,
            lon: point.lon,
            timestamp: point.timestamp,
            accuracy: point.accuracy
          }))
        );
        if (pointsError) {
          throw new Error(pointsError.message);
        }
      }

      navigate(`/hike/${hikeId}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save hike.');
    } finally {
      setSaving(false);
    }
  };

  const handleWakeLockToggle = () => {
    if (keepAwake) {
      void disableKeepAwake();
    } else {
      void enableKeepAwake();
    }
  };

  return (
    <section>
      {restoredSession && (
        <div className="alert">
          Restored your last tracking session. Keep the app open to continue tracking; most
          browsers pause geolocation when the app is closed or fully backgrounded.
        </div>
      )}
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
      {wakeLockError && <div className="alert">{wakeLockError}</div>}
      {saveError && <div className="alert">{saveError}</div>}

      <div className="card">
        <p className="section-title">Live Tracking 🥾</p>
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
            <button className="primary-button button-full" onClick={start}>
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
            <button className="primary-button button-full" onClick={start}>
              Start new hike
            </button>
          )}
        </div>
        {status === 'tracking' && (
          <div style={{ marginTop: '1rem' }}>
            <button className="secondary-button" onClick={handleWakeLockToggle}>
              {keepAwake
                ? wakeLockActive
                  ? 'Allow screen to sleep'
                  : 'Re-enable keep awake'
                : 'Keep screen awake'}
            </button>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              Keeping the screen awake reduces the chance the OS suspends tracking. For
              continuous background tracking, consider installing the PWA and disabling battery
              optimizations for this site.
            </p>
          </div>
        )}
        {saving && <p className="muted">Saving hike...</p>}
      </div>
    </section>
  );
};

export default RecordPage;
