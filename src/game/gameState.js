// ============================================================
// GAME STATE — Central reducer and initial state
//
// All state transitions happen through this reducer.
// The UI dispatches actions; the reducer returns a new state.
// No direct mutations anywhere in the app.
// ============================================================

import { DRIVERS }  from '../data/drivers.js';
import { TEAMS }    from '../data/teams.js';
import { CIRCUITS } from '../data/circuits.js';
import { GAME_VERSION } from '../data/constants.js';
import { computeLiveCarAttributes } from './teamManager.js';
import { updateChampionshipStandings, generateInitialStandings, processEndOfSeason, getNextPhase } from './seasonManager.js';
import { calculateRDTokens, processRaceFinances, deductRaceCosts, checkUpgrade } from './teamManager.js';

// ─────────────────────────────────────────────────────────���
// INITIAL STATE
// Called once when a new game starts (team selection screen).
// ──────────────────────────────────────────────────────────

export function buildInitialState(playerTeamId, gameName = 'My Team') {
  // Build mutable team states (budget, upgrades, live car attributes)
  const teams = {};
  TEAMS.forEach(t => {
    teams[t.id] = {
      id:          t.id,
      budget:      t.finances.budget,
      sponsorIncome: t.finances.sponsorIncome,
      staffCosts:  t.finances.staffCosts,
      rdTokens:    0,
      upgrades:    { aerodynamics: 0, engine_power: 0, reliability: 0, tyre_efficiency: 0 },
      car:         { ...t.car }, // starts as base attributes; modified by upgrades
      facilityLevel: 3,
      staffMorale:   75,
    };
  });

  // Build mutable driver contracts
  const driverContracts = {};
  DRIVERS.forEach(d => {
    driverContracts[d.id] = {
      salary:        d.contract.salary,
      yearsRemaining: d.contract.yearsRemaining,
      releaseClause: d.contract.releaseClause,
      teamId:        d.teamId,
    };
  });

  // Player's two drivers
  const playerDriverIds = DRIVERS.filter(d => d.teamId === playerTeamId).map(d => d.id);

  return {
    version:           GAME_VERSION,
    saveSlot:          0,
    gameName,
    createdAt:         new Date().toISOString(),
    lastSaved:         null,

    playerTeamId,
    playerDriverIds,

    currentSeason:     2026,
    currentRaceIndex:  0,
    sessionPhase:      'MAIN_HUB',

    raceResults:       [],
    qualifyingResult:  null,
    practiceData:      { fp1: null, fp2: null, fp3: null },

    standings:         generateInitialStandings(),

    teams,
    driverContracts,

    activeRace:        null,

    raceStrategy: {
      [playerDriverIds[0]]: { startingCompound: 'MEDIUM', plannedPits: [{ onLap: 28, toCompound: 'HARD' }], fuelMode: 'STANDARD' },
      [playerDriverIds[1]]: { startingCompound: 'MEDIUM', plannedPits: [{ onLap: 30, toCompound: 'HARD' }], fuelMode: 'STANDARD' },
    },

    weekendData: null, // { grid, strategies, weather, q1Results, q2Results, q3Results }

    newsLog: [{
      id:      'welcome',
      type:    'INFO',
      message: `Welcome to F1 Manager 2026! You are managing ${TEAMS.find(t => t.id === playerTeamId)?.fullName}. Good luck!`,
      read:    false,
    }],
  };
}

// ──────────────────────────────────────────────────────────
// REDUCER
// Every action type is documented inline.
// ──────────────────────────────────────────────────────────

