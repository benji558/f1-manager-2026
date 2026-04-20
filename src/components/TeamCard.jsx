// TeamCard — Team overview: car stats, budget, staff ratings
import { TEAM_MAP } from '../data/teams.js';

const CAR_ATTR_LABELS = {
  aerodynamics:    'Aero',
  engine_power:    'Engine',
  reliability:     'Reliability',
  tyre_efficiency: 'Tyre Eff.',
};

function statColor(val) {
  if (val >= 90) return '#00c851';
  if (val >= 80) return '#ffbb00';
  if (val >= 70) return '#ff6b00';
  return '#9090a8';
}

function fmtM(val) {
  return '$' + (val / 1_000_000).toFixed(0) + 'M';
}

export default function TeamCard({ teamId, teamState, showBudget = true }) {
  const base = TEAM_MAP[teamId];
  if (!base) return null;
  const car = teamState?.car ?? base.car;

  return (
    <div className="card card-sm" style={{ borderTop: `3px solid ${base.color}` }}>
      <div className="flex-between mb-md">
        <div>
          <div className="text-white text-bold">{base.shortName}</div>
          <div className="text-muted text-xs">{base.engineSupplier} power</div>
        </div>
        <div
          className="team-dot"
          style={{ background: base.color, width: 14, height: 14 }}
        />
      </div>

      {Object.entries(CAR_ATTR_LABELS).map(([key, label]) => {
        const val = car[key] ?? 0;
        return (
          <div key={key} className="attr-bar-row">
            <span className="attr-label">{label}</span>
            <div className="attr-track">
              <div
                className="attr-fill"
                style={{ width: `${val}%`, background: statColor(val) }}
              />
            </div>
            <span className="attr-value">{val}</span>
          </div>
        );
      })}

      {showBudget && teamState && (
        <div className="divider" style={{ margin: '8px 0' }}>
          <div className="flex-between text-sm mt-sm">
            <span className="text-muted">Budget</span>
            <span className="text-bold text-white">{fmtM(teamState.budget)}</span>
          </div>
          <div className="budget-bar mt-sm">
            <div
              className={`budget-fill${teamState.budget < 20_000_000 ? ' budget-low' : ''}`}
              style={{ width: `${Math.min(100, (teamState.budget / (base.finances?.budget ?? 200_000_000)) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
