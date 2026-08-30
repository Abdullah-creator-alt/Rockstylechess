import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Colors } from '@/constants/theme';

interface SubPageHeaderProps {
  title: string;
  trailing?: ReactNode;
  onBack?: () => void;
}

/** Circular back button + centered title + optional trailing slot, shared across sub-pages. */
export function SubPageHeader({ title, trailing, onBack }: SubPageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    // router.back() throws a GO_BACK navigation warning if this screen is
    // the first entry in the stack (e.g. reloaded/deep-linked straight into
    // a sub-page instead of arriving via a push from Home) -- fall back to
    // Home instead of leaving the back button dead in that case.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  return (
    <View
      className="w-full flex-row items-center justify-between bg-bg-panel px-margin-mobile py-sm"
      style={{
        paddingTop: insets.top + 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.chromeDark + '4D',
      }}
    >
      <Pressable
        onPress={handleBack}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: Colors.bgPanel, borderWidth: 1, borderColor: Colors.chromeDark + '80' }}
      >
        <AppIcon name="arrow_back" size={22} color={Colors.textPrimary} />
      </Pressable>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        className="mx-sm flex-1 text-center font-headline-lg uppercase text-text-primary"
        style={{ fontSize: 22, letterSpacing: 1 }}
      >
        {title}
      </Text>

      {trailing ?? <View style={{ width: 40 }} />}
    </View>
  );
}
