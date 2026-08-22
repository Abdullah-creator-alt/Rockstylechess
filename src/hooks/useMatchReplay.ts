import { Chess, type Square } from 'chess.js';
import { useEffect, useMemo, useRef, useState } from 'react';

import { boardGridFromChess, checkSquareFromChess } from '@/lib/chessBoardSnapshot';

export interface ReplayPly {
  board: string[][];
  lastMove: { from: Square; to: Square };
  checkSquare: Square | null;
  turn: 'w' | 'b';
  san: string;
  /** This ply's own recorded think time, clamped for watchable auto-play. */
  elapsedMs: number;
}

// Keeps auto-play watchable regardless of whether a real move took 2
// seconds or 2 minutes -- these are playback pacing bounds, not a claim
// about the real recorded value (which is untouched in elapsedMs above,
// only used to derive it).
const MIN_STEP_MS = 400;
const MAX_STEP_MS = 2500;

const START_BOARD = boardGridFromChess(new Chess());

// Parses a stored PGN (server/src/match.ts's MoveElapsedMs comment: "100%
// reconstructable from the pgn column... chess.loadPgn(pgn) +
// chess.history({verbose: true})") into a fully precomputed array of
// per-ply board snapshots, zipped with the recorded per-move timings by
// index -- cheap and finite, so there's no need to incrementally replay
// moves on every step the way live play does.
export function useMatchReplay(pgn: string | null, moveElapsedMs: number[] | null) {
  const plies = useMemo<ReplayPly[]>(() => {
    if (!pgn) return [];
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch (error) {
      console.log('useMatchReplay: failed to parse stored pgn', error);
      return [];
    }
    return chess.history({ verbose: true }).map((entry, i) => {
      const after = new Chess(entry.after);
      const raw = moveElapsedMs?.[i] ?? MIN_STEP_MS;
      return {
        board: boardGridFromChess(after),
        lastMove: { from: entry.from, to: entry.to },
        checkSquare: checkSquareFromChess(after),
        turn: after.turn(),
        san: entry.san,
        elapsedMs: Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, raw)),
      };
    });
  }, [pgn, moveElapsedMs]);

  const [plyIndex, setPlyIndex] = useState(0); // 0 = starting position, N = after ply N
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset to the start whenever a different game loads.
  useEffect(() => {
    setPlyIndex(0);
    setIsPlaying(false);
  }, [plies]);

  const plyIndexRef = useRef(plyIndex);
  plyIndexRef.current = plyIndex;

  useEffect(() => {
    if (!isPlaying) return;
    if (plyIndexRef.current >= plies.length) {
      setIsPlaying(false);
      return;
    }
    const delay = plies[plyIndexRef.current]?.elapsedMs ?? MIN_STEP_MS;
    const timer = setTimeout(() => {
      setPlyIndex((i) => Math.min(i + 1, plies.length));
    }, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, plyIndex, plies]);

  function next() {
    setPlyIndex((i) => Math.min(i + 1, plies.length));
  }
  function prev() {
    setIsPlaying(false);
    setPlyIndex((i) => Math.max(i - 1, 0));
  }
  function goTo(index: number) {
    setIsPlaying(false);
    setPlyIndex(Math.min(Math.max(index, 0), plies.length));
  }
  function play() {
    if (plyIndex >= plies.length) setPlyIndex(0);
    setIsPlaying(true);
  }
  function pause() {
    setIsPlaying(false);
  }

  const current = plyIndex === 0 ? null : plies[plyIndex - 1];

  return {
    board: current?.board ?? START_BOARD,
    lastMove: current?.lastMove ?? null,
    checkSquare: current?.checkSquare ?? null,
    turn: current?.turn ?? 'w',
    plyIndex,
    totalPlies: plies.length,
    plies,
    isPlaying,
    next,
    prev,
    goTo,
    play,
    pause,
    isAvailable: pgn !== null && plies.length > 0,
  };
}
