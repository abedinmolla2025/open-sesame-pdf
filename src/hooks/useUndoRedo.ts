import { useState, useCallback, useRef } from "react";

interface HistoryEntry<T> {
  state: T;
  label: string;
}

export const useUndoRedo = <T>(initialState: T) => {
  const [history, setHistory] = useState<HistoryEntry<T>[]>([{ state: initialState, label: "Initial" }]);
  const [pointer, setPointer] = useState(0);
  const isUndoingRef = useRef(false);

  const current = history[pointer]?.state ?? initialState;

  const pushState = useCallback((state: T, label: string = "Edit") => {
    if (isUndoingRef.current) return;
    setHistory(prev => {
      const newHistory = prev.slice(0, pointer + 1);
      newHistory.push({ state, label });
      // Keep max 50 entries
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setPointer(prev => Math.min(prev + 1, 50));
  }, [pointer]);

  const undo = useCallback(() => {
    if (pointer <= 0) return null;
    isUndoingRef.current = true;
    const newPointer = pointer - 1;
    setPointer(newPointer);
    const state = history[newPointer]?.state ?? initialState;
    setTimeout(() => { isUndoingRef.current = false; }, 0);
    return state;
  }, [pointer, history, initialState]);

  const redo = useCallback(() => {
    if (pointer >= history.length - 1) return null;
    isUndoingRef.current = true;
    const newPointer = pointer + 1;
    setPointer(newPointer);
    const state = history[newPointer]?.state ?? initialState;
    setTimeout(() => { isUndoingRef.current = false; }, 0);
    return state;
  }, [pointer, history, initialState]);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  const reset = useCallback(() => {
    setHistory([{ state: initialState, label: "Initial" }]);
    setPointer(0);
  }, [initialState]);

  return { current, pushState, undo, redo, canUndo, canRedo, reset };
};
