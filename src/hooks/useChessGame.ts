import { Chess, type Square } from 'chess.js';
import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveBotMove, type BotDifficulty, type RequestEngineMove } from '@/lib/botEngine';
import { boardGridFromChess, checkSquareFromChess } from '@/lib/chessBoardSnapshot';
import { getSocket } from '@/lib/socket';
import type { MatchEndedPayload, MoveAppliedPayload } from '@/lib/onlineMatch';
import { parseUciMove } from '@/lib/puzzleEngine';

export type { BotDifficulty } from '@/lib/botEngine';

export type GameMode = 'bot' | 'local' | 'online' | 'puzzle';

export type ChessGameResult =
  | { type: 'checkmate'; winner: 'w' | 'b' }
  | { type: 'stalemate' }
  | { type: 'draw' }
  | { type: 'resignation'; winner: 'w' | 'b' }
  | { type: 'forfeit'; winner: 'w' | 'b' };

export interface OnlineMatchInfo {
  matchId: string;
  playerColor: 'w' | 'b';
  initialFen: string;
}

export interface PuzzleInfo {
  puzzleId: string;
  /** Position BEFORE the opponent's forced setup move (Lichess convention). */
  fen: string;
  /**
   * Full raw UCI move list. moves[0] is the opponent's forced setup move
   * (auto-played on construction/reset); moves[1], moves[3], ... are the
   * solver's own moves; moves[2], moves[4], ... (if present) are scripted
   * opponent replies auto-played in between. See puzzleMoveIndexRef below.
   */
  moves: string[];
}

export type PuzzleStatus = 'playing' | 'solved' | 'failed';

type LastMoveSource = 'human' | 'bot' | 'opponent' | null;

interface GameSnapshot {
  board: string[][];
  turn: 'w' | 'b';
  checkSquare: Square | null;
  isGameOver: boolean;
  capturedByWhite: string[];
  capturedByBlack: string[];
  lastMove: { from: Square; to: Square } | null;
  // Which side made this snapshot's move -- ChessBoard uses this to only
  // play the slide-in travel animation for moves that weren't this device's
  // own tap/drag (bot moves, or an online opponent's moves), since the local
  // player's own moves already have visual feedback from the gesture itself.
  // Folded into the same snapshot (rather than a separate `useState`) so a
  // move's board/lastMove/source always land in one React commit together --
  // two separate `setState` calls per move let ChessBoard observe a
  // torn/partial update on some platforms, which was the root cause of a
  // slide-in animation glitch (see git history).
  lastMoveSource: LastMoveSource;
  // 'playing' for every non-puzzle mode -- only meaningful when
  // mode === 'puzzle'. Folded into the snapshot for the same reason
  // lastMoveSource is: a wrong-guess/solved/failed transition must land in
  // the same atomic commit as the board it applies to.
  puzzleStatus: PuzzleStatus;
}

interface UseChessGameOptions {
  mode: GameMode;
  /** Which of the four bot engines to use. Only relevant when mode === 'bot'. */
  difficulty?: BotDifficulty;
  /** Bridges to the mounted StockfishEngine; required for the two Stockfish difficulties. */
  requestEngineMove?: RequestEngineMove;
  /** Bot always plays black; human is white. Only relevant when mode === 'bot'. */
  onGameOver?: (result: ChessGameResult) => void;
  /** Match id, which color this device plays, and the starting FEN handed
   * back by the server's queue:matched event. Required when mode === 'online'. */
  online?: OnlineMatchInfo;
  /** The puzzle being solved. Required when mode === 'puzzle'. */
  puzzle?: PuzzleInfo;
}

// Bot "thinks" for a beat so its move doesn't feel instant -- long enough
// that the player has clearly finished seeing their own move settle before
// the opponent's piece starts sliding. Only used for easy/medium, which
// resolve near-instantly on their own; the Stockfish tiers get their pacing
// from the engine's own movetime instead (see HARD_PRE_DELAY_MS).
const BOT_MOVE_DELAY_MS = 1100;
// Stockfish's own `go movetime` already provides a "thinking" pause -- stacking
// the full BOT_MOVE_DELAY_MS on top would make it feel slower than easy/medium
// for no reason. Still a small delay so the board doesn't flash instantly.
const HARD_PRE_DELAY_MS = 250;

