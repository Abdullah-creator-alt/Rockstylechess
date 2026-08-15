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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmberParticles, RockButton, RockCard } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing, withOpacity } from '@/constants/theme';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { signInWithEmail } from '@/lib/authClient';
import { setAuthToken } from '@/lib/authStorage';
import { reauthenticateSocket } from '@/lib/socket';

// Same real, currently-live Stitch-generated preview asset sign-up.tsx uses
// -- kept consistent since this screen mirrors it visually.
const ARENA_BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAGIGwmccIYbieQB-NyH-5DU9wLO7hlo7JSm2EcZhl48jvibUzdkUTHjW-mtjtPTHph6GBFeqercalP2REznRsxHkA7kHho1f4D3rMX0bqst2C36KQ7smWrtE61UcurAqC2iSktusZtchsCgsNbuSWf0dRyLu4e6cHH2P7Td7wIc8EEV3snI0lRCMV9cCZXQlnJ7jJxDbrSBLNmYJEpvEp1ajCmplNidoqs-ReMZz-PSfKNFiNIwDS3tR3NZCSxLrS2vpzOmr6nj88';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh: refreshPlayerProfile } = usePlayerProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const { token } = await signInWithEmail(email.trim().toLowerCase(), password);
      await setAuthToken(token);
      reauthenticateSocket(token);
      // See sign-up.tsx's identical call -- picks up the now-signed-in
      // account's real balance instead of the initial 'guest' state.
      refreshPlayerProfile();
      router.replace('/home');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: ARENA_BACKGROUND_URI }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={300}
        style={styles.backgroundImage}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[Colors.bgBase, withOpacity(Colors.bgBase, 0), withOpacity(Colors.bgBase, 0.4)]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.backgroundImage}
      />
      <EmberParticles count={12} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Spacing.xl * 2 + insets.top, paddingBottom: Spacing.xl * 2 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>RockStyle Chess</Text>
            <Text style={styles.brandTagline}>Welcome Back</Text>
          </View>

          <RockCard glowColor={Colors.cyan} style={styles.formCard}>
            <Text style={styles.formHeading}>Sign back in to the Arena</Text>

            <AuthInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.submitButton}>
              <RockButton
                label={isSubmitting ? 'Signing in...' : 'Sign In'}
                variant="primary"
                disabled={isSubmitting}
                onPress={handleSignIn}
              />
            </View>

            <Pressable onPress={() => router.push('/sign-up')} style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Need an account?</Text>
              <View style={styles.dividerLine} />
            </Pressable>

            <View style={styles.socialRow}>
              <SocialButton icon="google" onPress={() => console.log('Continue with Google')} />
              <SocialButton icon="facebook" onPress={() => console.log('Continue with Facebook')} />
              <SocialButton icon="apple" onPress={() => console.log('Continue with Apple')} />
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
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.crimson,
    textAlign: 'center',
    marginBottom: Spacing.sm,
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
});
