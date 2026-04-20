// CalendarScreen — 24-race calendar grid
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { CIRCUITS } from '../data/circuits.js';

const FLAGS = {
  'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵',
  'China': '🇨🇳', 'Miami': '🇺🇸', 'Italy': '🇮🇹', 'Monaco': '🇲🇨',
  'Spain': '🇪🇸', 'Canada': '🇨🇦', 'Austria': '🇦🇹', 'Britain': '🇬🇧',
  'Belgium': '🇧🇪', 'Hungary': '🇭🇺', 'Netherlands': '🇳🇱',
  'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬', 'USA': '🇺🇸',
  'Mexico City': '🇲🇽', 'Brazil': '🇧🇷', 'Las Vegas': '🇺🇸',
  'Qatar': '🇶🇦', 'Abu Dhabi': '🇦🇪',
};

function getFlag(circuit) {
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (circuit.country.includes(key) || circuit.city?.includes(key) || circuit.name?.includes(key)) {
      return flag;
    }
  }
  return '🏁';
}

export default function CalendarScreen() {
  const { state } = useGame();
  const navigate  = useNavigate();

  if (!state) return null;

  const { currentRaceIndex, raceResults } = state;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">2026 Calendar</div>
          <div className="page-subtitle">
            {raceResults.length} of 24 races completed
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/hub')}>
          ← Back to Hub
        </button>
      </div>

      <div className="calendar-grid">
        {CIRCUITS.map((circuit, i) => {
          const isDone = i < raceResults.length;
          const isNext = i === currentRaceIndex;
          const result = raceResults[i];

          let cardClass = 'race-card';
          if (isDone) cardClass += ' race-done';
          else if (isNext) cardClass += ' race-next';

          return (
            <div key={circuit.id} className={cardClass}>
              <div className="race-number">ROUND {i + 1}</div>
              <div className="race-flag">{getFlag(circuit)}</div>
              <div className="race-name">{circuit.name}</div>
              <div className="race-date">{circuit.date ?? `2026`}</div>

              <div className="flex items-center gap-xs mt-sm" style={{ flexWrap: 'wrap' }}>
                {circuit.streetCircuit && (
                  <span className="badge badge-yellow">Street</span>
                )}
                {circuit.nightRace && (
                  <span className="badge badge-blue">Night</span>
                )}
                {circuit.tyreWear >= 80 && (
                  <span className="badge badge-red">High Wear</span>
                )}
                {circuit.weatherRisk >= 40 && (
                  <span className="badge badge-blue">⛈ Risk</span>
                )}
              </div>

              {isDone && result && (
                <div className="mt-sm text-xs text-muted">
                  Completed ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
