import type { Hike, TrackPoint } from '../types/hike';

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildGpx = (hike: Hike, points: TrackPoint[]) => {
  const name = escapeXml(hike.name ?? `Hike ${new Date(hike.started_at).toLocaleDateString()}`);
  const trackPoints = points
    .map(
      (point) =>
        `    <trkpt lat="${point.lat}" lon="${point.lon}">\n      <time>${point.timestamp}</time>\n    </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="MonoHike" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <metadata><time>${hike.started_at}</time></metadata>\n` +
    `  <trk>\n` +
    `    <name>${name}</name>\n` +
    `    <trkseg>\n${trackPoints}\n    </trkseg>\n` +
    `  </trk>\n` +
    `</gpx>`;
};

export const downloadFile = (data: string, filename: string, type: string) => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
