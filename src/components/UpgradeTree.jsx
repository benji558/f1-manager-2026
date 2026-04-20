// UpgradeTree — R&D upgrade columns with pip progress indicators
import { TEAM_MAP } from '../data/teams.js';

const COLUMNS = [
  { key: 'aerodynamics',    label: 'Aerodynamics' },
  { key: 'engine_power',    label: 'Engine Power' },
  { key: 'reliability',     label: 'Reliability' },
  { key: 'tyre_efficiency', label: 'Tyre Efficiency' },
];

function fmtM(val) {
  return '$' + (val / 1_000_000).toFixed(0) + 'M';
}

export default function UpgradeTree({ teamId, teamState, onUpgrade }) {
  const base = TEAM_MAP[teamId];
  if (!base || !teamState) return null;

  const { upgrades = {}, budget = 0 } = teamState;
  const spec = base.upgradeSpec ?? {};

  return (
    <div className="upgrade-tree">
      {COLUMNS.map(({ key, label }) => {
        const colSpec   = spec[key] ?? { maxLevel: 10, costPerLevel: [] };
        const current   = upgrades[key] ?? 0;
        const maxLevel  = colSpec.maxLevel;
        const nextCost  = current < maxLevel ? (colSpec.costPerLevel[current] ?? 0) : 0;
        const canAfford = budget >= nextCost && current < maxLevel;
        const baseVal   = base.car[key] ?? 0;
        const liveVal   = baseVal + current * 0.8;

        return (
          <div key={key} className="upgrade-column">
            <div className="upgrade-column-title">{label}</div>
            <div className="card card-sm" style={{ textAlign: 'center' }}>
              <div className="text-2xl text-bold text-white">{liveVal.toFixed(1)}</div>
              <div className="text-xs text-muted mb-sm">Current Rating</div>

              {/* Pip row */}
              <div className="upgrade-level-indicator" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                {Array.from({ length: maxLevel }, (_, i) => (
                  <div key={i} className={`upgrade-pip${i < current ? ' filled' : ''}`} />
                ))}
              </div>
            </div>

            {/* Level nodes */}
            {Array.from({ length: maxLevel }, (_, i) => {
              const level  = i + 1;
              const done   = level <= current;
              const next   = level === current + 1;
              const locked = level > current + 1;
              const cost   = colSpec.costPerLevel[i] ?? 0;
              const gain   = (0.8).toFixed(1);

              let nodeClass = 'upgrade-node';
              if (done)   nodeClass += ' done';
              else if (next && canAfford) nodeClass += ' available';
              else if (locked) nodeClass += ' locked';

              return (
                <div
                  key={level}
                  className={nodeClass}
                  onClick={() => next && canAfford && onUpgrade?.(key)}
                >
                  <div className="flex-between">
                    <span className="text-xs text-muted text-upper">Level {level}</span>
                    {done && <span className="badge badge-green">✓</span>}
                    {next && !canAfford && <span className="badge badge-gray">No funds</span>}
                  </div>
                  <div className="flex-between mt-sm">
                    <span className="text-xs text-green">+{gain} rating</span>
                    {!done && <span className="text-xs text-muted">{fmtM(cost)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
