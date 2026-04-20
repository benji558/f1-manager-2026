// StandingsScreen — Drivers' + Constructors' championship tables
import { useState } from 'react';
import { useChampionship } from '../hooks/useChampionship.js';
import { useGame } from '../context/GameContext.jsx';
import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP } from '../data/teams.js';
import { CIRCUITS } from '../data/circuits.js';
import ChampionshipTable from '../components/ChampionshipTable.jsx';

export default function StandingsScreen() {
  const { state }        = useGame();
  const { driverStandings, constructorStandings, playerPosition } = useChampionship();
  const [activeTab, setActiveTab]  = useState('drivers');

  if (!state) return null;

  const { currentRaceIndex, raceResults } = state;
  const racesLeft = 24 - currentRaceIndex;

  // Enrich driver standings with name
  const driverRows = driverStandings.map(d => ({
    ...d,
    name: DRIVER_MAP[d.driverId]?.shortName ?? d.driverId,
  }));

  // Enrich constructor standings
  const constructorRows = constructorStandings.map(c => ({
    ...c,
    name: TEAM_MAP[c.teamId]?.shortName ?? c.teamId,
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Championship Standings</div>
          <div className="page-subtitle">
            After Race {currentRaceIndex} of 24 · {racesLeft} race{racesLeft !== 1 ? 's' : ''} remaining
          </div>
        </div>
        <div className="page-header-right">
          {playerPosition && (
            <span className="phase-tag phase-RACE">
              P{playerPosition} WCC
            </span>
          )}
        </div>
      </div>

      {/* Tab selector */}
      <div className="speed-toggle mb-lg" style={{ display: 'inline-flex' }}>
        <button
          className={`speed-btn${activeTab === 'drivers' ? ' active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          Drivers
        </button>
        <button
          className={`speed-btn${activeTab === 'constructors' ? ' active' : ''}`}
          onClick={() => setActiveTab('constructors')}
        >
          Constructors
        </button>
      </div>

      {activeTab === 'drivers' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Drivers Championship</span>
            {driverRows[0] && (
              <span className="text-muted text-sm">
                Leader: {driverRows[0].name} ({driverRows[0].points} pts)
              </span>
            )}
          </div>
          <ChampionshipTable rows={driverRows} type="driver" />
        </div>
      )}

      {activeTab === 'constructors' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Constructors Championship</span>
            {constructorRows[0] && (
              <span className="text-muted text-sm">
                Leader: {TEAM_MAP[constructorRows[0].teamId]?.shortName} ({constructorRows[0].points} pts)
              </span>
            )}
          </div>
          <ChampionshipTable rows={constructorRows} type="constructor" />
        </div>
      )}

      {/* Recent race results summary */}
      {raceResults.length > 0 && (
        <div className="card mt-lg">
          <div className="card-title mb-md">Recent Results (Last 5 Races)</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Race</th>
                  <th>Winner</th>
                  <th>Team</th>
                  <th>Fastest Lap</th>
                </tr>
              </thead>
              <tbody>
                {raceResults.slice(-5).reverse().map((r, i) => {
                  const circuitIdx = raceResults.length - 1 - i;
                  const circ = CIRCUITS[circuitIdx];
                  const winner = r.classified?.[0];
                  const wDriver = DRIVER_MAP[winner?.driverId];
                  const wTeam   = TEAM_MAP[winner?.teamId];
                  const fl      = r.fastestLap;
                  const flDriver = DRIVER_MAP[fl?.driverId];
                  return (
                    <tr key={r.circuitId ?? i}>
                      <td className="text-white">{circ?.shortName ?? r.circuitId}</td>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div className="team-dot" style={{ background: wTeam?.color }} />
                          <span>{wDriver?.shortName ?? winner?.driverId}</span>
                        </div>
                      </td>
                      <td className="text-muted text-sm">{wTeam?.shortName}</td>
                      <td className="text-sm">
                        {flDriver ? `${flDriver.shortName} L${fl.lap}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
