// ============================================================
// useGameState — Convenience hook for consuming game context
// ============================================================
import { useGame } from '../context/GameContext.jsx';
import { DRIVER_MAP }  from '../data/drivers.js';
import { TEAM_MAP }    from '../data/teams.js';
import { CIRCUITS }    from '../data/circuits.js';

export function useGameState() {
  return useGame();
}

/** Returns the current circuit object */
export function useCurrentCircuit() {
  const { state } = useGame();
  return CIRCUITS[state?.currentRaceIndex ?? 0] ?? null;
}

/** Returns the player's team data (static + live state merged) */
export function usePlayerTeam() {
  const { state } = useGame();
  if (!state) return null;
  const base = TEAM_MAP[state.playerTeamId];
  const live = state.teams[state.playerTeamId];
  return base && live ? { ...base, ...live } : null;
}

/** Returns the player's driver objects */
export function usePlayerDrivers() {
  const { state } = useGame();
  if (!state) return [];
  return state.playerDriverIds.map(id => DRIVER_MAP[id]).filter(Boolean);
}
