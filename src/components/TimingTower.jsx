// TimingTower — Live race order with gap, tyre, pit, DRS
import TyreDisplay from './TyreDisplay.jsx';
import { DRIVER_MAP } from '../data/drivers.js';

function formatGap(gap, isLeader) {
  if (isLeader) return 'LEAD';
  if (gap >= 60) return '+1 LAP';
  return '+' + gap.toFixed(3);
}

export default function TimingTower({ raceState, playerDriverIds = [] }) {
  if (!raceState) {
    return (
      <div className="timing-tower">
        <div className="timing-tower-header">
          <span className="text-sm text-muted">Timing Tower</span>
        </div>
        <div className="text-center text-muted text-sm" style={{ padding: 24 }}>
          Race not started
        </div>
      </div>
    );
  }

  const { drivers = [], currentLap = 0, totalLaps = 0, safetyCarActive, virtualSafetyCarActive } = raceState;

  return (
    <div className="timing-tower">
      <div className="timing-tower-header">
        <span className="text-sm text-white text-bold">
          LAP {currentLap}/{totalLaps}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {safetyCarActive && <span className="badge badge-yellow">SC</span>}
          {virtualSafetyCarActive && <span className="badge badge-yellow">VSC</span>}
        </div>
      </div>

      {drivers.map((d, i) => {
        const isPlayer = playerDriverIds.includes(d.driverId);
        const driver   = DRIVER_MAP[d.driverId];
        const isLeader = i === 0;

        return (
          <div
            key={d.driverId}
            className={`timing-row${d.dnf ? ' dnf' : ''}${isPlayer ? ' is-player' : ''}`}
          >
            <span className="t-pos">{d.dnf ? 'OUT' : d.position}</span>

            <div
              className="team-stripe"
              style={{
                background: `var(--team-${d.teamId?.replace(/_/g, '-')}, #888)`,
                minHeight: 20,
                width: 3,
                borderRadius: 2,
                flexShrink: 0,
              }}
            />

            <span className="t-code" style={{ color: isPlayer ? 'var(--accent)' : undefined }}>
              {driver?.shortName ?? d.driverId?.slice(0, 3).toUpperCase()}
            </span>

            <div className="t-tyre">
              <TyreDisplay compound={d.tyre?.compound} wear={d.tyre?.wear ?? 0} showWear={false} />
            </div>

            <span className="t-gap">
              {d.dnf ? d.dnfReason?.slice(0, 4) : formatGap(d.gap ?? 0, isLeader)}
            </span>

            <span className="t-lap">{d.pitStops ?? 0}P</span>

            <div className={`drs-light${d.drsActive ? ' active' : ''}`} />
          </div>
        );
      })}
    </div>
  );
}
