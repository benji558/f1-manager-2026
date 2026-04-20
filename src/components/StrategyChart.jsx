// StrategyChart — Projected vs actual lap time chart using recharts
// Only file in the project that imports recharts.
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatLapTime } from '../engine/engineUtils.js';

export default function StrategyChart({ raceState, playerDriverIds = [] }) {
  if (!raceState?.drivers?.length) {
    return (
      <div className="flex-center" style={{ height: 200 }}>
        <span className="text-muted text-sm">No lap data yet</span>
      </div>
    );
  }

  // Build data points from driver lap history (we approximate from current state)
  const playerDrivers = raceState.drivers.filter(d => playerDriverIds.includes(d.driverId));

  const data = [];
  const lap = raceState.currentLap;
  // Simple: show last lap time as a single point (real version would track history)
  if (lap > 0) {
    const point = { lap };
    playerDrivers.forEach(d => {
      point[d.driverId] = d.lastLapTime ? parseFloat(d.lastLapTime.toFixed(3)) : null;
    });
    data.push(point);
  }

  // If only one data point, just show current lap times as text
  if (data.length < 2) {
    return (
      <div className="panel">
        <div className="section-title mb-sm">Lap Times</div>
        {playerDrivers.map(d => (
          <div key={d.driverId} className="flex-between text-sm mb-sm">
            <span className="text-muted">{d.driverId?.slice(0, 3).toUpperCase()}</span>
            <span className="text-white text-bold monospace-data">
              {d.lastLapTime ? formatLapTime(d.lastLapTime) : '—'}
            </span>
            <span className="text-muted text-xs">Lap {raceState.currentLap}</span>
          </div>
        ))}
      </div>
    );
  }

  const COLORS = ['var(--accent)', 'var(--blue)'];

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="lap" stroke="var(--text-muted)" tick={{ fontSize: 11 }} label={{ value: 'Lap', position: 'insideBottom', offset: -2 }} />
          <YAxis
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            tickFormatter={v => formatLapTime(v)}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}
            formatter={(v, name) => [formatLapTime(v), name.slice(0, 3).toUpperCase()]}
          />
          {playerDrivers.map((d, i) => (
            <Line
              key={d.driverId}
              type="monotone"
              dataKey={d.driverId}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
