// TeamSelectScreen — New game: choose team, enter name, start
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { TEAMS } from '../data/teams.js';

const TIERS = {
  top:    { label: 'Top Constructor', teams: ['mclaren', 'ferrari', 'mercedes', 'red_bull'] },
  mid:    { label: 'Midfield',        teams: ['aston_martin', 'alpine', 'williams', 'racing_bulls'] },
  bottom: { label: 'Backmarker',      teams: ['haas', 'audi', 'cadillac'] },
};

function teamTier(teamId) {
  for (const [key, { teams }] of Object.entries(TIERS)) {
    if (teams.includes(teamId)) return key;
  }
  return 'mid';
}

function TeamBox({ team, selected, onSelect }) {
  const tier = teamTier(team.id);
  const tierLabel = TIERS[tier]?.label ?? '';

  return (
    <div
      className={`team-select-card${selected ? ' selected' : ''}`}
      style={{ '--team-color': team.color }}
      onClick={() => onSelect(team.id)}
    >
      <div className="team-select-name">{team.shortName}</div>
      <div className="team-select-tier">{tierLabel} · {team.engineSupplier}</div>

      {/* Mini car ratings */}
      {Object.entries(team.car).slice(0, 2).map(([k, v]) => (
        <div key={k} className="attr-bar-row" style={{ marginBottom: 4 }}>
          <span className="attr-label" style={{ width: 56, fontSize: '0.65rem' }}>
            {k === 'aerodynamics' ? 'Aero' : 'Engine'}
          </span>
          <div className="attr-track">
            <div
              className="attr-fill"
              style={{
                width: `${v}%`,
                background: v >= 90 ? 'var(--green)' : v >= 80 ? 'var(--yellow)' : 'var(--orange)',
              }}
            />
          </div>
          <span className="attr-value">{v}</span>
        </div>
      ))}

      <div className="text-xs text-muted mt-sm">
        Budget: ${(TEAMS.find(t => t.id === team.id)?.finances.budget / 1_000_000).toFixed(0)}M
      </div>
    </div>
  );
}

export default function TeamSelectScreen() {
  const { dispatch } = useGame();
  const navigate     = useNavigate();

  const [selected, setSelected] = useState(null);
  const [gameName,  setGameName] = useState('');

  function startGame() {
    if (!selected) return;
    dispatch({ type: 'GAME_NEW', playerTeamId: selected, gameName: gameName.trim() || 'My Team' });
    navigate('/hub');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--gap-xl)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--gap-xl)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: -1 }}>
          F1 <span style={{ color: 'var(--accent)' }}>Manager</span> 2026
        </div>
        <div className="text-muted mt-sm">Choose your team and begin your championship campaign</div>
      </div>

      {/* Game name */}
      <div style={{ maxWidth: 400, margin: '0 auto var(--gap-lg)' }}>
        <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 4 }}>
          Save name (optional)
        </label>
        <input
          type="text"
          className="text-sm"
          placeholder="My F1 Career"
          value={gameName}
          onChange={e => setGameName(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none',
          }}
          maxLength={40}
        />
      </div>

      {/* Team grid by tier */}
      {Object.entries(TIERS).map(([tierKey, { label }]) => (
        <div key={tierKey} style={{ marginBottom: 'var(--gap-lg)' }}>
          <div className="section-title mb-md">{label}</div>
          <div className="team-grid">
            {TEAMS.filter(t => teamTier(t.id) === tierKey).map(t => (
              <TeamBox
                key={t.id}
                team={t}
                selected={selected === t.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Start button */}
      <div style={{ textAlign: 'center', marginTop: 'var(--gap-xl)' }}>
        <button
          className="btn btn-primary btn-lg"
          disabled={!selected}
          onClick={startGame}
          style={{ minWidth: 200 }}
        >
          {selected
            ? `Start with ${TEAMS.find(t => t.id === selected)?.shortName}`
            : 'Select a team to continue'}
        </button>
      </div>
    </div>
  );
}
