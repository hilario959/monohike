import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import MapView from './MapView';
import type { TrackPoint } from '../types/hike';

interface HikeMapProps {
  points: TrackPoint[];
}

const HikeMap = ({ points }: HikeMapProps) => {
  const latLngs: LatLngTuple[] = points.map((point) => [point.lat, point.lon]);
  const center: LatLngTuple = latLngs[0] ?? [37.7749, -122.4194];

  return (
    <MapContainer center={center} zoom={13} className="map-container" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {latLngs.length > 0 && <Polyline positions={latLngs} color="#16a34a" />}
      <MapView points={latLngs} />
    </MapContainer>
  );
};

export default HikeMap;
