import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useDecryptionGuard } from '../../hooks/useDecryptionGuard';
import { COLORS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const StyledMotiView = MotiView as any;
const TERMINAL_AMBER = '#F6C177';
const TERMINAL_AMBER_SOFT = 'rgba(246, 193, 119, 0.14)';
const TERMINAL_CYAN = '#67E8F9';

export function DecryptionGuard({ children }: { children: React.ReactNode }) {
  const { unlock, isUnlocked } = useDecryptionGuard();

  return (
    <StyledView className="flex-1 bg-background">
      {/* 
        SCREEN CONTENT: 
        When the vault is sealed, we explicitly disable pointer events 
        for everything in the background.
      */}
      <StyledView 
        style={{ flex: 1 }} 
        pointerEvents={isUnlocked ? "auto" : "none"}
      >
        {children}
      </StyledView>
      
      <AnimatePresence>
        {!isUnlocked && (
          <StyledMotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            pointerEvents="auto"
            style={[
              StyleSheet.absoluteFillObject,
              { 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                alignItems: 'center', 
                justifyContent: 'center',
                paddingBottom: 100, 
                zIndex: 10000,
              }
            ]}
          >
            <StyledView className="items-center px-10">
              <Ionicons name="shield-checkmark-outline" size={80} color={COLORS.primary} />
              
              <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mt-8">
                secure://sealed-vault
              </StyledText>

              <StyledText className="text-3xl font-bold mt-4 text-center tracking-tighter" style={styles.heroTitle}>
                The Vault is Sealed
              </StyledText>
              
              <StyledText className="text-muted text-center mt-4 mb-5 font-mono text-xs uppercase tracking-[2px]">
                Biometric verification required to access and decrypt your secret conversations.
              </StyledText>
              <StyledText className="font-mono text-[10px] uppercase tracking-[2px] text-center mb-10" style={styles.statusText}>
                {`> cipher shield active // awaiting biometric handshake`}
              </StyledText>

              <StyledTouchableOpacity
                onPress={unlock}
                activeOpacity={0.8}
                style={styles.ctaShell}
              >
                <StyledView style={styles.ctaScanlineTop} />
                <StyledView style={styles.ctaScanlineBottom} />
                <StyledView style={styles.ctaNotchLeft} />
                <StyledView style={styles.ctaNotchRight} />
                <StyledView className="items-center justify-center flex-row px-5 py-4">
                  <StyledText className="font-mono text-[10px] uppercase mr-3" style={styles.ctaPrefix}>
                    [biometric]
                  </StyledText>
                  <StyledText className="font-mono text-sm uppercase tracking-[4px]" style={styles.ctaLabel}>
                    Unlock Vault
                  </StyledText>
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledMotiView>
        )}
      </AnimatePresence>
    </StyledView>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    color: TERMINAL_AMBER,
    textShadowColor: 'rgba(246, 193, 119, 0.22)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  statusText: {
    color: '#8B8B8B',
  },
  ctaShell: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.48)',
    borderRadius: 4,
    backgroundColor: '#050505',
    shadowColor: TERMINAL_AMBER,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  ctaPrefix: {
    color: TERMINAL_CYAN,
  },
  ctaLabel: {
    color: TERMINAL_AMBER,
  },
  ctaScanlineTop: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(246, 193, 119, 0.65)',
  },
  ctaScanlineBottom: {
    position: 'absolute',
    bottom: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: TERMINAL_AMBER_SOFT,
  },
  ctaNotchLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: TERMINAL_CYAN,
  },
  ctaNotchRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: TERMINAL_CYAN,
  },
});
