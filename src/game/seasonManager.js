// ============================================================
// SEASON MANAGER — Calendar progression, championship, end-of-season
// ============================================================

import { CIRCUITS }     from '../data/circuits.js';
import { DRIVERS }      from '../data/drivers.js';
import { TEAMS }        from '../data/teams.js';
import { POINTS_TABLE, FASTEST_LAP_POINT } from '../data/constants.js';
import { generateAIStrategy } from '../engine/aiStrategy.js';
import { runFullQualifying }  from '../engine/qualifyingEngine.js';
import { generateRaceWeather } from '../engine/weatherEngine.js';

/**
 * Get the circuit for the current race index.
 */
export function getCurrentCircuit(raceIndex) {
  return CIRCUITS[raceIndex] ?? null;
}

/**
 * Update the Drivers' and Constructors' Championship standings
 * with the points awarded from a finished race.
 *
 * @param {Object} standings - current { drivers: [], constructors: [] }
 * @param {Object} raceResult - FinalRaceResult from computeFinalResult()
 * @returns {Object} updated standings
 */
export function updateChampionshipStandings(standings, raceResult) {
  const newDrivers     = standings.drivers.map(d => ({ ...d }));
  const newConstructors = standings.constructors.map(c => ({ ...c }));

  for (const entry of raceResult.classified) {
    // Update driver standings
    const dStanding = newDrivers.find(d => d.driverId === entry.driverId);
    if (dStanding) {
      dStanding.points     += entry.points;
      dStanding.wins       += entry.position === 1 ? 1 : 0;
      dStanding.podiums    += entry.position <= 3 ? 1 : 0;
      dStanding.fastestLaps += entry.fastestLap ? 1 : 0;
    }

    // Update constructor standings
    const cStanding = newConstructors.find(c => c.teamId === entry.teamId);
    if (cStanding) {
      cStanding.points += entry.points;
      cStanding.wins   += entry.position === 1 ? 1 : 0;
    }
  }

  // Sort by points descending
  newDrivers.sort((a, b) => b.points - a.points || b.wins - a.wins);
  newConstructors.sort((a, b) => b.points - a.points || b.wins - a.wins);

  return { drivers: newDrivers, constructors: newConstructors };
}

/**
 * Generate the initial standings structure for a new season.
 * All drivers start at 0 points.
 */
export function generateInitialStandings() {
  return {
    drivers: DRIVERS.map(d => ({
      driverId:   d.id,
      driverName: d.name,
      shortName:  d.shortName,
      teamId:     d.teamId,
      points:     0,
      wins:       0,
      podiums:    0,
      fastestLaps: 0,
    })),
    constructors: TEAMS.map(t => ({
      teamId:    t.id,
      teamName:  t.shortName,
      color:     t.color,
      points:    0,
      wins:      0,
    })),
  };
}

/**
 * Generate all qualifying grids and race strategies for AI teams.
 * This is called before each race weekend.
 *
 * @param {number} raceIndex
 * @param {Object} gameTeams - live team states from gameState (with upgrades applied)
 * @returns {{ grid, strategies, weather, q1Results, q2Results, q3Results }}
 */
export function prepareRaceWeekend(raceIndex, gameTeams) {
  const circuit = CIRCUITS[raceIndex];
  if (!circuit) return null;

  // Build car override map from live team attributes
  const carOverridesMap = {};
  Object.entries(gameTeams).forEach(([teamId, team]) => {
    if (team.car) carOverridesMap[teamId] = team.car;
  });

  // All driver entries for qualifying
  const allEntries = DRIVERS.map(d => ({ driverId: d.id, teamId: d.teamId }));

  // Run qualifying simulation
  const { grid, q1Results, q2Results, q3Results } = runFullQualifying(allEntries, circuit, carOverridesMap);

  // Generate weather
  const weather = generateRaceWeather(circuit, circuit.laps);

  // Generate AI strategies for all 22 drivers
  const strategies = {};
  grid.forEach(entry => {
    strategies[entry.driverId] = generateAIStrategy(entry.driverId, circuit, entry.gridPosition);
  });

  return { grid, strategies, weather, q1Results, q2Results, q3Results };
}

/**
 * Process end-of-season: award constructor prize money, handle contract expiries,
 * reset season-specific stats, increment season counter.
 *
 * @param {Object} gameState
 * @returns {Object} partial state updates to apply via reducer
 */
export function processEndOfSeason(gameState) {
  const { standings, teams, driverContracts, currentSeason } = gameState;

  // Award constructor championship prize money
  const constructorsOrder = standings.constructors;
  const updatedTeams = { ...teams };
  constructorsOrder.forEach((entry, idx) => {
    if (updatedTeams[entry.teamId]) {
      const { CONSTRUCTOR_PRIZE_MONEY } = { CONSTRUCTOR_PRIZE_MONEY: [200e6,175e6,155e6,140e6,128e6,118e6,108e6,98e6,88e6,78e6,68e6] };
      const prize = CONSTRUCTOR_PRIZE_MONEY[idx] ?? 0;
      updatedTeams[entry.teamId] = {
        ...updatedTeams[entry.teamId],
        budget: updatedTeams[entry.teamId].budget + prize,
      };
    }
  });

  // Decrement driver contract years
  const updatedContracts = {};
  Object.entries(driverContracts).forEach(([driverId, contract]) => {
    updatedContracts[driverId] = {
      ...contract,
      yearsRemaining: Math.max(0, contract.yearsRemaining - 1),
    };
  });

  // Generate news items about expiring contracts
  const expiringContracts = Object.entries(updatedContracts)
    .filter(([, c]) => c.yearsRemaining === 0)
    .map(([driverId]) => driverId);

  const newsItems = expiringContracts.map(driverId => ({
    id: `contract_expired_${driverId}_${currentSeason}`,
    type: 'CONTRACT_EXPIRED',
    message: `${DRIVERS.find(d => d.id === driverId)?.name}'s contract has expired — negotiate a new deal`,
    read: false,
    season: currentSeason,
  }));

  return {
    teams: updatedTeams,
    driverContracts: updatedContracts,
    currentSeason: currentSeason + 1,
    currentRaceIndex: 0,
    raceResults: [],
    sessionPhase: 'MAIN_HUB',
    newsItems,
    standings: generateInitialStandings(),
  };
}

/**
 * Determine what session phase should come next in the weekend flow.
 * MAIN_HUB → PRACTICE → QUALIFYING → STRATEGY → RACE → RESULTS → MAIN_HUB
 */
export function getNextPhase(currentPhase) {
  const flow = ['MAIN_HUB', 'PRACTICE', 'QUALIFYING', 'STRATEGY', 'RACE', 'RESULTS'];
  const idx  = flow.indexOf(currentPhase);
  return idx === -1 || idx === flow.length - 1 ? 'MAIN_HUB' : flow[idx + 1];
}
