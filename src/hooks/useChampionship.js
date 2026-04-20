import { useGame } from '../context/GameContext.jsx';
import { TEAM_MAP } from '../data/teams.js';

export function useChampionship() {
  const { state } = useGame();
  if (!state) return { driverStandings: [], constructorStandings: [], playerPosition: null };

  const { standings, playerTeamId, playerDriverIds } = state;

  const driverStandings = standings.drivers.map((d, i) => ({
    ...d,
    rank: i + 1,
    isPlayer: playerDriverIds.includes(d.driverId),
    teamColor: TEAM_MAP[d.teamId]?.color ?? '#888',
  }));

  const constructorStandings = standings.constructors.map((c, i) => ({
    ...c,
    rank: i + 1,
    isPlayer: c.teamId === playerTeamId,
    color: TEAM_MAP[c.teamId]?.color ?? '#888',
  }));

  const playerConstructorPos = constructorStandings.find(c => c.teamId === playerTeamId)?.rank ?? null;

  return { driverStandings, constructorStandings, playerPosition: playerConstructorPos };
}
