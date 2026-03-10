import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { authApi } from '../src/api/auth';
import { useAuthStore } from '../src/store/authStore';
import { StorageService, KEYS } from '../src/services/storage/secureStorage';
import { COLORS } from '../src/constants/theme';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const StyledMotiView = MotiView as any;
const StyledTextInput = TextInput as any;
const StyledKeyboardAvoidingView = KeyboardAvoidingView as any;

const { width } = Dimensions.get('window');

export default function VaultAuth() {
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Credentials required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    // @ts-ignore
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isLogin) {
        const result = await authApi.login({ email, password });
        await setAuth(result.token, result.userId);
        router.replace('/(tabs)');
      } else {
        // Registration Flow
        const publicKey = await StorageService.getItem(KEYS.IDENTITY_PUBLIC_KEY);
        
        if (!publicKey) {
          throw new Error('Identity keys missing. Please repeat the ritual.');
        }

        const registerResult = await authApi.register({
          email,
          password,
          deviceName: Platform.OS + ' ' + Platform.Version,
          keyType: 'x25519',
          publicKey
        });

        // After registration, server usually requires login or returns token
        const loginResult = await authApi.login({ email, password });
        await setAuth(loginResult.token, loginResult.userId, registerResult.deviceId);
        router.replace('/(tabs)');
      }
      
      // @ts-ignore
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Vault access denied.');
      // @ts-ignore
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledKeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <StyledView className="flex-1 items-center justify-center px-10">
        <StyledMotiView 
          from={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'timing', duration: 800 }}
          className="w-full"
        >
          <StyledText className="text-primary text-4xl font-bold mb-2 tracking-tighter">
            {isLogin ? 'Unlock Vault' : 'Forge Access'}
          </StyledText>
          <StyledText className="text-muted mb-12">
            {isLogin ? 'Enter your credentials to proceed.' : 'Establish your identity on the server.'}
          </StyledText>

          <StyledView className="space-y-4">
            <StyledView className="bg-surface border border-border rounded-xl px-4 py-3">
              <StyledTextInput
                placeholder="Email Address"
                placeholderTextColor={COLORS.muted}
                className="text-white"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </StyledView>

            <StyledView className="bg-surface border border-border rounded-xl px-4 py-3 mt-4">
              <StyledTextInput
                placeholder="Password"
                placeholderTextColor={COLORS.muted}
                className="text-white"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </StyledView>
          </StyledView>

          {error && (
            <StyledMotiView 
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <StyledText className="text-burn text-center font-mono text-xs uppercase tracking-widest">
                {error}
              </StyledText>
            </StyledMotiView>
          )}

          <StyledTouchableOpacity 
            onPress={handleAuth}
            disabled={isLoading}
            activeOpacity={0.8}
            className="bg-primary rounded-full py-4 mt-12 items-center justify-center flex-row"
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <StyledText className="text-background font-bold text-lg">
                {isLogin ? 'UNLOCK' : 'REGISTER'}
              </StyledText>
            )}
          </StyledTouchableOpacity>

          <StyledTouchableOpacity 
            onPress={() => setIsLogin(!isLogin)}
            className="mt-8 items-center"
          >
            <StyledText className="text-muted">
              {isLogin ? "Don't have an account? " : "Already established? "}
              <StyledText className="text-primary font-bold">
                {isLogin ? 'Forge New' : 'Authenticate'}
              </StyledText>
            </StyledText>
          </StyledTouchableOpacity>
        </StyledMotiView>
      </StyledView>
    </StyledKeyboardAvoidingView>
  );
}
