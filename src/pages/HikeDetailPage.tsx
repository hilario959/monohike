import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import HikeMap from '../components/HikeMap';
import { supabase } from '../lib/supabaseClient';
import type { Hike, HikePhoto, TrackPoint } from '../types/hike';
import { formatDistance, formatDuration, formatPace } from '../utils/format';
import { buildGpx, downloadFile } from '../utils/export';

const HikeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hike, setHike] = useState<Hike | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<HikePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const hikeId = Number(id);
    if (Number.isNaN(hikeId)) {
      navigate('/');
      return;
    }

    const load = async () => {
      const { data: storedHike, error: hikeError } = await supabase
        .from('hikes')
        .select('*')
        .eq('id', hikeId)
        .single();
      if (hikeError || !storedHike) {
        navigate('/');
        return;
      }
      setHike(storedHike);
      setName(storedHike.name ?? '');
      setComment(storedHike.comment ?? '');
      const { data: storedPoints } = await supabase
        .from('points')
        .select('*')
        .eq('hike_id', hikeId)
        .order('timestamp', { ascending: true });
      setPoints(storedPoints ?? []);
      const { data: storedPhotos } = await supabase
        .from('hike_photos')
        .select('*')
        .eq('hike_id', hikeId)
        .order('created_at', { ascending: true });
      setPhotos(storedPhotos ?? []);
    };

    load();
  }, [id, navigate]);

  const pace = useMemo(() => {
    if (!hike) return '--';
    return formatPace(hike.distance_meters, hike.duration_sec);
  }, [hike]);

  const handleSaveName = async () => {
    if (!hike?.id) return;
    setSaving(true);
    await supabase
      .from('hikes')
      .update({ name: name || 'Untitled hike', comment: comment || null })
      .eq('id', hike.id);
    setHike((prev) =>
      prev ? { ...prev, name: name || 'Untitled hike', comment: comment || null } : prev
    );
    setSaving(false);
  };

  const handleExport = () => {
    if (!hike) return;
    const gpx = buildGpx(hike, points);
    const filename = `${(hike.name ?? 'monohike').replace(/\s+/g, '-')}.gpx`;
    downloadFile(gpx, filename, 'application/gpx+xml');
  };

  const handleDelete = async () => {
    const hikeId = hike?.id;
    if (!hikeId) return;
    const confirmed = window.confirm('Delete this hike permanently? This cannot be undone.');
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error: pointsError } = await supabase.from('points').delete().eq('hike_id', hikeId);
      if (pointsError) throw new Error(pointsError.message);
      const { error: hikeError } = await supabase.from('hikes').delete().eq('id', hikeId);
      if (hikeError) throw new Error(hikeError.message);
      navigate('/');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete hike.');
      setDeleting(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hike?.id || !event.target.files?.length) return;
    setUploading(true);
    setUploadError(null);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setUploadError(userError?.message ?? 'You must be signed in to upload.');
      setUploading(false);
      return;
    }
    const files = Array.from(event.target.files);
    try {
      const uploadedPhotos: HikePhoto[] = [];
      for (const file of files) {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 2400,
          initialQuality: 0.92,
          useWebWorker: true
        });
        const extension = compressed.type.split('/')[1] || 'jpg';
        const fileName = `${crypto.randomUUID?.() ?? Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}.${extension}`;
        const path = `${userData.user.id}/${hike.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('hike-photos')
          .upload(path, compressed, { contentType: compressed.type });
        if (uploadError) {
          throw new Error(uploadError.message);
        }
        const { data: photoRow, error: photoError } = await supabase
          .from('hike_photos')
          .insert({
            hike_id: hike.id,
            user_id: userData.user.id,
            path,
            is_cover: false
          })
          .select('*')
          .single();
        if (photoError || !photoRow) {
          throw new Error(photoError?.message ?? 'Failed to save photo.');
        }
        uploadedPhotos.push(photoRow);
      }
      setPhotos((prev) => [...prev, ...uploadedPhotos]);
      event.target.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload photos.');
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (photoId: number) => {
    if (!hike?.id) return;
    await supabase
      .from('hike_photos')
      .update({ is_cover: false })
      .eq('hike_id', hike.id);
    const { data: updated, error } = await supabase
      .from('hike_photos')
      .update({ is_cover: true })
      .eq('id', photoId)
      .select('*')
      .single();
    if (!error && updated) {
      setPhotos((prev) => prev.map((photo) => ({ ...photo, is_cover: photo.id === photoId })));
    }
  };

  const handleDeletePhoto = async (photo: HikePhoto) => {
    const { error: storageError } = await supabase.storage.from('hike-photos').remove([photo.path]);
    if (storageError) {
      setUploadError(storageError.message);
      return;
    }
    const { error } = await supabase.from('hike_photos').delete().eq('id', photo.id);
    if (error) {
      setUploadError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
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
        <label className="muted" htmlFor="hike-comment" style={{ marginTop: '0.75rem' }}>
          Comment
        </label>
        <textarea
          id="hike-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add a note about this hike..."
          rows={4}
        />
        <div className="button-row" style={{ marginTop: '0.75rem' }}>
          <button className="secondary-button" onClick={handleSaveName} disabled={saving}>
            {saving ? 'Saving...' : 'Save details'}
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
            <div className="stat-value">{formatDistance(hike.distance_meters)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{formatDuration(hike.duration_sec)}</div>
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
        <p className="section-title">Photos</p>
        {uploadError && <p className="alert">{uploadError}</p>}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading && <p className="muted">Uploading...</p>}
        {photos.length > 0 && (
          <div className="hike-photo-grid">
            {photos.map((photo) => {
              const { data: urlData } = supabase.storage
                .from('hike-photos')
                .getPublicUrl(photo.path);
              return (
                <div key={photo.id} className="hike-photo-card">
                  <img
                    src={urlData.publicUrl}
                    alt=""
                    className={`hike-photo${photo.is_cover ? ' is-cover' : ''}`}
                    loading="lazy"
                  />
                  <div className="hike-photo-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleSetCover(photo.id)}
                    >
                      {photo.is_cover ? 'Cover' : 'Set cover'}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeletePhoto(photo)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
