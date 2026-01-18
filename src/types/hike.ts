export interface Hike {
  id: number;
  user_id: string;
  name: string | null;
  comment: string | null;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  distance_meters: number;
  created_at: string;
}

export interface TrackPoint {
  id: number;
  hike_id: number;
  user_id: string;
  lat: number;
  lon: number;
  timestamp: string;
  accuracy: number;
}

export interface HikePhoto {
  id: number;
  hike_id: number;
  user_id: string;
  path: string;
  is_cover: boolean;
  created_at: string;
}
