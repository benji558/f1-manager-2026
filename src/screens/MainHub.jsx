// MainHub — Season dashboard: next race, standings summary, finance, news
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { useChampionship } from '../hooks/useChampionship.js';
import { CIRCUITS } from '../data/circuits.js';
import { TEAM_MAP } from '../data/teams.js';
import { DRIVER_MAP } from '../data/drivers.js';
import FinancePanel from '../components/FinancePanel.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import { prepareRaceWeekend } from '../game/seasonManager.js';

function fmtM(v) { return '$' + (v / 1e6).toFixed(0) + 'M'; }

export default function MainHub() {
  const { state, dispatch } = useGame();
  const { driverStandings, constructorStandings, playerPosition } = useChampionship();
  const navigate = useNavigate();

  if (!state) return null;

  const { currentRaceIndex, sessionPhase, playerTeamId, playerDriverIds, newsLog } = state;
  const circuit     = CIRCUITS[currentRaceIndex];
  const team        = TEAM_MAP[playerTeamId];
  const teamState   = state.teams[playerTeamId];
  const unread      = newsLog?.filter(n => !n.read) ?? [];
  const isLastRace  = currentRaceIndex >= 23;

  // Resume to current phase
  function handleGotoWeekend() {
    if (sessionPhase === 'RESULTS') { navigate('/results'); return; }
    if (sessionPhase === 'RACE')    { navigate('/race');    return; }
    if (sessionPhase === 'STRATEGY'){ navigate('/strategy');return; }
    if (sessionPhase === 'QUALIFYING'){ navigate('/qualifying'); return; }
    if (sessionPhase === 'PRACTICE'){  navigate('/practice');    return; }
    // Start the weekend: prepare weekend data then go to practice
    const weekendData = prepareRaceWeekend(state, circuit, state.playerTeamId);
    dispatch({ type: 'WEEKEND_DATA_SET', weekendData });
    dispatch({ type: 'SEASON_ADVANCE_PHASE', nextPhase: 'PRACTICE' });
    navigate('/practice');
  }

  function handleNextRace() {
    dispatch({ type: 'SEASON_NEXT_RACE' });
  }

  const top3Drivers = driverStandings.slice(0, 3);
  const top3Constructors = constructorStandings.slice(0, 3);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">
            <span style={{ color: team?.color }}>{team?.shortName}</span> HQ
          </div>
          <div className="page-subtitle">
            2026 Season · Race {currentRaceIndex + 1}/24
            {playerPosition && ` · P${playerPosition} in WCC`}
          </div>
        </div>
        <div className="page-header-right">
          {sessionPhase === 'RESULTS' && (
            <button className="btn btn-secondary" onClick={handleNextRace}>
              Next Race →
            </button>
          )}
          <button className="btn btn-primary" onClick={handleGotoWeekend}>
            {sessionPhase === 'MAIN_HUB' ? '▶ Start Weekend' : `Resume ${sessionPhase}`}
          </button>
        </div>
      </div>

      <div className="grid-3">
        {/* Next race card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Next Race</span>
            <span className="badge badge-red">Race {currentRaceIndex + 1}</span>
          </div>
          <div className="text-2xl text-bold text-white mb-sm">
            {circuit?.name ?? 'Unknown'}
          </div>
          <div className="text-muted text-sm mb-md">
            {circuit?.city}, {circuit?.country} · {circuit?.date}
          </div>
          <div className="grid-2" style={{ gap: 8 }}>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="text-bold text-white">{circuit?.laps}</div>
              <div className="text-xs text-muted">Laps</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="text-bold text-white">{circuit?.drsZones}</div>
              <div className="text-xs text-muted">DRS Zones</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="text-bold text-white">{circuit?.weatherRisk}%</div>
              <div className="text-xs text-muted">Rain Risk</div>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="text-bold text-white">{circuit?.tyreWear}</div>
              <div className="text-xs text-muted">Tyre Wear</div>
            </div>
          </div>
          {circuit?.streetCircuit && (
            <div className="badge badge-yellow mt-md">Street Circuit</div>
          )}
        </div>

        {/* Standings summary */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Championship</span>
          </div>

          <div className="section-title mb-sm">Drivers</div>
          {top3Drivers.map((d, i) => {
            const driver = DRIVER_MAP[d.driverId];
            return (
              <div key={d.driverId} className="flex-between mb-sm">
                <div className="flex items-center gap-sm">
                  <span className="text-muted text-sm">P{d.rank}</span>
                  <div className="team-dot" style={{ background: d.teamColor }} />
                  <span className={`text-sm${d.isPlayer ? ' text-white text-bold' : ''}`}>
                    {driver?.shortName ?? d.driverId}
                  </span>
                  {d.isPlayer && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>YOU</span>}
                </div>
                <span className="text-bold text-white">{d.points}</span>
              </div>
            );
          })}

          <div className="divider" />
          <div className="section-title mb-sm mt-md">Constructors</div>
          {top3Constructors.map((c, i) => (
            <div key={c.teamId} className="flex-between mb-sm">
              <div className="flex items-center gap-sm">
                <span className="text-muted text-sm">P{c.rank}</span>
                <div className="team-dot" style={{ background: c.color }} />
                <span className={`text-sm${c.isPlayer ? ' text-white text-bold' : ''}`}>
                  {TEAM_MAP[c.teamId]?.shortName ?? c.teamId}
                </span>
                {c.isPlayer && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>YOU</span>}
              </div>
              <span className="text-bold text-white">{c.points}</span>
            </div>
          ))}
        </div>

        {/* Finance + news */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
          <FinancePanel
            teamState={teamState}
            driverContracts={state.driverContracts}
            playerDriverIds={playerDriverIds}
          />

          <div className="card">
            <div className="card-header">
              <span className="card-title">News</span>
              {unread.length > 0 && (
                <span className="badge badge-red">{unread.length} new</span>
              )}
            </div>
            {unread.length === 0 && state.newsLog.length === 0 && (
              <div className="text-muted text-sm">No news yet</div>
            )}
            {(unread.length > 0 ? unread : state.newsLog).slice(0, 4).map(n => (
              <div key={n.id} className="text-sm mb-sm" style={{ paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                <span className={n.read ? 'text-secondary' : 'text-primary'}>{n.message}</span>
              </div>
            ))}
          </div>

          {/* Quick nav */}
          <div className="card">
            <div className="card-title mb-md">Quick Navigation</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/rd')}>🔬 R&amp;D</button>
              <button className="btn btn-secondary" onClick={() => navigate('/drivers')}>🏎️ Drivers</button>
              <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>📅 Calendar</button>
              <button className="btn btn-secondary" onClick={() => navigate('/standings')}>🏆 Standings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
