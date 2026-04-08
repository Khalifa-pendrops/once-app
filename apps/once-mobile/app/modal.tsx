import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/theme';
import { userApi } from '../src/api/user';
import { keyApi } from '../src/api/keys';
import { useContactStore } from '../src/store/contactStore';
import { contactRequestApi } from '../src/api/contactRequests';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTextInput = TextInput as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const TERMINAL_AMBER = '#F6C177';
const TERMINAL_AMBER_SOFT = 'rgba(246, 193, 119, 0.14)';
const TERMINAL_CYAN = '#67E8F9';

export default function AddContactModal() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addContact, upsertOutgoingRequest } = useContactStore();

  const handleSearchAndAdd = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Input', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // 1. Search for user by email
      const user = await userApi.search(email);
      
      // 2. Fetch their public keys
      const keyData = await keyApi.getContactKeys(user.id);
      
      if (!keyData.keys || keyData.keys.length === 0) {
        Alert.alert('No Keys Found', 'This user has not set up their secure vault yet.');
        return;
      }

      // The backend already sorts active keys by createdAt desc, so use the first one.
      const primaryKey = keyData.keys[0];

      const createdRequest = await contactRequestApi.create(user.id);

      // 3. Add to local store
      await addContact({
        id: user.id,
        email: user.email,
        deviceId: primaryKey.deviceId,
        publicKey: primaryKey.publicKey,
        status: createdRequest.status === 'accepted' ? 'accepted' : 'pending'
      });
      await upsertOutgoingRequest(createdRequest);

      // Navigate back and show success
      router.back();
      // Optional: Trigger a toast or local notification here
      
    } catch (error: any) {
      console.error('Add Contact Error:', error);
      if (error.response?.status === 404) {
        Alert.alert('Not Found', 'No user found with that email.');
      } else {
        Alert.alert('Error', 'Failed to forge connection. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledView className="flex-1 bg-background py-8 px-6">
      <StatusBar style="light" />
      
      <StyledView className="items-center mb-8">
        <StyledView style={styles.iconShell}>
          <Ionicons name="link-outline" size={30} color={TERMINAL_AMBER} />
        </StyledView>
        <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mb-2">
          secure://relay-forge
        </StyledText>
        <StyledText className="text-3xl font-bold tracking-tight" style={styles.heroTitle}>
          Forge Connection
        </StyledText>
        <StyledText className="text-muted text-center mt-3 font-mono text-xs uppercase tracking-[2px]">
          Enter a contact's email to establish a secure, end-to-end encrypted relay.
        </StyledText>
        <StyledText className="font-mono text-[10px] uppercase tracking-[2px] text-center mt-4" style={styles.statusText}>
          {`> target lookup ready // relay handshake will derive remote node key`}
        </StyledText>
      </StyledView>

      <StyledView style={styles.inputShell}>
        <StyledTextInput
          className="text-white font-mono text-base p-5 pl-14"
          placeholder="target.node@example.com"
          placeholderTextColor={COLORS.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          autoFocus={true}
        />
        <Ionicons 
          name="mail-outline" 
          size={20} 
          color={COLORS.muted} 
          style={{ position: 'absolute', left: 16, top: 18 }} 
        />
      </StyledView>

      <StyledTouchableOpacity
        activeOpacity={0.8}
        onPress={handleSearchAndAdd}
        disabled={loading}
        className="w-full mb-4"
        style={[
          styles.ctaShell,
          !loading && email ? styles.ctaShellActive : null,
          loading || !email ? styles.ctaShellIdle : null,
        ]}
      >
        <StyledView style={styles.ctaScanlineTop} />
        <StyledView style={styles.ctaScanlineBottom} />
        <StyledView style={styles.ctaNotchLeft} />
        <StyledView style={styles.ctaNotchRight} />
        {loading ? (
          <StyledView className="py-4">
            <ActivityIndicator color={TERMINAL_AMBER} />
          </StyledView>
        ) : (
          <StyledView className="flex-row items-center justify-center px-5 py-4">
            <StyledText className="font-mono text-[10px] uppercase mr-3" style={styles.ctaPrefix}>
              [link]
            </StyledText>
            <StyledText className="font-mono text-sm uppercase tracking-[4px]" style={styles.ctaLabel}>
              Initiate Handshake
            </StyledText>
          </StyledView>
        )}
      </StyledTouchableOpacity>

      <StyledTouchableOpacity
        activeOpacity={0.6}
        onPress={() => router.back()}
        className="w-full py-4 items-center justify-center"
      >
        <StyledText className="text-muted text-base font-mono uppercase tracking-[2px]">Abort</StyledText>
      </StyledTouchableOpacity>
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
  iconShell: {
    width: 72,
    height: 72,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.4)',
    borderRadius: 6,
    backgroundColor: '#050505',
  },
  inputShell: {
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.18)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  ctaShell: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  ctaShellActive: {
    borderColor: 'rgba(246, 193, 119, 0.48)',
  },
  ctaShellIdle: {
    borderColor: 'rgba(115, 115, 115, 0.28)',
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
