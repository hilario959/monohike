import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineMeters } from '../utils/geo';

export interface RecorderPoint {
  lat: number;
  lon: number;
  timestamp: string;
  accuracy: number;
}

export type RecorderStatus = 'idle' | 'tracking' | 'paused' | 'ended' | 'error';

const MAX_ACCURACY = 50;
const MAX_SPEED = 7;

export const useHikeRecorder = () => {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [points, setPoints] = useState<RecorderPoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastPointRef = useRef<RecorderPoint | null>(null);
  const accumulatedRef = useRef(0);
  const startedAtDateRef = useRef<Date | null>(null);

  const clearWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    const startTime = Date.now();
    startedAtRef.current = new Date(startTime);
    timerRef.current = window.setInterval(() => {
      if (!startedAtRef.current) return;
      const diff = (Date.now() - startedAtRef.current.getTime()) / 1000;
      setElapsedSec(Math.floor(accumulatedRef.current + diff));
    }, 1000);
  };

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
      if (deltaSec > 0) {
        const segment = haversineMeters(lastPointRef.current, nextPoint);
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
  }, [startTimer, startWatch]);

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
  }, [status]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    setStatus('tracking');
    startedAtRef.current = new Date();
    startTimer();
    startWatch();
  }, [startTimer, startWatch, status]);

  const finish = useCallback(() => {
    clearWatch();
    clearTimer();
    if (startedAtRef.current) {
      accumulatedRef.current +=
        (Date.now() - startedAtRef.current.getTime()) / 1000;
    }
    const duration = Math.floor(accumulatedRef.current);
    setElapsedSec(duration);
    setStatus('ended');
    return {
      startedAt: startedAtDateRef.current,
      endedAt: new Date(),
      duration
    };
  }, []);

  useEffect(() => {
    return () => {
      clearWatch();
      clearTimer();
    };
  }, []);

  return {
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
  };
};
