import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/theme';
import { userApi } from '../src/api/user';
import { keyApi } from '../src/api/keys';
import { useContactStore } from '../src/store/contactStore';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTextInput = TextInput as any;
const StyledTouchableOpacity = TouchableOpacity as any;

export default function AddContactModal() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addContact } = useContactStore();

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

      // We'll use the first available x25519 key for now
      const primaryKey = keyData.keys[0];

      // 3. Add to local store
      await addContact({
        id: user.id,
        email: user.email,
        deviceId: primaryKey.deviceId,
        publicKey: primaryKey.publicKey,
        status: 'pending' // They need to accept the handshake
      });

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
    <StyledView className="flex-1 bg-surface py-8 px-6">
      <StatusBar style="light" />
      
      <StyledView className="items-center mb-8">
        <StyledView className="w-16 h-16 rounded-full bg-background border border-border/20 items-center justify-center mb-4">
          <Ionicons name="link-outline" size={32} color={COLORS.primary} />
        </StyledView>
        <StyledText className="text-white text-2xl font-bold tracking-tight">
          Forge Connection
        </StyledText>
        <StyledText className="text-muted text-center mt-2">
          Enter a contact's email to establish a secure, end-to-end encrypted relay.
        </StyledText>
      </StyledView>

      <StyledView className="bg-background rounded-2xl border border-border/20 overflow-hidden mb-6">
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
        className={`w-full py-4 rounded-xl items-center justify-center mb-4 ${
          loading || !email ? 'bg-background' : 'bg-primary'
        }`}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <StyledText className={`text-lg font-bold tracking-wide ${loading || !email ? 'text-muted' : 'text-background'}`}>
            INITIATE HANDSHAKE
          </StyledText>
        )}
      </StyledTouchableOpacity>

      <StyledTouchableOpacity
        activeOpacity={0.6}
        onPress={() => router.back()}
        className="w-full py-4 items-center justify-center"
      >
        <StyledText className="text-muted text-base">Cancel</StyledText>
      </StyledTouchableOpacity>
    </StyledView>
  );
}
