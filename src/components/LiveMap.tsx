import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import MapView from './MapView';
import type { RecorderPoint } from '../hooks/useHikeRecorder';

interface LiveMapProps {
  points: RecorderPoint[];
}

const LiveMap = ({ points }: LiveMapProps) => {
  const latLngs: LatLngTuple[] = points.map((point) => [point.lat, point.lon]);
  const center: LatLngTuple = latLngs[0] ?? [37.7749, -122.4194];

  return (
    <MapContainer center={center} zoom={13} className="map-container" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {latLngs.length > 0 && <Polyline positions={latLngs} color="#1d4ed8" />}
      <MapView points={latLngs} />
    </MapContainer>
  );
};

export default LiveMap;
