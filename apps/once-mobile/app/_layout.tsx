import "react-native-get-random-values";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { StorageService, KEYS } from '../src/services/storage/secureStorage';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const StyledView = View as any;
const StyledText = Text as any;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function checkKeys() {
      console.log("[Layout] Checking identity keys...");
      try {
        const key = await StorageService.getItem(KEYS.IDENTITY_PRIVATE_KEY);
        setHasKeys(!!key);
      } catch (e) {
        console.error("[Layout] Key check failed:", e);
      } finally {
        setIsAuthLoaded(true);
      }
    }
    checkKeys();
    
    // Safety timeout: if keys check takes > 3s, just proceed to show UI
    const timer = setTimeout(() => {
       if (!isAuthLoaded) {
         console.log("[Layout] Auth check took too long, proceeding anyway");
         setIsAuthLoaded(true);
       }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded && isAuthLoaded) {
      console.log("[Layout] Assets ready, hiding splash");
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthLoaded]);

  useEffect(() => {
    if (!isAuthLoaded) return;

    const currentSegment = segments[0] as string;
    const inAuthGroup = currentSegment === 'ritual';

    console.log("[Layout] Auth State:", { hasKeys, currentSegment, inAuthGroup });

    if (!hasKeys && !inAuthGroup) {
      console.log("[Layout] Redirecting to /ritual");
      router.replace('/ritual');
    } else if (hasKeys && inAuthGroup) {
      console.log("[Layout] Redirecting to /(tabs)");
      router.replace('/(tabs)');
    }
  }, [hasKeys, isAuthLoaded, segments]);

  if (!loaded || !isAuthLoaded) {
    return (
      <StyledView style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 12 }}>Loading Once...</Text>
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
