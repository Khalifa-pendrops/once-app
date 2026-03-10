import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { CryptoService } from '../src/services/crypto/cryptoService';
import { StorageService } from '../src/services/storage/secureStorage';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants/theme';

// Explicitly type the components to bypass React 19 JSX conflicts if they persist
const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const StyledMotiView = MotiView as any;
const StyledMotiText = MotiText as any;

const { width } = Dimensions.get('window');

export default function RitualScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Gathering Entropy...');

  const startRitual = async () => {
    setIsGenerating(true);
    // @ts-ignore - expo-haptics types can be stubborn in monorepos
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Simulate entropy gathering "ritual"
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i / 100);
      if (i === 40) setStatus('Forging Identity...');
      if (i === 80) setStatus('Sealing Vault...');
      
      // Every 10% give a subtle haptic "tick"
      if (i % 10 === 0) {
        // @ts-ignore
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      console.log("[Ritual] Generating keys...");
      const keys = CryptoService.generateKeyPair();
      console.log("[Ritual] Saving keys to SecureStore...");
      await StorageService.saveIdentityKeys(keys.privateKey, keys.publicKey);
      
      // Update global store so _layout.tsx reacts immediately
      useAuthStore.getState().setHasIdentityKeys(true);
      
      setStatus('Identity Sealed.');
      console.log("[Ritual] Success. Transitioning to Vault...");
      // @ts-ignore
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        router.replace('/vault' as any);
      }, 1000);
    } catch (err) {
      console.error("[Ritual] Error:", err);
      setStatus('Ritual Failed. Retry.');
      setIsGenerating(false);
    }
  };

  return (
    <StyledView className="flex-1 bg-background items-center justify-center px-8">
      <StyledMotiView 
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 1000 }}
        className="items-center"
      >
        <StyledText className="text-primary text-3xl font-bold mb-2 tracking-widest uppercase">
          The Ritual
        </StyledText>
        <StyledText className="text-muted text-center mb-12">
          Hold the crest to generate your unique identity keys. Don't worry, this never leaves your device.
        </StyledText>

        <StyledTouchableOpacity 
          activeOpacity={0.8}
          onPressIn={() => !isGenerating && startRitual()}
          disabled={isGenerating}
          className="relative items-center justify-center"
        >
          {/* Progress Ring / Circle */}
          <StyledMotiView
            animate={{
               scale: isGenerating ? 1.2 : 1,
               rotate: isGenerating ? '360deg' : '0deg'
            }}
            transition={{ loop: isGenerating, duration: 2000, type: 'timing' }}
            style={{
               width: 150,
               height: 150,
               borderRadius: 75,
               borderWidth: 2,
               borderColor: isGenerating ? COLORS.safety : COLORS.border,
               borderStyle: 'dashed',
            }}
          />
          
          <StyledView className="absolute items-center justify-center">
             <StyledText className="text-primary text-4xl">◎</StyledText>
          </StyledView>
        </StyledTouchableOpacity>

        <StyledMotiText 
          animate={{ opacity: isGenerating ? 1 : 0.5 }}
          className="text-safety mt-12 font-mono"
        >
          {status}
        </StyledMotiText>

        {isGenerating && (
          <StyledView className="mt-4 w-64 h-1 bg-surface rounded-full overflow-hidden">
             <StyledMotiView 
               animate={{ width: `${progress * 100}%` }}
               className="h-full bg-safety"
             />
          </StyledView>
        )}
      </StyledMotiView>
    </StyledView>
  );
}
