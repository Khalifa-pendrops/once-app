import "react-native-get-random-values";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View, Text } from 'react-native';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { StorageService, KEYS } from '../src/services/storage/secureStorage';
import { useAuthStore } from '../src/store/authStore';
import { wsClient } from '../src/services/ws/wsClient';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const StyledView = View as any;
const StyledText = Text as any;
const TERMINAL_AMBER = '#F6C177';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { isAuthenticated, hasIdentityKeys, initialize } = useAuthStore();
  const [isAuthRestored, setIsAuthRestored] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // 1. WebSocket Lifecycle
  useEffect(() => {
    if (isAuthenticated) {
      console.log("[Layout] Authenticated. Activating relay...");
      wsClient.connect();
    } else {
      wsClient.disconnect();
    }
  }, [isAuthenticated]);

  // 2. Restore Auth & Identity Session
  useEffect(() => {
    async function restore() {
      console.log("[Layout] Restoring Secure Store states...");
      await initialize();
      setIsAuthRestored(true);
    }
    restore();
  }, []);

  // 2. Hide Splash
  useEffect(() => {
    if (loaded && isAuthRestored) {
      console.log("[Layout] Assets & State ready, hiding splash");
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthRestored]);

  // 3. Redirection Logic
  useEffect(() => {
    if (!isAuthRestored) return;

    const currentSegment = segments[0] as string;
    const inRitual = currentSegment === 'ritual';
    const inVault = currentSegment === 'vault';
    const inTabs = currentSegment === '(tabs)';

    console.log("[Layout] Flow State:", { hasIdentityKeys, isAuthenticated, currentSegment });

    if (!hasIdentityKeys) {
      // Step 1: No identity? Must perform the Ritual.
      if (!inRitual) router.replace('/ritual' as any);
    } else if (!isAuthenticated) {
      // Step 2: Have identity but not logged in? Must enter the Vault.
      if (!inVault) router.replace('/vault' as any);
    } else {
      // Step 3: Authenticated? Go to Main Tabs if we are on auth screens
      if (inRitual || inVault) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [hasIdentityKeys, isAuthenticated, isAuthRestored, segments]);

  if (!loaded || !isAuthRestored) {
    return (
      <StyledView style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <StyledText style={{ color: '#737373', fontSize: 10, opacity: 0.9, fontFamily: 'SpaceMono', letterSpacing: 2, textTransform: 'uppercase' }}>
          secure://boot-sequence
        </StyledText>
        <StyledText style={{ color: TERMINAL_AMBER, fontSize: 13, marginTop: 10, fontFamily: 'SpaceMono', letterSpacing: 1, textTransform: 'uppercase' }}>
          Loading Secure Environment
        </StyledText>
      </StyledView>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="ritual" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="vault" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
