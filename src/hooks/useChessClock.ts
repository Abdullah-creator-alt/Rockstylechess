import { useEffect, useRef, useState } from 'react';

export interface ClockTimes {
  w: number;
  b: number;
}

interface UseChessClockOptions {
  turn: 'w' | 'b';
  isGameOver: boolean;
  /** Starting time per side, ms. Equal for both sides for a fresh match (5 minutes for
   * bot/local, server-provided for online) -- but NOT necessarily equal after a rejoin
   * mid-game, where each side has already burned a different amount of their clock, so
   * this takes a value per side rather than one shared number. */
  initialMs: ClockTimes;
  /** Credited to a side the instant they move. Always 0 today (no picker exposes a nonzero
   * value yet) -- kept as a real parameter end-to-end so turning it on later is a picker-only
   * change, not an engine change. */
  incrementMs?: number;
  /** Fires exactly once, the instant a side's clock reaches 0. */
  onExpire: (color: 'w' | 'b') => void;
}

interface UseChessClockApi {
  remainingMs: ClockTimes;
  /** Online only -- overwrites both sides' clocks with the server's authoritative values.
   * Never called for bot/local, which never has anything to reconcile against. */
  reconcile: (serverRemainingMs: ClockTimes) => void;
}

// Refs hold the truth, one 1Hz React state drives the display -- avoids
// setInterval drift accumulation (repeatedly subtracting ~1000ms per tick
// would compound rounding/scheduling error over a long game). `remainingRef`
// is each side's remaining time as of the START of their current/last turn,
// only ever written at a turn-change boundary; the live display value is
// always *derived* fresh from that anchor plus true elapsed wall time, never
// by mutating the anchor tick-by-tick.
export function useChessClock({
  turn,
  isGameOver,
  initialMs,
  incrementMs = 0,
  onExpire,
}: UseChessClockOptions): UseChessClockApi {
  const remainingRef = useRef<ClockTimes>(initialMs);
  const turnStartedAtRef = useRef<number>(Date.now());
  const prevTurnRef = useRef<'w' | 'b' | null>(null);
  const [display, setDisplay] = useState<ClockTimes>(initialMs);

  // Single effect per turn change (or game-over toggle) -- does turn-change
  // bookkeeping (deduct elapsed from the mover, credit increment, reset the
  // anchor) THEN arms the 1s display tick + a precise single-shot expiry
  // timeout for whichever side is now active, all from one consistent view
  // of the refs. Two separate effects here would depend on declaration
  // order to stay correct; one effect makes that ordering explicit instead
  // of implicit.
  useEffect(() => {
    if (isGameOver) return;

    const now = Date.now();
    if (prevTurnRef.current === null) {
      // First mount (or a reset -- isGameOver went true then back to false,
      // which also clears prevTurnRef below): start fresh, no elapsed time
      // to credit to anyone yet.
      turnStartedAtRef.current = now;
    } else if (prevTurnRef.current !== turn) {
      const mover = prevTurnRef.current;
      const elapsed = now - turnStartedAtRef.current;
      remainingRef.current = {
        ...remainingRef.current,
        [mover]: Math.max(0, remainingRef.current[mover] - elapsed) + incrementMs,
      };
      turnStartedAtRef.current = now;
    }
    prevTurnRef.current = turn;

    function currentRemaining(color: 'w' | 'b'): number {
      if (color !== turn) return remainingRef.current[color];
      const elapsed = Date.now() - turnStartedAtRef.current;
      return Math.max(0, remainingRef.current[color] - elapsed);
    }

    setDisplay({ w: currentRemaining('w'), b: currentRemaining('b') });

    const tick = setInterval(() => {
      setDisplay({ w: currentRemaining('w'), b: currentRemaining('b') });
    }, 1000);

    // A 1s poll alone could lag up to 999ms behind the real deadline --
    // this fires expiry at the exact instant the active side hits 0.
    let expired = false;
    const msLeft = Math.max(0, remainingRef.current[turn] - (Date.now() - turnStartedAtRef.current));
    const expiry = setTimeout(() => {
      if (expired) return;
      expired = true;
      onExpire(turn);
    }, msLeft);

    return () => {
      clearInterval(tick);
      clearTimeout(expiry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, isGameOver]);

  // A game-over transition (game ends, or a reset brings it back to
  // "playing") should start the next game's bookkeeping fresh rather than
  // treating the reset as an ordinary turn change.
  useEffect(() => {
    if (!isGameOver) return;
    prevTurnRef.current = null;
  }, [isGameOver]);

  function reconcile(serverRemainingMs: ClockTimes) {
    remainingRef.current = { ...serverRemainingMs };
    turnStartedAtRef.current = Date.now();
    setDisplay({ ...serverRemainingMs });
  }

  return { remainingMs: display, reconcile };
}
