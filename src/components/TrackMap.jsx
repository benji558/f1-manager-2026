// TrackMap — SVG track outline + animated car position dots
// Cars are positioned by interpolating along the trackPoints polyline (t = 0.0–1.0)

import { useMemo } from 'react';
import { interpolatePolyline } from '../engine/engineUtils.js';
import { DRIVER_MAP } from '../data/drivers.js';

const VIEWBOX_W = 1000;
const VIEWBOX_H = 700;

// Build polyline segment lengths for interpolation
function buildSegments(points) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    total += len;
    segs.push({ from: points[i - 1], to: points[i], cumLen: total });
  }
  return { segs, total };
}

// Interpolate position along track at t = 0..1
function posAtT(segments, total, t) {
  const target = t * total;
  for (const seg of segments) {
    if (seg.cumLen >= target) {
      const prev = seg.cumLen - Math.sqrt(
        (seg.to.x - seg.from.x) ** 2 + (seg.to.y - seg.from.y) ** 2
      );
      const frac = (target - prev) / (seg.cumLen - prev);
      return {
        x: seg.from.x + (seg.to.x - seg.from.x) * frac,
        y: seg.from.y + (seg.to.y - seg.from.y) * frac,
      };
    }
  }
  return segments[segments.length - 1]?.to ?? { x: 0, y: 0 };
}

export default function TrackMap({ circuit, raceState, playerDriverIds = [] }) {
  const trackPoints = circuit?.trackPoints ?? [];

  const { segs, total } = useMemo(() => {
    if (!trackPoints.length) return { segs: [], total: 0 };
    return buildSegments(trackPoints);
  }, [trackPoints]);

  // Build SVG polyline path string
  const polylinePoints = useMemo(() => {
    return trackPoints.map(p => `${p.x},${p.y}`).join(' ');
  }, [trackPoints]);

  const drivers = raceState?.drivers ?? [];
  const totalLaps = raceState?.totalLaps ?? 1;

  if (!trackPoints.length) {
    return (
      <div className="track-map-container flex-center" style={{ height: '100%', minHeight: 300 }}>
        <span className="text-muted text-sm">No track data</span>
      </div>
    );
  }

  return (
    <div className="track-map-container" style={{ height: '100%', minHeight: 300 }}>
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Track outline (thick, dark) */}
        <polyline points={polylinePoints} className="track-path" />
        {/* Track inner line */}
        <polyline points={polylinePoints} className="track-path-inner" />

        {/* Sector markers */}
        {circuit?.sectors && segs.length > 0 && (
          <>
            {[circuit.sectors.s1End, circuit.sectors.s2End].map((t, si) => {
              const pos = posAtT(segs, total, t);
              return (
                <circle key={si} cx={pos.x} cy={pos.y} r={8}
                  fill="none" stroke="#ffbb00" strokeWidth={2} opacity={0.5} />
              );
            })}
          </>
        )}

        {/* Start / finish line */}
        {segs.length > 0 && (() => {
          const p0 = trackPoints[0];
          const p1 = trackPoints[1] ?? trackPoints[0];
          // Perpendicular tick mark
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len * 12;
          const ny =  dx / len * 12;
          return (
            <line
              x1={p0.x - nx} y1={p0.y - ny}
              x2={p0.x + nx} y2={p0.y + ny}
              stroke="#fff" strokeWidth={3} opacity={0.8}
            />
          );
        })()}

        {/* Car dots — positioned by lap progress */}
        {drivers.filter(d => !d.dnf).map((d, i) => {
          if (!segs.length || !total) return null;

          // Estimate track position: (currentLap - 1 + lapFraction) / totalLaps
          // We approximate lapFraction from position (leader ahead, others behind)
          const gapAsLapFraction = Math.min((d.gap ?? 0) / (circuit?.baseLapTime ?? 90), 0.99);
          const lapProgress = Math.max(0, Math.min(1,
            ((raceState.currentLap - 1) / totalLaps) - gapAsLapFraction / totalLaps
          ));
          // t along the track within current lap (0..1)
          const t = lapProgress % (1 / totalLaps) * totalLaps;
          const pos = posAtT(segs, total, Math.max(0, Math.min(1, t)));

          const isPlayer = playerDriverIds.includes(d.driverId);
          const teamId   = d.teamId?.replace(/_/g, '-') ?? 'haas';
          const color    = `var(--team-${teamId}, #888)`;

          return (
            <g key={d.driverId}>
              <circle
                className={`car-dot${isPlayer ? ' is-player' : ''}`}
                cx={pos.x}
                cy={pos.y}
                r={isPlayer ? 8 : 5}
                fill={color}
                stroke={isPlayer ? '#fff' : 'rgba(0,0,0,0.4)'}
                strokeWidth={isPlayer ? 2 : 1}
              />
              {isPlayer && (
                <text
                  x={pos.x}
                  y={pos.y - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#fff"
                  fontWeight="bold"
                >
                  P{d.position}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Circuit name overlay */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(0,0,0,0.6)', borderRadius: 4,
        padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700,
        color: '#fff', pointerEvents: 'none',
      }}>
        {circuit?.shortName ?? circuit?.name ?? ''}
      </div>
    </div>
  );
}
