"use client";

import { useCallback, useState } from "react";

/**
 * Undo/redo over a whole snapshot of editor state.
 *
 * An editor without undo is not an editor — every action feels risky, so people
 * stop exploring. Snapshotting the entire state rather than inverting each
 * action keeps that guarantee total and cheap to reason about: a CV is a few
 * hundred small objects, and correctness matters far more than the memory.
 *
 * Stack and cursor live in one state object so they can never disagree about
 * which entry is current.
 */
interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

const LIMIT = 100;

/** Accepts either a value or an updater, like React's own setters. */
function resolve<T>(next: T | ((current: T) => T), current: T): T {
  return typeof next === "function" ? (next as (c: T) => T)(current) : next;
}

export function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  });

  /** Records a new undo step. */
  const commit = useCallback((next: T | ((current: T) => T)) => {
    setHistory((h) => {
      const value = resolve(next, h.present);
      if (Object.is(value, h.present)) return h;
      const past = [...h.past, h.present];
      return {
        past: past.length > LIMIT ? past.slice(past.length - LIMIT) : past,
        present: value,
        // Any new action abandons the redo branch, as everywhere else.
        future: [],
      };
    });
  }, []);

  /**
   * Replaces the current step instead of adding one. Continuous gestures need
   * this: a drag or a run of keystrokes should be a single undo, not one per
   * pixel or character.
   */
  const amend = useCallback((next: T | ((current: T) => T)) => {
    setHistory((h) => ({ ...h, present: resolve(next, h.present) }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      return {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] });
  }, []);

  return {
    state: history.present,
    commit,
    amend,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
