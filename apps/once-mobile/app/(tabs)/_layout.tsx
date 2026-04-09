import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/theme';
import { DecryptionGuard } from '../../src/components/auth/DecryptionGuard';
import { useAuthStore } from '../../src/store/authStore';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;

const TERMINAL_AMBER = '#F6C177';
const TERMINAL_CYAN = '#67E8F9';
const TERMINAL_MUTED = '#737373';
const { width: WINDOW_WIDTH } = Dimensions.get('window');

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isUnlocked = useAuthStore(state => state.isUnlocked);

  const isVault = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  const isStats = pathname === '/stats' || pathname === '/(tabs)/stats';

  return (
    <StyledView style={styles.shell}>
      <DecryptionGuard>
        <StyledView style={styles.content}>
          <Slot />
        </StyledView>
      </DecryptionGuard>

      <StyledView 
        style={[
          styles.bottomNavContainer, 
          { bottom: Math.max(insets.bottom, 20) + 40, opacity: isUnlocked ? 1 : 0.4 }
        ]} 
        pointerEvents={isUnlocked ? "box-none" : "none"}
      >
        <StyledView style={styles.navBar}>
          <StyledTouchableOpacity
            activeOpacity={0.7}
            disabled={!isUnlocked}
            onPress={() => router.replace('/(tabs)' as any)}
            style={[styles.navButton, isVault ? styles.navButtonVaultActive : null]}
          >
            <Ionicons
              name={isVault ? 'grid' : 'grid-outline'}
              size={22}
              color={isVault ? TERMINAL_AMBER : TERMINAL_MUTED}
            />
            <StyledText style={[styles.navLabel, isVault ? styles.navLabelActive : null]}>
              Vault
            </StyledText>
          </StyledTouchableOpacity>

          <StyledTouchableOpacity
            activeOpacity={0.7}
            disabled={!isUnlocked}
            onPress={() => router.replace('/(tabs)/stats' as any)}
            style={[styles.navButton, isStats ? styles.navButtonStatsActive : null]}
          >
            <Ionicons
              name={isStats ? 'stats-chart' : 'stats-chart-outline'}
              size={22}
              color={isStats ? TERMINAL_CYAN : TERMINAL_MUTED}
            />
            <StyledText style={[styles.navLabel, isStats ? styles.navLabelActive : null]}>
              Stats
            </StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40000, 
    elevation: 40,
  },
  navBar: {
    flexDirection: 'row',
    width: 320,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  navButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  navButtonVaultActive: {
    borderColor: 'rgba(246, 193, 119, 0.3)',
    backgroundColor: 'rgba(246, 193, 119, 0.05)',
  },
  navButtonStatsActive: {
    borderColor: 'rgba(103, 232, 249, 0.3)',
    backgroundColor: 'rgba(103, 232, 249, 0.05)',
  },
  navLabel: {
    marginTop: 4,
    color: TERMINAL_MUTED,
    fontFamily: 'SpaceMono',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  navLabelActive: {
    color: TERMINAL_AMBER,
  },
  navLabelStatsActive: {
    color: TERMINAL_CYAN,
  },
});
