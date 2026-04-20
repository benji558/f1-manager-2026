// ResultsScreen — Post-race: classified results, points, events log, championship delta
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { CIRCUITS } from '../data/circuits.js';
import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP } from '../data/teams.js';
import { formatLapTime } from '../engine/engineUtils.js';
import TyreDisplay from '../components/TyreDisplay.jsx';

const TROPHIES = { 1: '🥇', 2: '🥈', 3: '🥉' };

function fmtTime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(6, '0')}`;
  return `${m}:${String(s).padStart(6, '0')}`;
}

export default function ResultsScreen() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  if (!state) return null;

  const { raceResults, currentRaceIndex, playerDriverIds, playerTeamId } = state;
  const result  = raceResults[raceResults.length - 1];
  const circuit = CIRCUITS[currentRaceIndex];
  const isLastRace = currentRaceIndex >= 23;

  if (!result) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🏁</div>
          <div className="empty-state-title">No race result yet</div>
          <button className="btn btn-primary" onClick={() => navigate('/race')}>Go to Race</button>
        </div>
      </div>
    );
  }

  const classified   = result.classified ?? [];
  const retirements  = result.retirements ?? [];
  const fastestLap   = result.fastestLap;
  const playerResults = classified.filter(e => playerDriverIds.includes(e.driverId));
  const winnerEntry   = classified[0];
  const winnerDriver  = DRIVER_MAP[winnerEntry?.driverId];

  function handleContinue() {
    if (isLastRace) {
      dispatch({ type: 'SEASON_END' });
    } else {
      dispatch({ type: 'SEASON_NEXT_RACE' });
    }
    navigate('/hub');
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Race Result — {circuit?.shortName}</div>
          <div className="page-subtitle">{circuit?.name}</div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={handleContinue}>
            {isLastRace ? 'Season Complete →' : 'Next Race →'}
          </button>
        </div>
      </div>

      {/* Winner podium */}
      <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(232,0,45,0.08) 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>🏆</div>
          <div className="text-2xl text-bold text-white mt-sm">
            {winnerDriver?.name ?? winnerEntry?.driverId}
          </div>
          <div className="text-muted">
            {TEAM_MAP[winnerEntry?.teamId]?.shortName} · {fmtTime(winnerEntry?.totalTime)}
          </div>
          {fastestLap && (
            <div className="badge badge-purple mt-sm" style={{ display: 'inline-flex' }}>
              ⚡ Fastest: {DRIVER_MAP[fastestLap.driverId]?.shortName} — {formatLapTime(fastestLap.time)} (L{fastestLap.lap})
            </div>
          )}
        </div>

        {/* Player summary */}
        {playerResults.length > 0 && (
          <div className="flex-center gap-lg mt-lg" style={{ flexWrap: 'wrap' }}>
            {playerResults.map(pr => {
              const d = DRIVER_MAP[pr.driverId];
              return (
                <div key={pr.driverId} className="panel text-center" style={{ minWidth: 160 }}>
                  <div className="text-muted text-xs mb-xs">{d?.shortName}</div>
                  <div className="text-2xl text-bold text-white">
                    {TROPHIES[pr.position] ?? `P${pr.position}`}
                  </div>
                  <div className="text-yellow text-bold">+{pr.points} pts</div>
                  <div className="text-xs text-muted mt-xs">
                    {pr.pitStops} stop{pr.pitStops !== 1 ? 's' : ''}
                    {pr.fastestLap && ' · FL ⚡'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full classification table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Race Classification</span>
          <span className="text-muted text-sm">{circuit?.laps} laps · {result.weather}</span>
        </div>
        <div className="standings-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-pos">Pos</th>
                <th>Driver</th>
                <th>Team</th>
                <th className="col-time">Time</th>
                <th className="col-gap">Gap</th>
                <th style={{ width: 50 }}>Pts</th>
                <th style={{ width: 40 }}>Pits</th>
              </tr>
            </thead>
            <tbody>
              {classified.map((entry, i) => {
                const driver    = DRIVER_MAP[entry.driverId];
                const team      = TEAM_MAP[entry.teamId];
                const isPlayer  = playerDriverIds.includes(entry.driverId);
                const leaderTime = classified[0]?.totalTime ?? 0;
                const gap = i === 0
                  ? '—'
                  : entry.status !== 'FINISHED'
                    ? entry.status
                    : `+${(entry.totalTime - leaderTime).toFixed(3)}`;

                return (
                  <tr key={entry.driverId} className={isPlayer ? 'row-player' : ''}>
                    <td className="col-pos">
                      {entry.status !== 'FINISHED' ? <span style={{ color: 'var(--red)' }}>DNF</span> : entry.position}
                    </td>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="team-stripe" style={{ background: team?.color, minHeight: 20 }} />
                        <span className={isPlayer ? 'text-white text-bold' : ''}>
                          {driver?.shortName ?? entry.driverId}
                          {entry.fastestLap && ' ⚡'}
                        </span>
                      </div>
                    </td>
                    <td className="text-muted text-sm">{team?.shortName}</td>
                    <td className="col-time">{i === 0 ? fmtTime(entry.totalTime) : '—'}</td>
                    <td className="col-gap">{gap}</td>
                    <td className="text-bold text-white">{entry.points || ''}</td>
                    <td className="text-muted text-sm">{entry.pitStops}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retirements */}
      {retirements.length > 0 && (
        <div className="card mt-lg">
          <div className="card-title mb-md">Retirements</div>
          <div className="grid-3">
            {retirements.map(r => (
              <div key={r.driverId} className="panel flex-between">
                <span className="text-sm">{DRIVER_MAP[r.driverId]?.shortName ?? r.driverId}</span>
                <div>
                  <span className="badge badge-red">{r.reason}</span>
                  <span className="text-xs text-muted ml-sm">L{r.lap}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