// Loads a puzzle's starting FEN and auto-plays the opponent's forced setup
// move (moves[0]) -- shared by the initial chessRef construction and
// resetPuzzle(), so the very first snapshot a puzzle screen sees already
// reflects the post-setup-move position (and its lastMove highlight shows
// what the opponent just played).
function createPuzzleChess(puzzle: PuzzleInfo): Chess {
  const chess = new Chess(puzzle.fen);
  try {
    chess.move(parseUciMove(puzzle.moves[0]));
  } catch (error) {
    console.log('Puzzle setup move rejected unexpectedly', error);
  }
  return chess;
}

function buildSnapshot(chess: Chess, lastMoveSource: LastMoveSource, puzzleStatus: PuzzleStatus): GameSnapshot {
  const board = boardGridFromChess(chess);
  const turn = chess.turn();
  const checkSquare = checkSquareFromChess(chess);

  const history = chess.history({ verbose: true });
  const capturedByWhite: string[] = [];
  const capturedByBlack: string[] = [];
  for (const move of history) {
    if (move.captured) {
      if (move.color === 'w') capturedByWhite.push(move.captured);
      else capturedByBlack.push(move.captured);
    }
  }

  const lastHistoryMove = history[history.length - 1];
  const lastMove = lastHistoryMove ? { from: lastHistoryMove.from, to: lastHistoryMove.to } : null;

  return {
    board,
    turn,
    checkSquare,
    isGameOver: chess.isGameOver(),
    capturedByWhite,
    capturedByBlack,
    lastMove,
    lastMoveSource,
    puzzleStatus,
  };
}

