import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { Colors, withOpacity } from '@/constants/theme';

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

// Flat, chess.com-style piece silhouettes instead of Unicode chess glyphs --
// consistent rendering across devices and closer to the reference look.
const PIECE_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  k: 'chess-king',
  q: 'chess-queen',
  r: 'chess-rook',
  b: 'chess-bishop',
  n: 'chess-knight',
  p: 'chess-pawn',
};

// How far the rim glyph is scaled past the body glyph. The rim sits *behind*
// the body, so the overhang is what you actually see: a gold trim outline on
// the black set and cool chrome shading on the white set, matching the
// ornate, gold-filigreed pieces in the reference screenshot.
const RIM_SCALE = 1.09;

// Where the top-down specular gloss finishes fading out, as a fraction of the
// glyph height. Keeping it high on the piece is what makes the crown/cross
// caps read as polished gold (black set) or pearl (white set).
const GLOSS_END_Y = 0.44;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

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
  /** Omit to keep the board read-only/static, e.g. Front Row's spectate view. */
  onSquarePress?: (square: string) => void;
}

export function ChessBoard({
  style,
  board = STARTING_BOARD,
  selectedSquare = null,
  legalTargets = [],
  checkSquare = null,
  lastMove = null,
  turn,
  onSquarePress,
}: ChessBoardProps) {
  const [gridSize, setGridSize] = useState(0);
  const [dragging, setDragging] = useState<DraggingPiece | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const squareSize = gridSize / 8;
  const interactive = Boolean(onSquarePress);

  function handleGridLayout(event: LayoutChangeEvent) {
    setGridSize(event.nativeEvent.layout.width);
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
        <GlowRing />

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

          <View style={styles.gridWrapper}>
            <View style={styles.boardGrid} onLayout={handleGridLayout}>
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
                        isLight={isLight}
                        isWhitePiece={isWhitePiece}
                        isSelected={square === selectedSquare}
                        isLegalTarget={legalTargets.includes(square)}
                        isCapture={legalTargets.includes(square) && piece !== ''}
                        isCheck={square === checkSquare}
                        isLastMove={lastMove !== null && (square === lastMove.from || square === lastMove.to)}
                        isBeingDragged={dragging?.square === square}
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

            {/* Single diagonal sheen across the whole playfield -- one gradient
                instead of 64, so the board picks up the same "under glass"
                lighting as the reference without a per-square cost. */}
            <LinearGradient
              pointerEvents="none"
              colors={[
                withOpacity(Colors.chrome, 0.16),
                withOpacity(Colors.chrome, 0),
                withOpacity(Colors.bgBase, 0.14),
              ]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.boardSheen}
            />

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
        </LinearGradient>
      </View>
    </View>
  );
}

// Cross-platform outer glow. React Native's colored `boxShadow` is unreliable
// on Android, so the cyan halo in the reference is built as three concentric
// rounded layers behind the frame with falling opacity -- a real layered glow
// that renders identically on both platforms.
function GlowRing() {
  return (
    <>
      <View style={[styles.glowLayer, styles.glowOuter]} />
      <View style={[styles.glowLayer, styles.glowMid]} />
      <View style={[styles.glowLayer, styles.glowInner]} />
    </>
  );
}

interface SquareProps {
  square: string;
  piece: string;
  isLight: boolean;
  isWhitePiece: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isCapture: boolean;
  isCheck: boolean;
  isLastMove: boolean;
  isBeingDragged: boolean;
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
  isLight,
  isWhitePiece,
  isSelected,
  isLegalTarget,
  isCapture,
  isCheck,
  isLastMove,
  isBeingDragged,
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
          { backgroundColor: isLight ? Colors.boardLight : Colors.boardDark },
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

        {piece && !isBeingDragged ? (
          <PieceGlyph piece={piece} size={squareSize * 0.92} isWhitePiece={isWhitePiece} />
        ) : null}

        {isCapture ? <View style={styles.captureRing} /> : null}
        {isLegalTarget && !isCapture ? <View style={styles.moveDot} /> : null}
      </View>
    </GestureDetector>
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
  const isWhitePiece = piece === piece.toUpperCase();
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
      <PieceGlyph piece={piece} size={squareSize * 0.92} isWhitePiece={isWhitePiece} />
    </Animated.View>
  );
}

