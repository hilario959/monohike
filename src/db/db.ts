import Dexie, { type Table } from 'dexie';

export interface Hike {
  id?: number;
  name?: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceMeters: number;
  createdAt: string;
}

export interface TrackPoint {
  id?: number;
  hikeId: number;
  lat: number;
  lon: number;
  timestamp: string;
  accuracy: number;
}

class MonohikeDB extends Dexie {
  hikes!: Table<Hike, number>;
  points!: Table<TrackPoint, number>;

  constructor() {
    super('monohike');
    this.version(1).stores({
      hikes: '++id, createdAt',
      points: '++id, hikeId, timestamp'
    });
  }
}

export const db = new MonohikeDB();
