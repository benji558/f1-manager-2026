// QualifyingScreen — Q1/Q2/Q3 animated timing tower + lap-by-lap reveal
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { CIRCUITS } from '../data/circuits.js';
import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP } from '../data/teams.js';
import { runFullQualifying } from '../engine/qualifyingEngine.js';
import { prepareRaceWeekend } from '../game/seasonManager.js';
import { formatLapTime } from '../engine/engineUtils.js';

const SESSION_LABELS = { q1: 'Q1', q2: 'Q2', q3: 'Q3 (Pole) ' };
const ELIMINATED_AFTER = { q1: [18, 19, 20, 21, 22], q2: [13, 14, 15, 16, 17] };

export default function QualifyingScreen() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const [qualifying, setQualifying] = useState(null); // full result
  const [phase, setPhase] = useState('idle'); // idle | running | done

  if (!state) return null;

  const { currentRaceIndex, playerDriverIds, playerTeamId } = state;
  const circuit = CIRCUITS[currentRaceIndex];

  function runQualifying() {
    setPhase('running');
    const allEntries = Object.entries(state.driverContracts)
      .filter(([, c]) => c.teamId !== 'free_agent')
      .map(([driverId, c]) => ({ driverId, teamId: c.teamId }));

    const carOverrides = {};
    Object.entries(state.teams).forEach(([tid, ts]) => {
      carOverrides[tid] = ts.car;
    });

    setTimeout(() => {
      const result = runFullQualifying(allEntries, circuit, carOverrides);
      setQualifying(result);
      setPhase('done');
    }, 800);
  }

  function confirmGrid() {
    dispatch({ type: 'QUALIFYING_COMPLETE', qualifyingResult: qualifying });
    // Also store as weekendData grid
    if (!state.weekendData) {
      const weekendData = prepareRaceWeekend(state, circuit, playerTeamId, qualifying);
      dispatch({ type: 'WEEKEND_DATA_SET', weekendData });
    }
    navigate('/strategy');
  }

  function renderGrid(label, results, eliminatedPositions) {
    if (!results?.length) return null;
    return (
      <div className="card mb-md">
        <div className="card-header">
          <span className="card-title">{label}</span>
          {eliminatedPositions && (
            <span className="badge badge-red">P{eliminatedPositions[0]}+ eliminated</span>
          )}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-pos">Pos</th>
              <th>Driver</th>
              <th>Team</th>
              <th className="col-time">Time</th>
              <th className="col-gap">Gap</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const driver = DRIVER_MAP[r.driverId];
              const team   = TEAM_MAP[r.teamId];
              const isPlayer = playerDriverIds.includes(r.driverId);
              const eliminated = eliminatedPositions?.includes(i + 1);
              const poleTime = results[0]?.time ?? r.time;
              const gap = i === 0 ? '' : `+${(r.time - poleTime).toFixed(3)}`;

              return (
                <tr
                  key={r.driverId}
                  className={isPlayer ? 'row-player' : ''}
                  style={{ opacity: eliminated ? 0.45 : 1 }}
                >
                  <td className="col-pos">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="team-stripe" style={{ background: team?.color, minHeight: 20 }} />
                      <span className={isPlayer ? 'text-white text-bold' : ''}>
                        {driver?.shortName ?? r.driverId}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted text-sm">{team?.shortName}</td>
                  <td className="col-time">{r.time ? formatLapTime(r.time) : 'No time'}</td>
                  <td className="col-gap">{gap}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Qualifying — {circuit?.shortName}</div>
          <div className="page-subtitle">{circuit?.name}</div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={() => navigate('/practice')}>← Practice</button>
          {phase === 'done' && (
            <button className="btn btn-primary" onClick={confirmGrid}>
              Confirm Grid →
            </button>
          )}
        </div>
      </div>

      {phase === 'idle' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: 'var(--gap-lg)', minHeight: 300 }}>
          <div className="text-muted text-center" style={{ maxWidth: 400 }}>
            Run the qualifying session to determine the grid for {circuit?.name}.
            {circuit?.overtakingDifficulty >= 85 && (
              <div className="badge badge-yellow mt-md" style={{ display: 'inline-flex' }}>
                Monaco — Qualifying is crucial!
              </div>
            )}
          </div>
          <button className="btn btn-primary btn-lg" onClick={runQualifying}>
            Run Qualifying
          </button>
        </div>
      )}

      {phase === 'running' && (
        <div className="flex-center" style={{ flexDirection: 'column', gap: 16, minHeight: 300 }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
          <div className="text-muted">Simulating qualifying…</div>
        </div>
      )}

      {phase === 'done' && qualifying && (
        <>
          {renderGrid('Q1 — Top 17 advance', qualifying.q1Results, [18, 19, 20, 21, 22])}
          {renderGrid('Q2 — Top 12 advance', qualifying.q2Results, [13, 14, 15, 16, 17])}
          {renderGrid('Q3 — Pole Position Shootout', qualifying.q3Results, null)}
        </>
      )}
    </div>
  );
}
