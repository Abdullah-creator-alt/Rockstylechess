import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BoardSquares, Colors, withOpacity } from '@/constants/theme';

import { PIECE_SPRITES } from './pieceSprites';

// Standard starting position. Uppercase = white, lowercase = black, '' = empty.
// Default board when no `board` prop is given -- this is what keeps Front
// Row (Spectate) rendering exactly as before: it doesn't pass any of the new
// interactivity props, so it still just shows this static position.
const STARTING_BOARD: string[][] = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Minimal shape ChessBoard needs from a theme -- BoardTheme (constants/boardThemes.ts) satisfies this directly. */
export interface ChessBoardTheme {
  squares: { light: readonly string[]; dark: readonly string[] };
  glowColor: string;
}

const DEFAULT_BOARD_THEME: ChessBoardTheme = {
  squares: BoardSquares,
  glowColor: Colors.cyan,
};

function squareAt(rowIndex: number, colIndex: number): string {
  return `${FILES[colIndex]}${8 - rowIndex}`;
}

function squareToRowCol(square: string): [row: number, col: number] {
  const col = FILES.indexOf(square[0]);
  const row = 8 - Number(square[1]);
  return [row, col];
}

interface DraggingPiece {
  square: string;
  piece: string;
  row: number;
  col: number;
}

interface ChessBoardProps {
  style?: StyleProp<ViewStyle>;
  /** Defaults to the static starting position (Front Row's read-only usage). */
  board?: string[][];
  selectedSquare?: string | null;
  /** Algebraic squares the selected piece can legally move to. */
  legalTargets?: string[];
  /** Algebraic square of the king currently in check, if any. */
  checkSquare?: string | null;
  /** From/to squares of the most recently played move, highlighted like chess.com. */
  lastMove?: { from: string; to: string } | null;
  /** Whose turn it is -- gates which pieces show the "pick up" drag affordance. */
  turn?: 'w' | 'b';
  /**
   * Play a slide-in travel animation the next time `lastMove` changes. Only
   * pass this for moves the player didn't just drag/tap themselves (e.g. the
   * bot's moves) -- the player's own moves already have feedback from the
   * gesture that made them, so animating those too would just double up.
   */
  animateLastMove?: boolean;
  /** Omit to keep the board read-only/static, e.g. Front Row's spectate view. */
  onSquarePress?: (square: string) => void;
  /** Square colors + glow accent. Defaults to the original fixed look. */
  theme?: ChessBoardTheme;
}

