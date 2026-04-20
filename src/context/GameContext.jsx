// ============================================================
// GAME CONTEXT — React context wrapping the entire app
//
// Two contexts:
//   GameContext   — full persistent game state (season, teams, standings, etc.)
//                   updates on meaningful events (race complete, purchases, etc.)
//   RaceContext   — live race lap state (updates every tick during a race)
//                   ONLY subscribed to by RaceScreen and its children to prevent
//                   full-app re-render every 400ms
// ============================================================

import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { gameReducer, buildInitialState } from '../game/gameState.js';
import { loadFromLocalStorage, saveToLocalStorage } from '../game/saveManager.js';

// ── Game Context ──────────────────────────────────────────
export const GameContext = createContext(null);

/**
 * Load the initial state:
 * 1. Try loading from localStorage slot 0
 * 2. If no save exists, return null (show team-selection screen)
 */
function loadInitialState() {
  return loadFromLocalStorage(0) ?? null;
}

/**
 * GameProvider wraps the entire app. Exposes { state, dispatch }.
 * Auto-saves to localStorage after every state change (debounced).
 */
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, null, loadInitialState);

  // Auto-save: debounced 2 seconds after state change
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => {
      saveToLocalStorage(state, state.saveSlot ?? 0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

// ── Race Context ──────────────────────────────────────────
// Separate context so only race-screen components re-render on each tick

export const RaceContext = createContext(null);

export function RaceProvider({ children }) {
  const [raceState, setRaceState] = useState(null);
  const [simSpeed, setSimSpeed]   = useState(1500); // ms per lap
  const [isPaused, setIsPaused]   = useState(true);
  const [playerPitRequest, setPlayerPitRequest] = useState({}); // { driverId: compound }
  const [playerPushLevels, setPlayerPushLevels] = useState({});

  const updateRaceState = useCallback((newState) => {
    setRaceState(newState);
  }, []);

  const requestPit = useCallback((driverId, compound = 'MEDIUM') => {
    setPlayerPitRequest(prev => ({ ...prev, [driverId]: compound }));
  }, []);

  const clearPitRequest = useCallback((driverId) => {
    setPlayerPitRequest(prev => {
      const next = { ...prev };
      delete next[driverId];
      return next;
    });
  }, []);

  const setPushLevel = useCallback((driverId, level) => {
    setPlayerPushLevels(prev => ({ ...prev, [driverId]: level }));
  }, []);

  return (
    <RaceContext.Provider value={{
      raceState, updateRaceState,
      simSpeed, setSimSpeed,
      isPaused, setIsPaused,
      playerPitRequest, requestPit, clearPitRequest,
      playerPushLevels, setPushLevel,
    }}>
      {children}
    </RaceContext.Provider>
  );
}

// ── Convenience hooks ─────────────────────────────────────
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function useRaceContext() {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error('useRaceContext must be used within RaceProvider');
  return ctx;
}
