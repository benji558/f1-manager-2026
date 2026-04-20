// DriverCard — Driver attribute bars + team badge
import { TEAM_MAP } from '../data/teams.js';

const ATTR_LABELS = {
  pace:            'Pace',
  racecraft:       'Racecraft',
  consistency:     'Consistency',
  tyre_management: 'Tyre Mgmt',
  wet_weather:     'Wet Weather',
};

function attrColor(val) {
  if (val >= 90) return '#00c851';
  if (val >= 80) return '#ffbb00';
  if (val >= 70) return '#ff6b00';
  return '#9090a8';
}

export default function DriverCard({ driver, showTeam = true, compact = false }) {
  if (!driver) return null;
  const team = TEAM_MAP[driver.teamId];

  return (
    <div className="card card-sm" style={{ borderLeft: `3px solid ${team?.color ?? '#888'}` }}>
      <div className="flex-between mb-sm">
        <div>
          <div className="text-white text-bold" style={{ fontSize: compact ? '0.85rem' : '1rem' }}>
            {driver.shortName}
          </div>
          {!compact && (
            <div className="text-muted text-xs">{driver.name}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="text-muted text-sm">#{driver.number}</span>
          {showTeam && team && (
            <span
              className="badge badge-gray"
              style={{ color: team.color, border: `1px solid ${team.color}40` }}
            >
              {team.shortName}
            </span>
          )}
        </div>
      </div>

      {Object.entries(ATTR_LABELS).map(([key, label]) => {
        const val = driver.attributes?.[key] ?? 0;
        return (
          <div key={key} className="attr-bar-row">
            <span className="attr-label">{label}</span>
            <div className="attr-track">
              <div
                className="attr-fill"
                style={{ width: `${val}%`, background: attrColor(val) }}
              />
            </div>
            <span className="attr-value">{val}</span>
          </div>
        );
      })}
    </div>
  );
}
