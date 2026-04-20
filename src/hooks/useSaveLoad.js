import { useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { loadFromLocalStorage, saveToLocalStorage, listSaveSlots, deleteSave } from '../game/saveManager.js';

export function useSaveLoad() {
  const { state, dispatch } = useGame();

  const saveNow = useCallback((slot = 0) => {
    if (state) saveToLocalStorage(state, slot);
  }, [state]);

  const loadSave = useCallback((slot = 0) => {
    const saved = loadFromLocalStorage(slot);
    if (saved) dispatch({ type: 'GAME_LOAD', savedState: saved });
    return !!saved;
  }, [dispatch]);

  const deleteSaveSlot = useCallback((slot) => {
    deleteSave(slot);
  }, []);

  return { saveNow, loadSave, deleteSaveSlot, listSaveSlots };
}
