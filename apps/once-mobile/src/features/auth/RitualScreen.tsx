import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { CryptoService } from '../../services/crypto/cryptoService';
import { StorageService } from '../../services/storage/secureStorage';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function RitualScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('Gathering Entropy...');

  const startRitual = async () => {
    setIsGenerating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Simulate entropy gathering "ritual"
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i / 100);
      if (i === 40) setStatus('Forging Identity...');
      if (i === 80) setStatus('Sealing Vault...');
      
      // Every 10% give a subtle haptic "tick"
      if (i % 10 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const keys = CryptoService.generateKeyPair();
      await StorageService.saveIdentityKeys(keys.privateKey, keys.publicKey);
      
      setStatus('Identity Sealed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    } catch (err) {
      setStatus('Ritual Failed. Retry.');
      setIsGenerating(false);
    }
  };

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <MotiView 
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 1000 }}
        className="items-center"
      >
        <Text className="text-primary text-3xl font-bold mb-2 tracking-widest uppercase">
          The Ritual
        </Text>
        <Text className="text-muted text-center mb-12">
          Hold the crest to generate your unique identity keys. This never leaves your device.
        </Text>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPressIn={() => !isGenerating && startRitual()}
          disabled={isGenerating}
          className="relative items-center justify-center"
        >
          {/* Progress Ring / Circle */}
          <MotiView
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
          
          <View className="absolute items-center justify-center">
             <Text className="text-primary text-4xl">◎</Text>
          </View>
        </TouchableOpacity>

        <MotiText 
          animate={{ opacity: isGenerating ? 1 : 0.5 }}
          className="text-safety mt-12 font-mono"
        >
          {status}
        </MotiText>

        {isGenerating && (
          <View className="mt-4 w-64 h-1 bg-surface rounded-full overflow-hidden">
             <MotiView 
               animate={{ width: `${progress * 100}%` }}
               className="h-full bg-safety"
             />
          </View>
        )}
      </MotiView>
    </View>
  );
}