export function ChessBoard({
  style,
  board = STARTING_BOARD,
  selectedSquare = null,
  legalTargets = [],
  checkSquare = null,
  lastMove = null,
  turn,
  animateLastMove = false,
  onSquarePress,
  theme = DEFAULT_BOARD_THEME,
}: ChessBoardProps) {
  const [gridSize, setGridSize] = useState(0);
  const [dragging, setDragging] = useState<DraggingPiece | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  // Exact 8x8. Squares are laid out at an integer pixel size rather than with
  // flex:1, because eight flex children of a fractional width get rounded
  // independently -- squares end up a pixel wider or narrower than their
  // neighbours and the file boundaries stop lining up down the board. Flooring
  // to a whole number and sizing the grid to 8x that keeps every square
  // identical and perfectly square; the few leftover pixels go to the frame.
  // Declared up here (rather than down with boardSize below) so the slide
  // effect below can freeze the value current at animation-start time.
  const squareSize = Math.floor(gridSize / 8);

  // Slide-in ghost for moves that appeared without the player dragging/tapping
  // them into place (the bot's moves) -- see `animateLastMove`. Tracks the
  // previous lastMove so it only fires once per new move, not on every
  // unrelated re-render. `squareSize` is captured here at the moment the
  // slide starts (not read live by MoveGhost) -- ChessBoard isn't memoized,
  // so it re-renders on every unrelated parent update (turn changes, a
  // captured piece appearing in a PlayerRow, etc.) for the whole ~420ms the
  // animation runs; if gridSize/squareSize ever changes mid-flight (layout
  // passes settling, especially prone to happening more than once on
  // Android), a live squareSize would shift MoveGhost's fromX/fromY/toX/toY
  // out from under the in-flight tween, visible as a small backward snap
  // near the end rather than a full reset.
  const [slidingMove, setSlidingMove] = useState<
    { from: string; to: string; piece: string; squareSize: number } | null
  >(null);
  const slideProgress = useSharedValue(0);
  const prevLastMoveRef = useRef<{ from: string; to: string } | null>(null);
  // Bumped every time a new slide starts. A stale withTiming completion
  // callback from a superseded animation (e.g. two bot moves landing close
  // together after a JS-thread stall queues up render/input backlog) checks
  // this before clearing state, so it can't wipe out a newer, still-running
  // slide out from under it.
  const slideTokenRef = useRef(0);
  // Read inside the effect via ref rather than as a dependency -- the effect
  // only needs `board` to look up which piece landed on `to`, not to decide
  // whether a new move happened (`isNewMove` below already does that from
  // `lastMove` alone). Depending on `board` directly would re-run the effect
  // on any board reference change, resetting slideProgress mid-tween.
  const boardRef = useRef(board);
  boardRef.current = board;

  function clearSlideIfCurrent(token: number) {
    if (slideTokenRef.current === token) setSlidingMove(null);
  }

  useEffect(() => {
    const prev = prevLastMoveRef.current;
    prevLastMoveRef.current = lastMove;

    const isNewMove = lastMove !== null && (!prev || prev.from !== lastMove.from || prev.to !== lastMove.to);
    if (!isNewMove || !animateLastMove) return;

    const [toRow, toCol] = squareToRowCol(lastMove.to);
    const piece = boardRef.current[toRow]?.[toCol];
    if (!piece) return;

    const token = (slideTokenRef.current += 1);
    setSlidingMove({ from: lastMove.from, to: lastMove.to, piece, squareSize });
    slideProgress.value = 0;
    slideProgress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(clearSlideIfCurrent)(token);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove, animateLastMove]);

  const boardSize = squareSize * 8;
  const interactive = Boolean(onSquarePress);

  function handleGridLayout(event: LayoutChangeEvent) {
    setGridSize(Math.min(event.nativeEvent.layout.width, event.nativeEvent.layout.height));
  }

  function handleTapSquare(square: string) {
    onSquarePress?.(square);
  }

  function handleGrab(square: string, piece: string, row: number, col: number) {
    dragX.value = 0;
    dragY.value = 0;
    setDragging({ square, piece, row, col });
    onSquarePress?.(square);
  }

  function handleDrop(fromSquare: string, deltaRow: number, deltaCol: number) {
    const [fromRow, fromCol] = squareToRowCol(fromSquare);
    const targetRow = Math.min(7, Math.max(0, fromRow + deltaRow));
    const targetCol = Math.min(7, Math.max(0, fromCol + deltaCol));
    const targetSquare = squareAt(targetRow, targetCol);
    setDragging(null);
    if (targetSquare !== fromSquare) {
      onSquarePress?.(targetSquare);
    }
  }

  return (
    <View style={[styles.boardWrap, style]}>
      <View style={styles.frameSlot}>
        <GlowRing color={theme.glowColor} />

        <LinearGradient
          // Brushed-metal frame: the extra mid stops give it a bright top-left
          // edge and a rolled-off bottom-right, so it reads as a machined bezel
          // rather than a flat two-tone band.
          colors={[
            Colors.chrome,
            Colors.chromeMid,
            Colors.chrome,
            Colors.chromeDark,
            Colors.chromeMid,
          ]}
          locations={[0, 0.22, 0.5, 0.82, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.boardFrame}
        >
          {/* Bevel: a bright inner highlight down the top edge and a dark
              recess at the bottom, so the playfield looks inset into the frame. */}
          <LinearGradient
            pointerEvents="none"
            colors={[withOpacity(Colors.chrome, 0.95), withOpacity(Colors.chrome, 0), withOpacity(Colors.bgBase, 0.35)]}
            locations={[0, 0.35, 1]}
            style={styles.frameBevel}
          />

          <Rivet style={{ top: 6, left: 6 }} />
          <Rivet style={{ top: 6, right: 6 }} />
          <Rivet style={{ bottom: 6, left: 6 }} />
          <Rivet style={{ bottom: 6, right: 6 }} />

          <View style={styles.gridWrapper} onLayout={handleGridLayout}>
            {/* Sized to the exact 8x8 so the sheen and the drag ghost share the
                grid's coordinate space -- the leftover pixels from flooring sit
                outside this box, against the frame. */}
            <View style={boardSize > 0 ? { width: boardSize, height: boardSize } : undefined}>
            <View style={styles.boardGrid}>
              {board.map((rowPieces, rowIndex) => (
                <View key={rowIndex} style={styles.boardRow}>
                  {rowPieces.map((piece, colIndex) => {
                    const square = squareAt(rowIndex, colIndex);
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const isWhitePiece = piece !== '' && piece === piece.toUpperCase();
                    const canDrag =
                      interactive && piece !== '' && (!turn || isWhitePiece === (turn === 'w'));

                    return (
                      <Square
                        key={colIndex}
                        square={square}
                        piece={piece}
                        squareColor={
                          (isLight ? theme.squares.light : theme.squares.dark)[rowIndex]
                        }
                        isLight={isLight}
                        isSelected={square === selectedSquare}
                        isLegalTarget={legalTargets.includes(square)}
                        isCapture={legalTargets.includes(square) && piece !== ''}
                        isCheck={square === checkSquare}
                        isLastMove={lastMove !== null && (square === lastMove.from || square === lastMove.to)}
                        isBeingDragged={dragging?.square === square}
                        isSliding={slidingMove?.to === square}
                        showRankLabel={colIndex === 0}
                        rankLabel={8 - rowIndex}
                        showFileLabel={rowIndex === 7}
                        fileLabel={FILES[colIndex]}
                        squareSize={squareSize}
                        interactive={interactive}
                        canDrag={canDrag}
                        row={rowIndex}
                        col={colIndex}
                        dragX={dragX}
                        dragY={dragY}
                        onTapSquare={handleTapSquare}
                        onGrab={handleGrab}
                        onDrop={handleDrop}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            {/* No sheen overlay here any more. The per-rank square colors above
                are sampled from the reference and already carry its lighting, so
                a second gradient on top double-counted it -- darkening the lower
                board past the render and washing out the upper. */}

            {slidingMove && slidingMove.squareSize > 0 ? (
              <MoveGhost
                piece={slidingMove.piece}
                from={slidingMove.from}
                to={slidingMove.to}
                squareSize={slidingMove.squareSize}
                progress={slideProgress}
              />
            ) : null}

            {dragging && squareSize > 0 ? (
              <DragGhost
                piece={dragging.piece}
                row={dragging.row}
                col={dragging.col}
                squareSize={squareSize}
                dragX={dragX}
                dragY={dragY}
              />
            ) : null}
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

// Cross-platform outer glow. React Native's colored `boxShadow` is unreliable
// on Android, so the cyan halo in the reference is built as three concentric
// rounded layers behind the frame with falling opacity -- a real layered glow
// that renders identically on both platforms.
function GlowRing({ color }: { color: string }) {
  return (
    <>
      <View
        style={[
          styles.glowLayer,
          styles.glowOuterShape,
          { borderColor: withOpacity(color, 0.08), backgroundColor: withOpacity(color, 0.05) },
        ]}
      />
      <View
        style={[
          styles.glowLayer,
          styles.glowMidShape,
          { borderColor: withOpacity(color, 0.18), backgroundColor: withOpacity(color, 0.09) },
        ]}
      />
      <View
        style={[
          styles.glowLayer,
          styles.glowInnerShape,
          { borderColor: withOpacity(color, 0.4), backgroundColor: withOpacity(color, 0.16) },
        ]}
      />
    </>
  );
}

interface SquareProps {
  square: string;
  piece: string;
  /** Measured per-rank tone for this square; see BoardSquares in the theme. */
  squareColor: string;
  isLight: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isCapture: boolean;
  isCheck: boolean;
  isLastMove: boolean;
  isBeingDragged: boolean;
  /** True while a slide-in ghost (see MoveGhost) is travelling to this square. */
  isSliding: boolean;
  showRankLabel: boolean;
  rankLabel: number;
  showFileLabel: boolean;
  fileLabel: string;
  squareSize: number;
  interactive: boolean;
  canDrag: boolean;
  row: number;
  col: number;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  onTapSquare: (square: string) => void;
  onGrab: (square: string, piece: string, row: number, col: number) => void;
  onDrop: (square: string, deltaRow: number, deltaCol: number) => void;
}

const Square = memo(function Square({
  square,
  piece,
  squareColor,
  isLight,
  isSelected,
  isLegalTarget,
  isCapture,
  isCheck,
  isLastMove,
  isBeingDragged,
  isSliding,
  showRankLabel,
  rankLabel,
  showFileLabel,
  fileLabel,
  squareSize,
  interactive,
  canDrag,
  row,
  col,
  dragX,
  dragY,
  onTapSquare,
  onGrab,
  onDrop,
}: SquareProps) {
  const labelColor = isLight ? withOpacity(Colors.boardEdge, 0.75) : withOpacity(Colors.chrome, 0.65);

  const tap = Gesture.Tap()
    .enabled(interactive)
    .onEnd((_event, success) => {
      if (success) runOnJS(onTapSquare)(square);
    });

  const pan = Gesture.Pan()
    .enabled(canDrag)
    .minDistance(4)
    .onStart(() => {
      runOnJS(onGrab)(square, piece, row, col);
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      const deltaCol = Math.round(event.translationX / squareSize);
      const deltaRow = Math.round(event.translationY / squareSize);
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
      runOnJS(onDrop)(square, deltaRow, deltaCol);
    });

  const composedGesture = Gesture.Race(pan, tap);

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={[
          styles.square,
          { width: squareSize, height: squareSize, backgroundColor: squareColor },
        ]}
      >
        {isLastMove ? <View style={[StyleSheet.absoluteFill, styles.lastMoveTint]} /> : null}
        {isSelected ? <View style={[StyleSheet.absoluteFill, styles.selectedTint]} /> : null}
        {isCheck ? <View style={[StyleSheet.absoluteFill, styles.checkTint]} /> : null}

        {showRankLabel ? (
          <Text style={[styles.rankLabel, { color: labelColor }]}>{rankLabel}</Text>
        ) : null}
        {showFileLabel ? (
          <Text style={[styles.fileLabel, { color: labelColor }]}>{fileLabel}</Text>
        ) : null}

        {piece && !isBeingDragged && !isSliding ? (
          <PieceGlyph piece={piece} squareSize={squareSize} />
        ) : null}

        {isCapture ? <View style={styles.captureRing} /> : null}
        {isLegalTarget && !isCapture ? <View style={styles.moveDot} /> : null}
      </View>
    </GestureDetector>
  );
});

// Travels a piece from its origin square to its destination square over the
// board -- gives moves that arrive without a drag/tap (the bot's moves) the
// same "I can see where that went" legibility a human's own gesture already
// provides. Piggybacks on the same absolute-positioned-over-the-grid trick as
// DragGhost, just driven by a timed progress value instead of a finger.
// Wrapped in memo (same pattern as Square below) so it doesn't re-render --
// and force Reanimated to re-register its useAnimatedStyle mapping -- every
// time ChessBoard re-renders for an unrelated reason (turn changes, a
// captured piece appearing in a PlayerRow, etc.) while a slide is mid-flight.
// All of its props are stable for a slide's whole duration: piece/from/to/
// squareSize are frozen into `slidingMove` once at slide-start (see the
// effect above), and `progress` is a useSharedValue, whose identity is
// stable across renders like a ref.
const MoveGhost = memo(function MoveGhost({
  piece,
  from,
  to,
  squareSize,
  progress,
}: {
  piece: string;
  from: string;
  to: string;
  squareSize: number;
  progress: SharedValue<number>;
}) {
  const [fromRow, fromCol] = squareToRowCol(from);
  const [toRow, toCol] = squareToRowCol(to);
  const fromX = fromCol * squareSize;
  const fromY = fromRow * squareSize;
  const toX = toCol * squareSize;
  const toY = toRow * squareSize;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: fromX + (toX - fromX) * progress.value },
      { translateY: fromY + (toY - fromY) * progress.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.dragGhost, { width: squareSize, height: squareSize, left: 0, top: 0 }, animatedStyle]}
    >
      <PieceGlyph piece={piece} squareSize={squareSize} />
    </Animated.View>
  );
});

function DragGhost({
  piece,
  row,
  col,
  squareSize,
  dragX,
  dragY,
}: {
  piece: string;
  row: number;
  col: number;
  squareSize: number;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
}) {
  // Lifts the piece well above the fingertip while dragging (like chess.com)
  // so the hand holding it doesn't cover the piece or the destination square.
  const liftOffset = -squareSize * 1.0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value + liftOffset },
      { scale: 2.1 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dragGhost,
        { width: squareSize, height: squareSize, left: col * squareSize, top: row * squareSize },
        animatedStyle,
      ]}
    >
      <PieceGlyph piece={piece} squareSize={squareSize} />
    </Animated.View>
  );
}

// Every piece is drawn by ChessPiece as vectors, plus one contact shadow so it
// sits ON its square instead of floating. The shadow lives here rather than in
// the art because it belongs to the board's lighting, not to the piece, and
// keeping it in one place is what makes it identical across all twelve.
/** Board letter -> sprite key. 'K' -> 'wk', 'q' -> 'bq'. */
function spriteKey(piece: string): string {
  return (piece === piece.toUpperCase() ? 'w' : 'b') + piece.toLowerCase();
}

function PieceGlyph({ piece, squareSize }: { piece: string; squareSize: number }) {
  const sprite = PIECE_SPRITES[spriteKey(piece)];
  if (!sprite) return null;

  return (
    <View style={{ width: squareSize, height: squareSize }}>
      {/* Two stacked ellipses rather than one: a wide faint pool with a tighter,
          darker core inside it. That falloff is what reads as a piece standing
          ABOVE the board -- a single flat ellipse just looks like a decal
          printed on the square. Built from plain views so it renders the same on
          both platforms, where a blurred colored shadow would not. */}
      <View
        style={[
          styles.shadowPool,
          {
            width: squareSize * 0.66,
            height: squareSize * 0.19,
            left: squareSize * 0.15,
            top: squareSize * 0.755,
          },
        ]}
      />
      <View
        style={[
          styles.shadowCore,
          {
            width: squareSize * 0.44,
            height: squareSize * 0.11,
            left: squareSize * 0.25,
            top: squareSize * 0.795,
          },
        ]}
      />

      <Image
        source={sprite}
        contentFit="contain"
        // Cut per whole square, so the sprite fills it edge to edge and keeps
        // the render's own framing and scale. Lifted a few percent off its own
        // baseline so it clears the shadow beneath it and reads as raised.
        style={[StyleSheet.absoluteFill, { transform: [{ translateY: -squareSize * 0.035 }] }]}
      />
    </View>
  );
}

// Machined screw head rather than a flat dot: a lit top-left face falling to a
// shaded bottom-right, ringed by a dark seat so it sits *in* the bezel.
function Rivet({ style }: { style: object }) {
  return (
    <View style={[styles.rivet, style]}>
      <LinearGradient
        colors={[Colors.chrome, Colors.chromeMid, Colors.chromeDark]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.rivetFace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boardWrap: {
    alignItems: 'center',
  },
  // Sized wrapper so the glow layers have a box to inset themselves against;
  // the frame itself stays the element that defines the board's dimensions.
  frameSlot: {
    width: '98%',
    maxWidth: 400,
    aspectRatio: 1,
  },
  boardFrame: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: withOpacity(Colors.chrome, 0.7),
    boxShadow: `0px 12px 34px ${withOpacity(Colors.bgBase, 0.9)}`,
  },
  frameBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    opacity: 0.5,
  },
  glowLayer: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  glowOuterShape: {
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 28,
  },
  glowMidShape: {
    top: -7,
    left: -7,
    right: -7,
    bottom: -7,
    borderRadius: 23,
  },
  glowInnerShape: {
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 19,
  },
  rivet: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    padding: 1,
    backgroundColor: withOpacity(Colors.bgBase, 0.55),
    boxShadow: `0px 1px 2px ${withOpacity(Colors.bgBase, 0.6)}`,
    zIndex: 1,
  },
  rivetFace: {
    flex: 1,
    borderRadius: 3.5,
  },
  gridWrapper: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardGrid: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.boardEdge,
    // Recessed playfield: a dark rim tight against the squares reads as the
    // bezel casting onto the board, which is what stops the grid looking pasted
    // flat onto the frame.
    boxShadow: `inset 0px 2px 6px ${withOpacity(Colors.bgBase, 0.6)}, 0px 1px 0px ${withOpacity(Colors.chrome, 0.45)}`,
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastMoveTint: {
    backgroundColor: withOpacity(Colors.gold, 0.35),
  },
  selectedTint: {
    backgroundColor: withOpacity(Colors.cyan, 0.4),
  },
  checkTint: {
    backgroundColor: withOpacity(Colors.crimson, 0.55),
  },
  rankLabel: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 9,
    fontWeight: '700',
  },
  fileLabel: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontSize: 9,
    fontWeight: '700',
  },
  // Ringed rather than a plain dot so it stays readable on the near-white
  // light squares as well as the slate dark ones.
  moveDot: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: withOpacity(Colors.cyan, 0.8),
    borderWidth: 1,
    borderColor: withOpacity(Colors.boardEdge, 0.55),
    boxShadow: `0px 0px 7px ${withOpacity(Colors.cyan, 0.7)}`,
  },
  captureRing: {
    position: 'absolute',
    width: '88%',
    height: '88%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: withOpacity(Colors.cyan, 0.75),
  },
  shadowPool: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.bgBase, 0.16),
    boxShadow: `-2px 3px 10px ${withOpacity(Colors.bgBase, 0.3)}`,
  },
  shadowCore: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.bgBase, 0.34),
    boxShadow: `-1px 1px 4px ${withOpacity(Colors.bgBase, 0.45)}`,
  },
  dragGhost: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
});
