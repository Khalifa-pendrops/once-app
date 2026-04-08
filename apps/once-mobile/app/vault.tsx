import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  StyleSheet,
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
const TERMINAL_AMBER = '#F6C177';
const TERMINAL_AMBER_SOFT = 'rgba(246, 193, 119, 0.14)';
const TERMINAL_CYAN = '#67E8F9';

export default function VaultAuth() {
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);
  const setPublicKey = useAuthStore(state => state.setPublicKey);
  
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
        
        // Save the token silently to SecureStorage so apiClient interceptor can use it 
        // for the subsequent authenticated device calls, BEFORE we trigger app navigation via setAuth.
        await StorageService.setItem(KEYS.AUTH_TOKEN, result.token);
        
        const publicKey = await StorageService.getItem(KEYS.IDENTITY_PUBLIC_KEY);
        if (!publicKey) {
          throw new Error('Identity keys missing. Please reinstall the app to repeat the ritual.');
        }

        // Register this device's installation
        const deviceResult = await authApi.registerDevice(Platform.OS + ' ' + Platform.Version);
        
        // Upload the new identity public key
        await authApi.registerKey({
          deviceId: deviceResult.deviceId,
          keyType: 'x25519',
          publicKey
        });

        // Finally, commit to the global store which fires navigation
        setPublicKey(publicKey);
        await setAuth(result.token, result.userId, deviceResult.deviceId);
        router.replace('/(tabs)' as any);
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
        setPublicKey(publicKey);
        await setAuth(loginResult.token, loginResult.userId, registerResult.deviceId);
        router.replace('/(tabs)' as any);
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
          <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mb-2">
            {isLogin ? 'secure://vault-auth' : 'secure://identity-forge'}
          </StyledText>
          <StyledText
            className="text-4xl font-bold mb-2 tracking-tighter"
            style={styles.heroTitle}
          >
            {isLogin ? 'Unlock Vault' : 'Forge Access'}
          </StyledText>
          <StyledText className="text-muted mb-5 font-mono text-xs uppercase tracking-[2px]">
            {isLogin ? 'Enter your credentials to proceed.' : 'Establish your identity on the server.'}
          </StyledText>
          <StyledText className="font-mono text-[10px] uppercase tracking-[2px] mb-10" style={styles.statusText}>
            {isLogin ? '> biometric channel armed // awaiting operator credentials' : '> identity forge open // registration node standing by'}
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
            className="mt-12"
            style={[
              styles.ctaShell,
              isLoading ? styles.ctaShellDisabled : null,
            ]}
          >
            <StyledView style={styles.ctaScanlineTop} />
            <StyledView style={styles.ctaScanlineBottom} />
            <StyledView style={styles.ctaNotchLeft} />
            <StyledView style={styles.ctaNotchRight} />
            <StyledView className="items-center justify-center flex-row px-5 py-4">
              {isLoading ? (
                <ActivityIndicator color={TERMINAL_AMBER} />
              ) : (
                <>
                  <StyledText className="font-mono text-[10px] uppercase mr-3" style={styles.ctaPrefix}>
                    {isLogin ? '[root]' : '[forge]'}
                  </StyledText>
                  <StyledText className="font-mono text-sm uppercase tracking-[4px]" style={styles.ctaLabel}>
                    {isLogin ? 'Unlock Vault' : 'Register Node'}
                  </StyledText>
                </>
              )}
            </StyledView>
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
  ctaShellDisabled: {
    opacity: 0.72,
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