// Turns the flat icon glyphs into sculpted, ornate pieces like the reference
// screenshot. Four stacked layers, back to front:
//
//   1. Contact shadow -- a soft dark ellipse at the base, so the piece sits ON
//      the square instead of floating above it.
//   2. Shape drop shadow -- a copy of the same glyph, dark + offset down-right.
//      Follows the piece silhouette exactly, unlike a boxShadow (a rectangle).
//   3. Rim -- the same glyph scaled up behind the body. The overhang is the
//      visible result: gold trim on the black set (matching the gold filigree
//      and crowns in the reference) and cool chrome shading on the white set.
//   4. Body + gloss -- one MaskedView clips both a diagonal body gradient and a
//      top-down specular highlight to the glyph's alpha shape. Kept to a single
//      MaskedView per piece because masking is the expensive layer on Android.
function PieceGlyph({ piece, size, isWhitePiece }: { piece: string; size: number; isWhitePiece: boolean }) {
  const iconName = PIECE_ICON[piece.toLowerCase()];

  const bodyColors = isWhitePiece
    ? ([Colors.pieceWhiteHi, Colors.pieceWhiteMid, Colors.pieceWhiteLo] as const)
    : ([Colors.pieceBlackHi, Colors.pieceBlackMid, Colors.pieceBlackLo] as const);
  const rimColor = isWhitePiece ? withOpacity(Colors.chromeDark, 0.9) : Colors.gold;
  const glossColors = isWhitePiece
    ? ([withOpacity(Colors.chrome, 0.9), withOpacity(Colors.chrome, 0)] as const)
    : ([withOpacity(Colors.gold, 0.95), withOpacity(Colors.gold, 0)] as const);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.contactShadow,
          { width: size * 0.6, height: size * 0.13, left: size * 0.2, top: size * 0.78 },
        ]}
      />

      <MaterialCommunityIcons
        name={iconName}
        size={size}
        color={withOpacity(Colors.bgBase, 0.5)}
        style={[styles.pieceLayer, styles.pieceDropShadow]}
      />

      <MaterialCommunityIcons
        name={iconName}
        size={size}
        color={rimColor}
        style={[styles.pieceLayer, { transform: [{ scale: RIM_SCALE }] }]}
      />

      <MaskedView
        style={{ width: size, height: size }}
        maskElement={<MaterialCommunityIcons name={iconName} size={size} color={Colors.bgBase} />}
      >
        <LinearGradient
          colors={bodyColors}
          locations={[0, 0.52, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={{ width: size, height: size }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={glossColors}
          start={{ x: 0.35, y: 0 }}
          end={{ x: 0.5, y: GLOSS_END_Y }}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
    </View>
  );
}

function Rivet({ style }: { style: object }) {
  return <View style={[styles.rivet, style]} />;
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
  glowOuter: {
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 28,
    borderColor: withOpacity(Colors.cyan, 0.08),
    backgroundColor: withOpacity(Colors.cyan, 0.05),
  },
  glowMid: {
    top: -7,
    left: -7,
    right: -7,
    bottom: -7,
    borderRadius: 23,
    borderColor: withOpacity(Colors.cyan, 0.18),
    backgroundColor: withOpacity(Colors.cyan, 0.09),
  },
  glowInner: {
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 19,
    borderColor: withOpacity(Colors.cyan, 0.4),
    backgroundColor: withOpacity(Colors.cyan, 0.16),
  },
  rivet: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.chrome,
    boxShadow: `1px 1px 2px ${withOpacity(Colors.bgBase, 0.5)}`,
    zIndex: 1,
  },
  gridWrapper: {
    flex: 1,
    position: 'relative',
  },
  boardGrid: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.boardEdge,
  },
  boardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  boardRow: {
    flex: 1,
    flexDirection: 'row',
  },
  square: {
    flex: 1,
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
  pieceLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  pieceDropShadow: {
    top: 3,
    left: 2,
  },
  contactShadow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: withOpacity(Colors.bgBase, 0.35),
    boxShadow: `0px 1px 4px ${withOpacity(Colors.bgBase, 0.45)}`,
  },
  dragGhost: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
});