// Wraps chess.js's mutable Chess instance in React state. chess.js owns all
// real chess logic (legal moves, check/checkmate/stalemate/draw detection) --
// this hook just asks it questions and mirrors the answers into a snapshot
// React can render and diff.
export function useChessGame({
  mode,
  difficulty = 'easy',
  requestEngineMove,
  onGameOver,
  online,
  puzzle,
}: UseChessGameOptions) {
  const chessRef = useRef<Chess>(puzzle ? createPuzzleChess(puzzle) : new Chess(online?.initialFen));
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => buildSnapshot(chessRef.current, null, 'playing'));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const gameOverFiredRef = useRef(false);
  // Next index to consume from puzzle.moves -- 0 was already auto-played by
  // createPuzzleChess. Odd indices are the solver's own moves (applied via
  // handlePuzzleAttempt); even indices >= 2 are scripted opponent replies
  // (applied by the puzzle-reply effect below).
  const puzzleMoveIndexRef = useRef(1);
  const isSolverTurnInPuzzle = puzzleMoveIndexRef.current % 2 === 1;
  // Bot/local matches never reach the server, so unlike online (server/src/
  // match.ts's applyMove) they'd otherwise have no timing data for a replay
  // feature to use -- mirrors that exact Date.now()-since-start pattern
  // client-side, only for the modes that need it.
  const matchStartRef = useRef(Date.now());
  const moveElapsedMsRef = useRef<number[]>([]);

  function recordMoveTiming() {
    if (mode !== 'bot' && mode !== 'local') return;
    moveElapsedMsRef.current.push(Date.now() - matchStartRef.current);
  }

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    return chessRef.current.moves({ square: selectedSquare, verbose: true }).map((move) => move.to);
  }, [selectedSquare, snapshot]);

  function refresh(source: LastMoveSource = null, puzzleStatus: PuzzleStatus = 'playing') {
    setSnapshot(buildSnapshot(chessRef.current, source, puzzleStatus));
  }

  function reportGameOverIfDone() {
    const chess = chessRef.current;
    if (!chess.isGameOver() || gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;

    if (chess.isCheckmate()) {
      // The side to move is the one with no legal moves -- the other side won.
      const winner: 'w' | 'b' = chess.turn() === 'w' ? 'b' : 'w';
      onGameOverRef.current?.({ type: 'checkmate', winner });
    } else if (chess.isStalemate()) {
      onGameOverRef.current?.({ type: 'stalemate' });
    } else {
      onGameOverRef.current?.({ type: 'draw' });
    }
  }

  // A wrong guess must never mutate the real chess.js position -- the board
  // stays put and only puzzleStatus flips, so the very next attempt still
  // retries against the same expected move (standard puzzle-trainer UX,
  // matching Lichess's own "try again" behavior rather than treating a
  // wrong guess as game over).
  function handlePuzzleAttempt(from: Square, to: Square) {
    if (!puzzle) return;
    const chess = chessRef.current;
    const expected = parseUciMove(puzzle.moves[puzzleMoveIndexRef.current]);
    if (from !== expected.from || to !== expected.to) {
      refresh(null, 'failed');
      return;
    }
    try {
      chess.move({ from, to, promotion: expected.promotion ?? 'q' });
    } catch (error) {
      console.log('Puzzle move unexpectedly rejected by chess.js', error);
      refresh(null, 'failed');
      return;
    }
    puzzleMoveIndexRef.current += 1;
    const solved = puzzleMoveIndexRef.current >= puzzle.moves.length;
    // Deliberately never calls reportGameOverIfDone() -- some puzzles end in
    // real checkmate, and without this the final correct move would
    // spuriously fire onGameOver with real-match semantics that don't apply
    // here. Puzzle completion is signaled purely via puzzleStatus.
    refresh('human', solved ? 'solved' : 'playing');
  }

  function handleSquarePress(square: Square) {
    const chess = chessRef.current;
    if (chess.isGameOver()) return;
    // Once a puzzle is solved there's nothing left to do with further taps
    // -- but a 'failed' guess stays retriable (see handlePuzzleAttempt).
    if (mode === 'puzzle' && puzzle && snapshot.puzzleStatus === 'solved') return;
    // Online: only this device's own color may act, and only on its turn --
    // the opponent's moves arrive exclusively via the server (see the online
    // effect below), never through local taps.
    if (mode === 'online' && online && chess.turn() !== online.playerColor) return;
    // Puzzle: scripted opponent replies (even indices) are auto-played by
    // the effect below, never through local taps.
    if (mode === 'puzzle' && puzzle && !isSolverTurnInPuzzle) return;

    if (selectedSquare) {
      if (legalTargets.includes(square)) {
        const from = selectedSquare;
        setSelectedSquare(null);
        if (mode === 'puzzle' && puzzle) {
          handlePuzzleAttempt(from, square);
          return;
        }
        try {
          // promotion is always auto-queened -- no under-promotion picker yet.
          chess.move({ from, to: square, promotion: 'q' });
        } catch (error) {
          console.log('Unexpected illegal move rejected by chess.js', error);
        }
        recordMoveTiming();
        refresh('human');
        reportGameOverIfDone();
        if (mode === 'online' && online) {
          // Applied locally already for instant feedback; this is the
          // server's authoritative copy. A rejection here would only mean a
          // prior desync -- not handled beyond logging, see move:rejected below.
          getSocket().emit('move:make', { matchId: online.matchId, from, to: square, promotion: 'q' });
        }
        return;
      }

      const piece = chess.get(square);
      // Tapping a different piece of the side to move reselects instead of
      // moving; tapping anything else (empty/illegal/opponent piece) deselects.
      setSelectedSquare(piece && piece.color === chess.turn() ? square : null);
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
    }
  }

  // Resets to the puzzle's starting position (re-applying the opponent's
  // setup move) -- used by the "Give Up"/retry action on the puzzle screen.
  function resetPuzzle() {
    if (!puzzle) return;
    chessRef.current = createPuzzleChess(puzzle);
    puzzleMoveIndexRef.current = 1;
    refresh(null, 'playing');
  }

  function resign(resigningColor: 'w' | 'b') {
    if (gameOverFiredRef.current) return;
    if (mode === 'online' && online) {
      // Wait for the server's match:ended broadcast (below) rather than
      // firing locally -- it needs to reach the opponent too.
      getSocket().emit('match:resign', { matchId: online.matchId });
      return;
    }
    gameOverFiredRef.current = true;
    onGameOverRef.current?.({ type: 'resignation', winner: resigningColor === 'w' ? 'b' : 'w' });
  }

  useEffect(() => {
    if (mode !== 'online' || !online) return;
    const socket = getSocket();
    const chess = chessRef.current;

    function handleMoveApplied(payload: MoveAppliedPayload) {
      // Our own moves are applied locally the instant the player taps (see
      // handleSquarePress) -- this broadcast only needs acting on when it's
      // the opponent's move, identifiable because the turn just became ours.
      if (!online || payload.turn !== online.playerColor) return;
      try {
        chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion ?? 'q' });
      } catch (error) {
        console.log('Opponent move rejected unexpectedly', error);
      }
      refresh('opponent');
      reportGameOverIfDone();
    }

    function handleMatchEnded(payload: MatchEndedPayload) {
      if (gameOverFiredRef.current) return;
      gameOverFiredRef.current = true;
      onGameOverRef.current?.(payload.result);
    }

    socket.on('move:applied', handleMoveApplied);
    socket.on('match:ended', handleMatchEnded);
    return () => {
      socket.off('move:applied', handleMoveApplied);
      socket.off('match:ended', handleMatchEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, online?.matchId]);

  useEffect(() => {
    if (mode !== 'bot') return;
    const chess = chessRef.current;
    if (chess.isGameOver() || chess.turn() !== 'b') return;

    // The Stockfish tiers resolve asynchronously (a round trip through the
    // WebView), unlike easy/medium's synchronous lookups -- so the move can
    // arrive after this effect's own cleanup has already fired (unmount,
    // rapid state changes). `cancelled` stops it from being applied then,
    // which the old purely-synchronous version never had to guard against.
    let cancelled = false;
    const isStockfish =
      difficulty === 'stockfish-basic' || difficulty === 'stockfish-lite' || difficulty === 'stockfish-strong';
    const delay = isStockfish ? HARD_PRE_DELAY_MS : BOT_MOVE_DELAY_MS;

    const timeout = setTimeout(async () => {
      const move = await resolveBotMove(chess, difficulty, requestEngineMove);
      if (cancelled || !move) return;
      try {
        chess.move(move);
      } catch (error) {
        console.log('Bot move rejected unexpectedly', error);
      }
      recordMoveTiming();
      refresh('bot');
      reportGameOverIfDone();
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, snapshot]);

  useEffect(() => {
    if (mode !== 'puzzle' || !puzzle) return;
    if (snapshot.puzzleStatus !== 'playing') return;
    const index = puzzleMoveIndexRef.current;
    // Even indices >= 2 are the opponent's scripted replies between solver
    // moves -- index 0 was already auto-played by createPuzzleChess, and odd
    // indices are the solver's own moves, applied via handlePuzzleAttempt.
    if (index === 0 || index % 2 !== 0 || index >= puzzle.moves.length) return;

    let cancelled = false;
    // Shorter than BOT_MOVE_DELAY_MS -- this isn't "thinking", just a beat
    // so the reply doesn't feel instant/jarring after the solver's move.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      const chess = chessRef.current;
      try {
        chess.move(parseUciMove(puzzle.moves[index]));
      } catch (error) {
        console.log('Puzzle opponent reply rejected unexpectedly', error);
      }
      puzzleMoveIndexRef.current += 1;
      const solved = puzzleMoveIndexRef.current >= puzzle.moves.length;
      refresh('opponent', solved ? 'solved' : 'playing');
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, puzzle, snapshot]);

  // Not part of GameSnapshot (like legalTargets) -- purely derived from the
  // puzzle's next expected move, for the puzzle screen's Hint button.
  const hintSquare = useMemo(() => {
    if (mode !== 'puzzle' || !puzzle || snapshot.puzzleStatus !== 'playing') return null;
    const index = puzzleMoveIndexRef.current;
    if (index >= puzzle.moves.length) return null;
    return parseUciMove(puzzle.moves[index]).from;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, puzzle, snapshot]);

  // Bot/local only -- there's no server record to replay from for these
  // modes, so match.tsx's handleGameOver reads this once at game-over and
  // hands it to localMatchReplayStore.ts. null for online (already has a
  // server-backed replay) and puzzle (no replay concept).
  function getReplayData(): { pgn: string; moveElapsedMs: number[] } | null {
    if (mode !== 'bot' && mode !== 'local') return null;
    return { pgn: chessRef.current.pgn(), moveElapsedMs: [...moveElapsedMsRef.current] };
  }

  return {
    board: snapshot.board,
    turn: snapshot.turn,
    checkSquare: snapshot.checkSquare,
    isGameOver: snapshot.isGameOver,
    capturedByWhite: snapshot.capturedByWhite,
    capturedByBlack: snapshot.capturedByBlack,
    lastMove: snapshot.lastMove,
    lastMoveSource: snapshot.lastMoveSource,
    puzzleStatus: snapshot.puzzleStatus,
    hintSquare,
    selectedSquare,
    legalTargets,
    handleSquarePress,
    resetPuzzle,
    resign,
    getReplayData,
  };
}