export function gameReducer(state, action) {
  switch (action.type) {

    // ── NEW GAME ──────────────────────────────────────────
    case 'GAME_NEW': {
      return buildInitialState(action.playerTeamId, action.gameName ?? 'My Team');
    }

    // ── LOAD SAVED GAME ───────────────────────────────────
    case 'GAME_LOAD': {
      return { ...action.savedState, activeRace: null };
    }

    // ── ADVANCE SESSION PHASE ─────────────────────────────
    // Move through: MAIN_HUB → PRACTICE → QUALIFYING → STRATEGY → RACE → RESULTS → MAIN_HUB
    case 'SEASON_ADVANCE_PHASE': {
      const nextPhase = action.nextPhase ?? getNextPhase(state.sessionPhase);
      return { ...state, sessionPhase: nextPhase };
    }

    // ── ADVANCE TO NEXT RACE ──────────────────────────────
    case 'SEASON_NEXT_RACE': {
      const nextIndex = state.currentRaceIndex + 1;
      if (nextIndex >= CIRCUITS.length) {
        // End of season — handled by SEASON_END
        return { ...state, sessionPhase: 'MAIN_HUB', currentRaceIndex: 0 };
      }
      return {
        ...state,
        currentRaceIndex: nextIndex,
        sessionPhase:     'MAIN_HUB',
        qualifyingResult: null,
        activeRace:       null,
        weekendData:      null,
        practiceData:     { fp1: null, fp2: null, fp3: null },
        raceStrategy:     buildDefaultStrategy(state.playerDriverIds),
      };
    }

    // ── END OF SEASON ─────────────────────────────────────
    case 'SEASON_END': {
      const updates = processEndOfSeason(state);
      const newLog = [...state.newsLog, ...updates.newsItems.map(n => ({ ...n, read: false }))];
      return { ...state, ...updates, newsLog: newLog };
    }

    // ── STORE WEEKEND DATA (qualifying grid + strategies) ─
    case 'WEEKEND_DATA_SET': {
      return { ...state, weekendData: action.weekendData };
    }

    // ── PRACTICE RESULTS ──────────────────────────────────
    case 'PRACTICE_COMPLETE': {
      return {
        ...state,
        practiceData: { ...state.practiceData, [action.session.toLowerCase()]: action.result },
        sessionPhase: 'PRACTICE',
      };
    }

    // ── QUALIFYING COMPLETE ───────────────────────────────
    case 'QUALIFYING_COMPLETE': {
      return {
        ...state,
        qualifyingResult: action.qualifyingResult,
        sessionPhase:     'STRATEGY',
      };
    }

    // ── RACE TICK ─────────────────────────────────────────
    // Called every simulation tick while the race is running.
    // payload: newLapState from simulateLap()
    case 'RACE_TICK': {
      return { ...state, activeRace: action.newLapState };
    }

    // ── PIT REQUEST ───────────────────────────────────────
    // Player clicks "BOX THIS LAP" for a driver.
    // The pit request is stored and picked up by the next RACE_TICK.
    case 'RACE_PIT_REQUEST': {
      // Store the pit request in raceStrategy for the next simulateLap call
      const updated = {
        ...state.raceStrategy,
        [action.driverId]: {
          ...state.raceStrategy[action.driverId],
          pitNextLap:       true,
          nextCompound:     action.compound ?? 'MEDIUM',
        },
      };
      return { ...state, raceStrategy: updated };
    }

    // ── CLEAR PIT REQUEST ─────────────────────────────────
    case 'RACE_PIT_CLEAR': {
      const updated = {
        ...state.raceStrategy,
        [action.driverId]: {
          ...state.raceStrategy[action.driverId],
          pitNextLap:   false,
          nextCompound: null,
        },
      };
      return { ...state, raceStrategy: updated };
    }

    // ── PUSH LEVEL ────────────────────────────────────────
    case 'RACE_SET_PUSH_LEVEL': {
      return {
        ...state,
        raceStrategy: {
          ...state.raceStrategy,
          [action.driverId]: {
            ...state.raceStrategy[action.driverId],
            pushLevel: action.level,
          },
        },
      };
    }

    // ── RACE COMPLETE ─────────────────────────────────────
    // Stores the final result, updates standings, processes finances.
    case 'RACE_COMPLETE': {
      const { result } = action;
      const newStandings  = updateChampionshipStandings(state.standings, result);
      const { earned, newBudget } = processRaceFinances(
        state.teams[state.playerTeamId],
        result,
        state.playerDriverIds
      );
      const raceCosts = deductRaceCosts(
        state.teams[state.playerTeamId],
        state.playerDriverIds.map(id => state.driverContracts[id])
      );
      const rdTokensEarned = calculateRDTokens(result, state.playerDriverIds);

      const updatedPlayerTeam = {
        ...state.teams[state.playerTeamId],
        budget:   Math.max(0, newBudget - raceCosts.cost),
        rdTokens: (state.teams[state.playerTeamId].rdTokens ?? 0) + rdTokensEarned,
      };

      const newsEntry = buildRaceNewsEntry(result, state.playerDriverIds, state.currentRaceIndex);

      return {
        ...state,
        raceResults:  [...state.raceResults, result],
        standings:    newStandings,
        teams:        { ...state.teams, [state.playerTeamId]: updatedPlayerTeam },
        activeRace:   null,
        sessionPhase: 'RESULTS',
        newsLog:      [...state.newsLog, newsEntry],
      };
    }

    // ── STRATEGY: SET COMPOUND ────────────────────────────
    case 'STRATEGY_SET_COMPOUND': {
      return {
        ...state,
        raceStrategy: {
          ...state.raceStrategy,
          [action.driverId]: {
            ...state.raceStrategy[action.driverId],
            startingCompound: action.compound,
          },
        },
      };
    }

    // ── STRATEGY: ADD PIT ─────────────────────────────────
    case 'STRATEGY_ADD_PIT': {
      const current = state.raceStrategy[action.driverId] ?? {};
      const pits    = [...(current.plannedPits ?? []), { onLap: action.onLap, toCompound: action.compound }]
        .sort((a, b) => a.onLap - b.onLap);
      return {
        ...state,
        raceStrategy: {
          ...state.raceStrategy,
          [action.driverId]: { ...current, plannedPits: pits },
        },
      };
    }

    // ── STRATEGY: REMOVE PIT ──────────────────────────────
    case 'STRATEGY_REMOVE_PIT': {
      const current = state.raceStrategy[action.driverId] ?? {};
      const pits    = (current.plannedPits ?? []).filter((_, i) => i !== action.pitIndex);
      return {
        ...state,
        raceStrategy: {
          ...state.raceStrategy,
          [action.driverId]: { ...current, plannedPits: pits },
        },
      };
    }

    // ── STRATEGY: SET FUEL MODE ───────────────────────────
    case 'STRATEGY_SET_FUEL_MODE': {
      return {
        ...state,
        raceStrategy: {
          ...state.raceStrategy,
          [action.driverId]: {
            ...state.raceStrategy[action.driverId],
            fuelMode: action.mode,
          },
        },
      };
    }

    // ── R&D UPGRADE ───────────────────────────────────────
    case 'UPGRADE_PURCHASE': {
      const teamState  = state.teams[action.teamId];
      const currentLvl = teamState.upgrades[action.attribute] ?? 0;
      const { canAfford, cost, newLevel, newBudget } = checkUpgrade(teamState, action.attribute);
      if (!canAfford) return state; // Ignore invalid upgrades

      const newUpgrades = { ...teamState.upgrades, [action.attribute]: newLevel };
      const newCarAttrs = computeLiveCarAttributes(action.teamId, newUpgrades);

      return {
        ...state,
        teams: {
          ...state.teams,
          [action.teamId]: {
            ...teamState,
            budget:   newBudget,
            upgrades: newUpgrades,
            car:      newCarAttrs,
          },
        },
      };
    }

    // ── SIGN DRIVER ───────────────────────────────────────
    case 'CONTRACT_SIGN': {
      return {
        ...state,
        driverContracts: {
          ...state.driverContracts,
          [action.driverId]: {
            salary:        action.salary,
            yearsRemaining: action.years,
            teamId:        action.teamId,
            releaseClause: action.salary * 1.5,
          },
        },
        // Update player driver list if signing for player team
        playerDriverIds: action.teamId === state.playerTeamId
          ? state.playerDriverIds.includes(action.driverId)
            ? state.playerDriverIds
            : [...state.playerDriverIds.slice(-1), action.driverId] // replace oldest
          : state.playerDriverIds,
      };
    }

    // ── RELEASE DRIVER ────────────────────────────────────
    case 'CONTRACT_RELEASE': {
      const contract    = state.driverContracts[action.driverId];
      const releaseCost = contract?.releaseClause ?? 0;
      const teamId      = contract?.teamId;
      return {
        ...state,
        driverContracts: {
          ...state.driverContracts,
          [action.driverId]: { ...contract, teamId: 'free_agent', yearsRemaining: 0 },
        },
        teams: teamId && state.teams[teamId] ? {
          ...state.teams,
          [teamId]: {
            ...state.teams[teamId],
            budget: Math.max(0, state.teams[teamId].budget - releaseCost),
          },
        } : state.teams,
        playerDriverIds: state.playerDriverIds.filter(id => id !== action.driverId),
      };
    }

    // ── MARK NEWS AS READ ─────────────────────────────────
    case 'NEWS_MARK_READ': {
      return {
        ...state,
        newsLog: state.newsLog.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };
    }

    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function buildDefaultStrategy(driverIds) {
  const strategy = {};
  driverIds.forEach(id => {
    strategy[id] = { startingCompound: 'MEDIUM', plannedPits: [{ onLap: 28, toCompound: 'HARD' }], fuelMode: 'STANDARD', pushLevel: 0.5 };
  });
  return strategy;
}

function buildRaceNewsEntry(result, playerDriverIds, raceIndex) {
  const circuit = CIRCUITS[raceIndex];
  const playerResults = result.classified.filter(e => playerDriverIds.includes(e.driverId));
  const best = playerResults.reduce((a, b) => a.position < b.position ? a : b, playerResults[0]);
  const msg = best
    ? `${circuit?.shortName ?? 'Race'} complete — P${best.position} for ${DRIVERS.find(d => d.id === best.driverId)?.shortName}! (+${best.points} pts)`
    : `${circuit?.shortName ?? 'Race'} complete`;
  return {
    id:   `race_${raceIndex}_result`,
    type: 'RACE_RESULT',
    message: msg,
    read: false,
  };
}
