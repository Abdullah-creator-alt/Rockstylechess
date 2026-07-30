import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmberParticles, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';

// Both are real, currently-live Stitch-generated preview assets
// (lh3.googleusercontent.com/aida-public/...), verified resolvable. No
// permanence guarantee documented -- swap for bundled assets if either 404s.
const ARENA_BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAGIGwmccIYbieQB-NyH-5DU9wLO7hlo7JSm2EcZhl48jvibUzdkUTHjW-mtjtPTHph6GBFeqercalP2REznRsxHkA7kHho1f4D3rMX0bqst2C36KQ7smWrtE61UcurAqC2iSktusZtchsCgsNbuSWf0dRyLu4e6cHH2P7Td7wIc8EEV3snI0lRCMV9cCZXQlnJ7jJxDbrSBLNmYJEpvEp1ajCmplNidoqs-ReMZz-PSfKNFiNIwDS3tR3NZCSxLrS2vpzOmr6nj88';
const CHIPS_DECOR_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBXlmuZBB98efACtx01oF7E3Iq1MKYHgGNqOcZO6S_AQg4OKPVow2up3k5Q8Gn2NcgVsBW9rx4JO-mvGb3orD-xNLJUdav1SyQXfiRKJZeQiwJ0y0kDQ2I3rSlA-qxbpUdBiXiFhiHo1K0gV_0bIpPFXiS3Vc-sSUXGeAbvKk6RctQBCRH8-vLN5QHoBNoS9aWTmZdcsdF0djrVNlwFt1kyxhxX8O755u8re_KBiXhokrCG1VTBWTucHuVXTAOxkSvkq4nHsqcz6f8';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: ARENA_BACKGROUND_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={300}
        style={styles.backgroundImage}
      />
      {/* Matches the source's `bg-gradient-to-t from-base-black
          via-transparent to-base-black/40` -- dark at the very top and
          bottom edges, clearer in the middle where the form panel sits. */}
      <LinearGradient
        pointerEvents="none"
        colors={[Colors.bgBase, withOpacity(Colors.bgBase, 0), withOpacity(Colors.bgBase, 0.4)]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.backgroundImage}
      />
      <Image
        source={{ uri: CHIPS_DECOR_URI }}
        contentFit="contain"
        cachePolicy="memory-disk"
        style={styles.chipsDecor}
      />
      <EmberParticles count={12} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>RockStyle Chess</Text>
            <Text style={styles.brandTagline}>Join the Arena</Text>
          </View>

          <RockCard glowColor={Colors.emberLight} style={styles.formCard}>
            <Text style={styles.formHeading}>Enter the Game. Rule the Table.</Text>

            <AuthInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <AuthInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <View style={styles.submitButton}>
              <RockButton
                label="Create An Account"
                variant="primary"
                onPress={() => {
                  console.log('Create account', { email, password, confirmPassword });
                  router.replace('/pick-rockstar');
                }}
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Already have account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton icon="google" onPress={() => console.log('Continue with Google')} />
              <SocialButton icon="facebook" onPress={() => console.log('Continue with Facebook')} />
              <SocialButton icon="apple" onPress={() => console.log('Continue with Apple')} />
            </View>
          </RockCard>

          <RockCard glowColor={Colors.gold} style={styles.bonusCard}>
            <View style={styles.bonusRow}>
              <MaterialCommunityIcons name="treasure-chest" size={40} color={Colors.gold} />
              <View>
                <Text style={styles.bonusLabel}>Welcome Bonus:</Text>
                <Text style={styles.bonusValue}>10M Chips</Text>
              </View>
            </View>
          </RockCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface AuthInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}

function AuthInput({ placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize }: AuthInputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  );
}

function SocialButton({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.socialButton, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={Colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  flex: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  chipsDecor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '33%',
    height: 240,
    opacity: 0.4,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingVertical: Spacing.xl * 2,
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.cyan,
    textShadowColor: withOpacity(Colors.cyan, 0.6),
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
    letterSpacing: 1,
  },
  brandTagline: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.emberLight,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
  },
  formHeading: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  input: {
    height: 52,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: withOpacity(Colors.chromeDark, 0.4),
    backgroundColor: withOpacity(Colors.bgBase, 0.5),
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: withOpacity(Colors.chromeDark, 0.4),
  },
  dividerLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: Spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(Colors.chrome, 0.08),
    borderWidth: 1,
    borderColor: withOpacity(Colors.chromeDark, 0.5),
  },
  bonusCard: {
    width: '100%',
    maxWidth: 440,
    marginTop: Spacing.lg,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  bonusLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.emberLight,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  bonusValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.gold,
    textShadowColor: withOpacity(Colors.gold, 0.5),
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
});
