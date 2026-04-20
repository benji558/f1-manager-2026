// ============================================================
// SAVE MANAGER — localStorage persistence (3 save slots)
// ============================================================

import { GAME_VERSION, SAVE_KEY_PREFIX, SAVE_SLOT_COUNT } from '../data/constants.js';

/**
 * Serialize and save the current game state to a localStorage slot.
 * @param {Object} state - full game state from useReducer
 * @param {number} slot - 0, 1, or 2
 */
export function saveToLocalStorage(state, slot = 0) {
  try {
    const payload = JSON.stringify({
      ...state,
      version: GAME_VERSION,
      lastSaved: new Date().toISOString(),
      // Don't persist the active race lap-by-lap state to save space
      activeRace: null,
    });
    localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, payload);
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

/**
 * Load game state from a localStorage slot.
 * @param {number} slot
 * @returns {Object|null} parsed state, or null if no save found
 */
export function loadFromLocalStorage(slot = 0) {
  try {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

/**
 * Return metadata for all save slots (for the save/load menu).
 * @returns {Array} array of { slot, empty, gameName, lastSaved, ... }
 */
export function listSaveSlots() {
  const slots = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`);
      if (!raw) {
        slots.push({ slot: i, empty: true });
      } else {
        const { gameName, lastSaved, currentSeason, currentRaceIndex, playerTeamId } = JSON.parse(raw);
        slots.push({ slot: i, empty: false, gameName, lastSaved, currentSeason, currentRaceIndex, playerTeamId });
      }
    } catch {
      slots.push({ slot: i, empty: true });
    }
  }
  return slots;
}

/**
 * Delete a save slot.
 * @param {number} slot
 */
export function deleteSave(slot = 0) {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
}

/**
 * Handle schema migrations if game version has changed.
 * Add migration logic here as the game evolves.
 */
function migrate(state) {
  if (!state.version || state.version === GAME_VERSION) return state;
  // Future migrations: if (state.version === '0.9.0') { ... }
  return state;
}

/**
 * Check if any save exists.
 * @returns {boolean}
 */
export function hasSaveGame() {
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    if (localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`)) return true;
  }
  return false;
}
