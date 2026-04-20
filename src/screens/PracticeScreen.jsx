// PracticeScreen — FP1/FP2/FP3 management: run sessions, see driver feedback
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { CIRCUITS } from '../data/circuits.js';
import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP } from '../data/teams.js';
import { simulatePracticeSession } from '../engine/practiceEngine.js';
import { formatLapTime } from '../engine/engineUtils.js';

const SESSIONS = ['fp1', 'fp2', 'fp3'];
const SESSION_LABELS = { fp1: 'FP1', fp2: 'FP2', fp3: 'FP3' };

export default function PracticeScreen() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const [runningSession, setRunningSession] = useState(null);

  if (!state) return null;

  const { currentRaceIndex, playerTeamId, playerDriverIds, practiceData } = state;
  const circuit = CIRCUITS[currentRaceIndex];
  const team    = TEAM_MAP[playerTeamId];
  const teamState = state.teams[playerTeamId];

  function runSession(session) {
    setRunningSession(session);
    // Gather all entries
    const allDriverEntries = Object.values(state.driverContracts).map(c => ({
      driverId: c.teamId !== 'free_agent' ? Object.keys(state.driverContracts).find(id => state.driverContracts[id] === c) : null,
      teamId:   c.teamId,
    })).filter(e => e.driverId);

    const carOverrides = {};
    Object.entries(state.teams).forEach(([tid, ts]) => {
      carOverrides[tid] = ts.car;
    });

    setTimeout(() => {
      const result = simulatePracticeSession(session.toUpperCase(), allDriverEntries, circuit, carOverrides);
      dispatch({ type: 'PRACTICE_COMPLETE', session, result });
      setRunningSession(null);
    }, 600);
  }

  function goToQualifying() {
    dispatch({ type: 'SEASON_ADVANCE_PHASE', nextPhase: 'QUALIFYING' });
    navigate('/qualifying');
  }

  const sessionsDone = SESSIONS.filter(s => practiceData?.[s] !== null && practiceData?.[s] !== undefined);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Practice — {circuit?.shortName}</div>
          <div className="page-subtitle">{circuit?.name} · Round {currentRaceIndex + 1}</div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={() => navigate('/hub')}>Hub</button>
          <button className="btn btn-primary" onClick={goToQualifying}>
            Qualifying →
          </button>
        </div>
      </div>

      {/* Session buttons */}
      <div className="grid-3 mb-lg">
        {SESSIONS.map(session => {
          const done   = practiceData?.[session] != null;
          const result = practiceData?.[session];
          const running = runningSession === session;

          return (
            <div key={session} className="card">
              <div className="card-header">
                <span className="card-title">{SESSION_LABELS[session]}</span>
                {done && <span className="badge badge-green">Done</span>}
              </div>

              {!done && (
                <button
                  className="btn btn-primary w-full"
                  disabled={!!running}
                  onClick={() => runSession(session)}
                >
                  {running ? <span className="spinner" /> : `Run ${SESSION_LABELS[session]}`}
                </button>
              )}

              {done && result?.times && (
                <div>
                  {Object.entries(result.times).slice(0, 10).map(([driverId, time], i) => {
                    const d = DRIVER_MAP[driverId];
                    const isPlayer = playerDriverIds.includes(driverId);
                    return (
                      <div key={driverId} className="flex-between text-sm mb-xs"
                        style={{ color: isPlayer ? 'var(--text-white)' : 'var(--text-secondary)' }}
                      >
                        <span>{i + 1}. {d?.shortName ?? driverId}</span>
                        <span className="monospace-data">{formatLapTime(time)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Driver feedback */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Driver Feedback</span>
        </div>
        {sessionsDone.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏎️</div>
            <div className="empty-state-title">Run a session to get feedback</div>
            <div className="empty-state-body">
              Practice sessions help you understand tyre deg, car balance, and race pace.
            </div>
          </div>
        ) : (
          <div className="grid-2">
            {playerDriverIds.map(driverId => {
              const driver = DRIVER_MAP[driverId];
              const lastSession = sessionsDone[sessionsDone.length - 1];
              const feedback = practiceData[lastSession]?.feedback?.[driverId];

              return (
                <div key={driverId} className="panel">
                  <div className="text-white text-bold mb-sm">{driver?.name}</div>
                  {feedback ? (
                    <>
                      {feedback.tyreWear && (
                        <div className="text-sm text-secondary mb-xs">
                          Tyre wear: <span className="text-yellow">{feedback.tyreWear}</span>
                        </div>
                      )}
                      {feedback.balance && (
                        <div className="text-sm text-secondary mb-xs">
                          Balance: <span className="text-blue">{feedback.balance}</span>
                        </div>
                      )}
                      {feedback.note && (
                        <div className="text-sm text-muted mt-sm" style={{ fontStyle: 'italic' }}>
                          "{feedback.note}"
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted text-sm">No data yet</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
