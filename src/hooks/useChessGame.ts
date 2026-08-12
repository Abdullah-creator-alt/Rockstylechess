import { Chess, type Square } from 'chess.js';
import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveBotMove, type BotDifficulty, type RequestEngineMove } from '@/lib/botEngine';

export type { BotDifficulty } from '@/lib/botEngine';

export type GameMode = 'bot' | 'local';

export type ChessGameResult =
  | { type: 'checkmate'; winner: 'w' | 'b' }
  | { type: 'stalemate' }
  | { type: 'draw' }
  | { type: 'resignation'; winner: 'w' | 'b' };

interface GameSnapshot {
  board: string[][];
  turn: 'w' | 'b';
  checkSquare: Square | null;
  isGameOver: boolean;
  capturedByWhite: string[];
  capturedByBlack: string[];
  lastMove: { from: Square; to: Square } | null;
}

interface UseChessGameOptions {
  mode: GameMode;
  /** Which of the four bot engines to use. Only relevant when mode === 'bot'. */
  difficulty?: BotDifficulty;
  /** Bridges to the mounted StockfishEngine; required for the two Stockfish difficulties. */
  requestEngineMove?: RequestEngineMove;
  /** Bot always plays black; human is white. Only relevant when mode === 'bot'. */
  onGameOver?: (result: ChessGameResult) => void;
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

function buildSnapshot(chess: Chess): GameSnapshot {
  const rows = chess.board();
  const board: string[][] = rows.map((row) =>
    row.map((cell) => (cell ? (cell.color === 'w' ? cell.type.toUpperCase() : cell.type) : '')),
  );

  const turn = chess.turn();
  let checkSquare: Square | null = null;
  if (chess.inCheck()) {
    for (const row of rows) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === turn) {
          checkSquare = cell.square;
        }
      }
    }
  }

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

  return { board, turn, checkSquare, isGameOver: chess.isGameOver(), capturedByWhite, capturedByBlack, lastMove };
}

// Wraps chess.js's mutable Chess instance in React state. chess.js owns all
// real chess logic (legal moves, check/checkmate/stalemate/draw detection) --
// this hook just asks it questions and mirrors the answers into a snapshot
// React can render and diff.
export function useChessGame({ mode, difficulty = 'easy', requestEngineMove, onGameOver }: UseChessGameOptions) {
  const chessRef = useRef<Chess>(new Chess());
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => buildSnapshot(chessRef.current));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  // Which side made the most recently applied move -- ChessBoard uses this to
  // only play the slide-in travel animation for the bot's moves, since the
  // player's own moves already have visual feedback from the tap/drag itself.
  const [lastMoveSource, setLastMoveSource] = useState<'human' | 'bot' | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const gameOverFiredRef = useRef(false);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    return chessRef.current.moves({ square: selectedSquare, verbose: true }).map((move) => move.to);
  }, [selectedSquare, snapshot]);

  function refresh() {
    setSnapshot(buildSnapshot(chessRef.current));
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

  function handleSquarePress(square: Square) {
    const chess = chessRef.current;
    if (chess.isGameOver()) return;

    if (selectedSquare) {
      if (legalTargets.includes(square)) {
        try {
          // promotion is always auto-queened -- no under-promotion picker yet.
          chess.move({ from: selectedSquare, to: square, promotion: 'q' });
        } catch (error) {
          console.log('Unexpected illegal move rejected by chess.js', error);
        }
        setSelectedSquare(null);
        setLastMoveSource('human');
        refresh();
        reportGameOverIfDone();
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

  function resign(resigningColor: 'w' | 'b') {
    if (gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;
    onGameOverRef.current?.({ type: 'resignation', winner: resigningColor === 'w' ? 'b' : 'w' });
  }

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
    const isStockfish = difficulty === 'stockfish-lite' || difficulty === 'stockfish-strong';
    const delay = isStockfish ? HARD_PRE_DELAY_MS : BOT_MOVE_DELAY_MS;

    const timeout = setTimeout(async () => {
      const move = await resolveBotMove(chess, difficulty, requestEngineMove);
      if (cancelled || !move) return;
      try {
        chess.move(move);
      } catch (error) {
        console.log('Bot move rejected unexpectedly', error);
      }
      setLastMoveSource('bot');
      refresh();
      reportGameOverIfDone();
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, snapshot]);

  return {
    board: snapshot.board,
    turn: snapshot.turn,
    checkSquare: snapshot.checkSquare,
    isGameOver: snapshot.isGameOver,
    capturedByWhite: snapshot.capturedByWhite,
    capturedByBlack: snapshot.capturedByBlack,
    lastMove: snapshot.lastMove,
    lastMoveSource,
    selectedSquare,
    legalTargets,
    handleSquarePress,
    resign,
  };
}
