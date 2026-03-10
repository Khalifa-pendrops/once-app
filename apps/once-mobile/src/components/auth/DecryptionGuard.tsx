import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useDecryptionGuard } from '../../hooks/useDecryptionGuard';
import { COLORS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const StyledMotiView = MotiView as any;

export function DecryptionGuard({ children }: { children: React.ReactNode }) {
  const { unlock, isUnlocked } = useDecryptionGuard();

  return (
    <StyledView className="flex-1 bg-background">
      {children}
      
      <AnimatePresence>
        {!isUnlocked && (
          <StyledMotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          >
            {/* Blur effect would go here if supported/packaged, for now high-opacity black */}
            <StyledView className="items-center px-10">
              <Ionicons name="shield-checkmark-outline" size={80} color={COLORS.primary} />
              
              <StyledText className="text-white text-3xl font-bold mt-8 text-center tracking-tighter">
                The Vault is Sealed
              </StyledText>
              
              <StyledText className="text-muted text-center mt-4 mb-12">
                Biometric verification required to access and decrypt your secret conversations.
              </StyledText>

              <StyledTouchableOpacity
                onPress={unlock}
                activeOpacity={0.8}
                className="bg-primary rounded-full px-12 py-4 items-center justify-center"
              >
                <StyledText className="text-background font-bold text-lg">
                  UNLOCK VAULT
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledMotiView>
        )}
      </AnimatePresence>
    </StyledView>
  );
}
