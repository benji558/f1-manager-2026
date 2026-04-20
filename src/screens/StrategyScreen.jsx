// StrategyScreen — Pre-race: starting compound, pit windows, fuel mode
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { CIRCUITS } from '../data/circuits.js';
import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP } from '../data/teams.js';
import TyreDisplay from '../components/TyreDisplay.jsx';

const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD'];
const WET_COMPOUNDS = ['INTERMEDIATE', 'WET'];
const FUEL_MODES = ['LEAN', 'STANDARD', 'RICH'];
const FUEL_MODE_DESC = {
  LEAN:     'Save fuel · slightly slower · extend stint',
  STANDARD: 'Balanced fuel consumption',
  RICH:     'Fastest pace · heavy fuel burn',
};

const TYRE_LAPS = { SOFT: 22, MEDIUM: 38, HARD: 55 };

export default function StrategyScreen() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  if (!state) return null;

  const { currentRaceIndex, playerDriverIds, playerTeamId, raceStrategy, weekendData } = state;
  const circuit = CIRCUITS[currentRaceIndex];

  function setCompound(driverId, compound) {
    dispatch({ type: 'STRATEGY_SET_COMPOUND', driverId, compound });
  }

  function setFuelMode(driverId, mode) {
    dispatch({ type: 'STRATEGY_SET_FUEL_MODE', driverId, mode });
  }

  function addPit(driverId, onLap, compound) {
    dispatch({ type: 'STRATEGY_ADD_PIT', driverId, onLap, compound });
  }

  function removePit(driverId, pitIndex) {
    dispatch({ type: 'STRATEGY_REMOVE_PIT', driverId, pitIndex });
  }

  function startRace() {
    dispatch({ type: 'SEASON_ADVANCE_PHASE', nextPhase: 'RACE' });
    navigate('/race');
  }

  const Q2Rule = weekendData?.q2TyreRule ?? {};

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Race Strategy — {circuit?.shortName}</div>
          <div className="page-subtitle">
            {circuit?.name} · {circuit?.laps} laps · Tyre wear: {circuit?.tyreWear}/100
          </div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={() => navigate('/qualifying')}>← Grid</button>
          <button className="btn btn-primary btn-lg" onClick={startRace}>
            ▶ Start Race
          </button>
        </div>
      </div>

      {/* Driver strategy cards */}
      <div className="grid-2">
        {playerDriverIds.map(driverId => {
          const driver   = DRIVER_MAP[driverId];
          const strategy = raceStrategy[driverId] ?? { startingCompound: 'MEDIUM', plannedPits: [], fuelMode: 'STANDARD' };
          const q2forced = Q2Rule[driverId]; // compound forced by Q2 rule

          return (
            <div key={driverId} className="card">
              <div className="card-header">
                <span className="card-title">{driver?.name ?? driverId}</span>
                <span className="text-muted text-sm">{driver?.shortName} — P{
                  weekendData?.grid?.find(g => g.driverId === driverId)?.gridPosition ?? '?'
                }</span>
              </div>

              {/* Starting compound */}
              <div className="section-title mb-sm">Starting Compound</div>
              {q2forced && (
                <div className="badge badge-yellow mb-sm">
                  Q2 rule: must start on {q2forced}
                </div>
              )}
              <div className="compound-grid mb-md">
                {COMPOUNDS.map(compound => (
                  <button
                    key={compound}
                    className={`compound-btn${strategy.startingCompound === compound ? ' selected' : ''}`}
                    onClick={() => !q2forced && setCompound(driverId, compound)}
                    disabled={!!q2forced}
                  >
                    <TyreDisplay compound={compound} showWear={false} />
                    <span>{compound}</span>
                    <span className="text-xs text-muted">~{TYRE_LAPS[compound]} laps</span>
                  </button>
                ))}
              </div>

              {/* Fuel mode */}
              <div className="section-title mb-sm">Fuel Mode</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--gap-md)' }}>
                {FUEL_MODES.map(mode => (
                  <button
                    key={mode}
                    className={`btn btn-sm${strategy.fuelMode === mode ? ' btn-primary' : ' btn-secondary'}`}
                    onClick={() => setFuelMode(driverId, mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted mb-md" style={{ fontStyle: 'italic' }}>
                {FUEL_MODE_DESC[strategy.fuelMode ?? 'STANDARD']}
              </div>

              {/* Planned pit stops */}
              <div className="flex-between mb-sm">
                <span className="section-title">Planned Pit Stops</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const lastPit = strategy.plannedPits?.slice(-1)[0];
                    const onLap   = lastPit ? lastPit.onLap + 20 : Math.floor(circuit.laps / 2);
                    addPit(driverId, Math.min(onLap, circuit.laps - 5), 'HARD');
                  }}
                >
                  + Add Stop
                </button>
              </div>

              {strategy.plannedPits?.length === 0 && (
                <div className="text-sm text-muted mb-md">No planned stops (1-stop or holding)</div>
              )}

              {strategy.plannedPits?.map((pit, idx) => (
                <div key={idx} className="panel flex-between mb-sm" style={{ padding: '8px 12px' }}>
                  <div className="flex items-center gap-sm">
                    <span className="text-sm text-white text-bold">Lap {pit.onLap}</span>
                    <TyreDisplay compound={pit.toCompound} showWear={false} />
                    <span className="text-sm text-muted">{pit.toCompound}</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removePit(driverId, idx)}
                    style={{ color: 'var(--red)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Pit compound selector for last stop */}
              {strategy.plannedPits?.length > 0 && (
                <div className="compound-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {COMPOUNDS.map(c => (
                    <button
                      key={c}
                      className={`compound-btn${strategy.plannedPits.slice(-1)[0]?.toCompound === c ? ' selected' : ''}`}
                      onClick={() => {
                        const pits = strategy.plannedPits.map((p, i) =>
                          i === strategy.plannedPits.length - 1 ? { ...p, toCompound: c } : p
                        );
                        dispatch({ type: 'STRATEGY_REMOVE_PIT', driverId, pitIndex: strategy.plannedPits.length - 1 });
                        dispatch({ type: 'STRATEGY_ADD_PIT', driverId, onLap: strategy.plannedPits.slice(-1)[0].onLap, compound: c });
                      }}
                    >
                      <TyreDisplay compound={c} showWear={false} />
                      <span className="text-xs">{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Circuit notes */}
      <div className="card mt-lg">
        <div className="card-title mb-md">Circuit Notes</div>
        <div className="grid-3">
          <div className="panel text-center">
            <div className="text-bold text-white">{circuit?.tyreWear}</div>
            <div className="text-xs text-muted">Tyre Wear</div>
            <div className="text-xs text-muted mt-sm">
              {circuit?.tyreWear >= 80 ? 'Extreme — 3-stop likely' :
               circuit?.tyreWear >= 65 ? 'High — 2-stop optimal' : 'Moderate — 1-stop viable'}
            </div>
          </div>
          <div className="panel text-center">
            <div className="text-bold text-white">{circuit?.overtakingDifficulty}</div>
            <div className="text-xs text-muted">Overtaking Difficulty</div>
            <div className="text-xs text-muted mt-sm">
              {circuit?.overtakingDifficulty >= 85 ? 'Very hard — track position key' :
               circuit?.overtakingDifficulty >= 60 ? 'Difficult — DRS important' : 'Moderate — overtaking possible'}
            </div>
          </div>
          <div className="panel text-center">
            <div className="text-bold text-white">{circuit?.weatherRisk}%</div>
            <div className="text-xs text-muted">Rain Risk</div>
            <div className="text-xs text-muted mt-sm">
              {circuit?.weatherRisk >= 50 ? 'High — monitor closely' :
               circuit?.weatherRisk >= 25 ? 'Moderate — prepare inters' : 'Low — dry expected'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
