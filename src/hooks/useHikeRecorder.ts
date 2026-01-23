import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineMeters } from '../utils/geo';

export interface RecorderPoint {
  lat: number;
  lon: number;
  timestamp: string;
  accuracy: number;
}

export type RecorderStatus = 'idle' | 'tracking' | 'paused' | 'ended' | 'error';

interface PersistedSession {
  status: RecorderStatus;
  points: RecorderPoint[];
  distanceMeters: number;
  elapsedSec: number;
  accuracy: number | null;
  lastPoint: RecorderPoint | null;
  accumulatedSec: number;
  startedAt: string | null;
  updatedAt: string;
}

const MAX_ACCURACY = 50;
const MAX_SPEED = 7;
const MIN_POINT_INTERVAL_SEC = 1;
const MIN_POINT_DISTANCE_METERS = 2;
const RESTORE_FRESHNESS_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'hike-recorder-session-v1';
const LAST_FINISHED_KEY = 'hike-recorder-last-finished-v1';

export const useHikeRecorder = () => {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [points, setPoints] = useState<RecorderPoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoredSession, setRestoredSession] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastPointRef = useRef<RecorderPoint | null>(null);
  const accumulatedRef = useRef(0);
  const startedAtDateRef = useRef<Date | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    const startTime = Date.now();
    startedAtRef.current = new Date(startTime);
    timerRef.current = window.setInterval(() => {
      if (!startedAtRef.current) return;
      const diff = (Date.now() - startedAtRef.current.getTime()) / 1000;
      setElapsedSec(Math.floor(accumulatedRef.current + diff));
    }, 1000);
  }, [clearTimer]);

  const clearPersistedSession = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const recordFinishedSession = () => {
    try {
      localStorage.setItem(LAST_FINISHED_KEY, new Date().toISOString());
    } catch {
      // Ignore storage failures for the finished marker.
    }
  };

  const isQuotaExceededError = (storageError: unknown) => {
    if (!(storageError instanceof DOMException)) {
      return false;
    }
    return (
      storageError.name === 'QuotaExceededError' ||
      storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      storageError.name === 'QUOTA_EXCEEDED_ERR'
    );
  };

  const persistSession = (payload: PersistedSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return;
    } catch (storageError) {
      if (!isQuotaExceededError(storageError)) {
        clearPersistedSession();
        return;
      }
    }

    const fallbackPayload: PersistedSession = {
      ...payload,
      points: payload.lastPoint ? [payload.lastPoint] : []
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackPayload));
    } catch {
      clearPersistedSession();
    }
  };

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) {
      setWakeLockActive(false);
      return;
    }
    try {
      await wakeLockRef.current.release();
    } catch (releaseError) {
      setWakeLockError(
        releaseError instanceof Error ? releaseError.message : 'Failed to release wake lock.'
      );
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      setWakeLockError('Screen Wake Lock is not supported on this device.');
      setWakeLockActive(false);
      return;
    }
    if (wakeLockRef.current) {
      setWakeLockActive(true);
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      setWakeLockError(null);
      sentinel.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
      });
    } catch (requestError) {
      setWakeLockError(
        requestError instanceof Error ? requestError.message : 'Failed to request wake lock.'
      );
      setWakeLockActive(false);
    }
  }, []);

  const enableKeepAwake = useCallback(async () => {
    setKeepAwake(true);
    if (status === 'tracking') {
      await requestWakeLock();
    }
  }, [requestWakeLock, status]);

  const disableKeepAwake = useCallback(async () => {
    setKeepAwake(false);
    await releaseWakeLock();
  }, [releaseWakeLock]);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy: positionAccuracy } = position.coords;
    if (positionAccuracy > MAX_ACCURACY) return;
    const timestamp = new Date(position.timestamp).toISOString();
    setAccuracy(positionAccuracy);

    const nextPoint: RecorderPoint = {
      lat: latitude,
      lon: longitude,
      timestamp,
      accuracy: positionAccuracy
    };

    if (lastPointRef.current) {
      const deltaSec =
        (new Date(nextPoint.timestamp).getTime() -
          new Date(lastPointRef.current.timestamp).getTime()) /
        1000;
      if (deltaSec < MIN_POINT_INTERVAL_SEC) {
        return;
      }
      if (deltaSec > 0) {
        const segment = haversineMeters(lastPointRef.current, nextPoint);
        if (segment < MIN_POINT_DISTANCE_METERS) {
          return;
        }
        const speed = segment / deltaSec;
        if (speed > MAX_SPEED) return;
        setDistanceMeters((prev) => prev + segment);
      }
    }

    lastPointRef.current = nextPoint;
    setPoints((prev) => [...prev, nextPoint]);
  }, []);

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device.');
      setStatus('error');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, (err) => {
      setError(err.message || 'Unable to access your location.');
      setStatus('error');
    }, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
  }, [handlePosition]);

  const start = useCallback(() => {
    clearPersistedSession();
    setRestoredSession(false);
    setError(null);
    setStatus('tracking');
    setPoints([]);
    setDistanceMeters(0);
    setElapsedSec(0);
    setAccuracy(null);
    lastPointRef.current = null;
    accumulatedRef.current = 0;
    startedAtRef.current = new Date();
    startedAtDateRef.current = new Date();
    startTimer();
    startWatch();
    if (keepAwake) {
      void requestWakeLock();
    }
  }, [keepAwake, requestWakeLock, startTimer, startWatch]);

  const pause = useCallback(() => {
    if (status !== 'tracking') return;
    clearWatch();
    if (startedAtRef.current) {
      accumulatedRef.current +=
        (Date.now() - startedAtRef.current.getTime()) / 1000;
    }
    startedAtRef.current = null;
    clearTimer();
    setStatus('paused');
    void releaseWakeLock();
  }, [clearTimer, clearWatch, releaseWakeLock, status]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    setStatus('tracking');
    startedAtRef.current = new Date();
    startTimer();
    startWatch();
    if (keepAwake) {
      void requestWakeLock();
    }
  }, [keepAwake, requestWakeLock, startTimer, startWatch, status]);

  const finish = useCallback(() => {
    clearWatch();
    clearTimer();
    void releaseWakeLock();
    if (startedAtRef.current) {
      accumulatedRef.current +=
        (Date.now() - startedAtRef.current.getTime()) / 1000;
    }
    const duration = Math.floor(accumulatedRef.current);
    setElapsedSec(duration);
    setStatus('ended');
    clearPersistedSession();
    setRestoredSession(false);
    recordFinishedSession();
    return {
      startedAt: startedAtDateRef.current,
      endedAt: new Date(),
      duration
    };
  }, [clearTimer, clearWatch, releaseWakeLock]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const lastFinishedAt = localStorage.getItem(LAST_FINISHED_KEY);
    try {
      const parsed = JSON.parse(stored) as PersistedSession;
      if (parsed.status === 'tracking' || parsed.status === 'paused') {
        if (parsed.startedAt && lastFinishedAt) {
          const startedAtMs = new Date(parsed.startedAt).getTime();
          const finishedAtMs = new Date(lastFinishedAt).getTime();
          if (!Number.isNaN(startedAtMs) && !Number.isNaN(finishedAtMs) && startedAtMs <= finishedAtMs) {
            clearPersistedSession();
            return;
          }
        }
        const updatedAtMs = new Date(parsed.updatedAt).getTime();
        const isFresh = Date.now() - updatedAtMs <= RESTORE_FRESHNESS_MS;
        const extraSec = parsed.status === 'tracking' && isFresh
          ? Math.max(0, (Date.now() - updatedAtMs) / 1000)
          : 0;
        const nextElapsed = parsed.elapsedSec + extraSec;
        setStatus(parsed.status);
        setPoints(parsed.points ?? []);
        setDistanceMeters(parsed.distanceMeters ?? 0);
        setAccuracy(parsed.accuracy ?? null);
        setElapsedSec(Math.floor(nextElapsed));
        accumulatedRef.current = nextElapsed;
        lastPointRef.current = parsed.lastPoint ?? null;
        startedAtDateRef.current = parsed.startedAt ? new Date(parsed.startedAt) : null;
        setRestoredSession(true);
        if (parsed.status === 'tracking' && isFresh) {
          startTimer();
          startWatch();
        } else if (parsed.status === 'tracking') {
          setStatus('paused');
        }
      } else {
        clearPersistedSession();
      }
    } catch {
      clearPersistedSession();
    }
  }, [startTimer, startWatch]);

  useEffect(() => {
    if (status === 'tracking' || status === 'paused') {
      const payload: PersistedSession = {
        status,
        points,
        distanceMeters,
        elapsedSec,
        accuracy,
        lastPoint: lastPointRef.current,
        accumulatedSec: accumulatedRef.current,
        startedAt: startedAtDateRef.current?.toISOString() ?? null,
        updatedAt: new Date().toISOString()
      };
      persistSession(payload);
    } else {
      clearPersistedSession();
    }
  }, [accuracy, distanceMeters, elapsedSec, points, status]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && keepAwake && status === 'tracking') {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [keepAwake, requestWakeLock, status]);

  useEffect(() => {
    return () => {
      clearWatch();
      clearTimer();
      void releaseWakeLock();
    };
  }, [clearTimer, clearWatch, releaseWakeLock]);

  return {
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
  };
};
