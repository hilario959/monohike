import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';

interface MapViewProps {
  points: LatLngTuple[];
}

const MapView = ({ points }: MapViewProps) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [20, 20] });
  }, [map, points]);

  return null;
};

export default MapView;
