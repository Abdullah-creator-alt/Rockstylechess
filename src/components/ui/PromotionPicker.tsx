import { Image } from 'expo-image';
import { Modal, Pressable, Text, View } from 'react-native';

import { Colors, Fonts, Spacing, withOpacity } from '@/constants/theme';

import type { PieceSpriteMap } from './pieceSprites';

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

// Queen first -- it's the pick ~95% of the time, so it sits under the thumb.
const CHOICES: PromotionPiece[] = ['q', 'r', 'b', 'n'];
const LABEL: Record<PromotionPiece, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };

interface PromotionPickerProps {
  /** The promoting side -- picks which colour sprite to show. */
  color: 'w' | 'b';
  /** The player's equipped piece set (same map ChessBoard renders from). */
  pieceSprites: PieceSpriteMap;
  onPick: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

/**
 * Shown by match.tsx / puzzle-match.tsx while useChessGame holds a
 * `pendingPromotion`. Centered card over a dimmed backdrop (tap outside =
 * cancel), four piece choices rendered with the live cosmetic sprites.
 */
export function PromotionPicker({ color, pieceSprites, onPick, onCancel }: PromotionPickerProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Spacing.lg,
          backgroundColor: withOpacity(Colors.bgBase, 0.82),
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 360,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: withOpacity(Colors.cyan, 0.3),
            backgroundColor: Colors.bgPanel,
            padding: Spacing.lg,
            gap: Spacing.md,
            boxShadow: `0px 10px 25px ${withOpacity(Colors.cyan, 0.3)}`,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              fontFamily: Fonts.heading,
              fontSize: 14,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: Colors.textMuted,
            }}
          >
            Promote to
          </Text>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {CHOICES.map((piece) => {
              const sprite = pieceSprites[color + piece];
              return (
                <Pressable
                  key={piece}
                  onPress={() => onPick(piece)}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: withOpacity(Colors.chromeDark, 0.5),
                    backgroundColor: withOpacity(Colors.bgBase, 0.5),
                  }}
                >
                  {sprite ? (
                    <Image source={sprite} contentFit="contain" cachePolicy="memory-disk" style={{ width: '78%', height: '78%' }} />
                  ) : (
                    <Text style={{ fontFamily: Fonts.display, fontSize: 20, color: Colors.textPrimary }}>
                      {piece.toUpperCase()}
                    </Text>
                  )}
                  <Text
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      fontFamily: Fonts.body,
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: Colors.textMuted,
                    }}
                  >
                    {LABEL[piece]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onCancel} style={{ alignSelf: 'center', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md }}>
            <Text style={{ fontFamily: Fonts.heading, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: Colors.textMuted }}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
