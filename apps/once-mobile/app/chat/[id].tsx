import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useContactStore } from '../../src/store/contactStore';
import { useMessageStore, ChatMessage } from '../../src/store/messageStore';
import { useAuthStore } from '../../src/store/authStore';
import { wsClient } from '../../src/services/ws/wsClient';
import { E2EService } from '../../src/services/crypto/e2e';
import { messageApi } from '../../src/api/messages';
import { COLORS } from '../../src/constants/theme';
import { DecryptionGuard } from '../../src/components/auth/DecryptionGuard';

const OPENED_MESSAGE_TTL_MS = 5000;

const StyledView = View as any;
const StyledText = Text as any;
const StyledTextInput = TextInput as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const StyledFlatList = FlatList as any;
const StyledKeyboardAvoidingView = KeyboardAvoidingView as any;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { contacts } = useContactStore();
  const contact = contacts.find(c => c.id === id);
  
  const { messages, addMessage, updateMessageStatus, initialize: initMessages, unlockMessage } = useMessageStore();
  const contactMessages = messages[id || ''] || [];
  
  const { userId, decryptedKey, publicKey } = useAuthStore();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initMessages();
  }, [initMessages]);

  useEffect(() => {
    if (flatListRef.current && contactMessages.length > 0) {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }
  }, [contactMessages]);

  const handleOpenLockedMessage = async (message: ChatMessage) => {
    if (!contact || !decryptedKey || !message.isLocked || !message.nonce || !message.ciphertext || !message.senderPublicKey) {
      return;
    }

    try {
      const plaintext = E2EService.decryptMessage(
        message.ciphertext,
        message.nonce,
        message.senderPublicKey,
        decryptedKey
      );

      const expiresAt = Date.now() + OPENED_MESSAGE_TTL_MS;
      await unlockMessage(contact.id, message.id, plaintext, expiresAt);

      if (message.serverMessageId) {
        await messageApi.acknowledgeMessage(message.serverMessageId);
      }
    } catch (err: any) {
      console.error('Failed to unlock message:', err);
      Alert.alert('Unlock Failed', err?.message || 'Unable to decrypt this message.');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !contact || !userId || !decryptedKey) return;

    let clientMessageId = '';
    try {
      const messageText = inputText.trim();
      setInputText('');

      // 1. Create Local Message Record
      clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newMessage: ChatMessage = {
        id: clientMessageId,
        senderId: userId,
        recipientId: contact.id,
        text: messageText,
        timestamp: new Date().toISOString(),
        isRead: true,
        status: 'sending'
      };

      // 2. Add to Local Store immediately for optimistic UI
      await addMessage(contact.id, newMessage);

      // 3. Encrypt payload
      const { nonce, ciphertext } = E2EService.encryptMessage(
        messageText,
        decryptedKey,
        contact.publicKey
      );

      // 4. Construct API payload exactly as expected by MessageRoutes
      if (!publicKey) {
          console.error("Missing public key");
          await updateMessageStatus(contact.id, clientMessageId, 'failed');
          return;
      }
      
      const payload = {
        recipientUserId: contact.id,
        clientMessageId,
        payloads: [
          {
            deviceId: contact.deviceId,
            nonce,
            ciphertext,
            senderPublicKey: publicKey
          }
        ]
      };

      // 5. POST to REST API
      const result = await messageApi.sendMessage(payload);
      
      // Update status to sent 
      await updateMessageStatus(contact.id, clientMessageId, 'sent', result.expiresAt, result.messageId);
      console.log('Message Sent:', clientMessageId);

    } catch (err: any) {
      console.error('Failed to encrypt/send:', err);
      if (clientMessageId) {
        await updateMessageStatus(contact.id, clientMessageId, 'failed');
      }
      if (err.response) {
        Alert.alert('Message Sent Failed', JSON.stringify(err.response.data, null, 2));
      } else {
        Alert.alert('Send Error', err?.message || JSON.stringify(err) || 'Unknown Error');
      }
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === userId;
    
    return (
      <StyledView className={`mb-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
        <StyledTouchableOpacity
          activeOpacity={item.isLocked && !isMe ? 0.75 : 1}
          disabled={!item.isLocked || isMe}
          onPress={() => handleOpenLockedMessage(item)}
        >
          <StyledView 
            className={`px-4 py-3 rounded-2xl ${
              isMe 
                ? 'bg-primary rounded-tr-sm' 
                : 'bg-surface border border-border/20 rounded-tl-sm'
            }`}
          >
            {item.isLocked && !isMe ? (
              <StyledView className="flex-row items-center">
                <Ionicons name="key-outline" size={16} color={COLORS.primary} />
                <StyledText className="text-white ml-2 text-base leading-5">
                  Tap to unlock
                </StyledText>
              </StyledView>
            ) : (
              <StyledText className={`text-base leading-5 ${isMe ? 'text-background' : 'text-white'}`}>
                {item.text}
              </StyledText>
            )}
          </StyledView>
        </StyledTouchableOpacity>
        <StyledText className={`text-[10px] text-muted mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMe && ` · ${item.status}`}
        </StyledText>
      </StyledView>
    );
  };

  if (!contact) {
    return (
      <StyledView className="flex-1 bg-background justify-center items-center px-6">
        <StyledText className="text-white">Contact not found or missing keys.</StyledText>
        <StyledTouchableOpacity onPress={() => router.back()} className="mt-4 p-4 border border-border/30 rounded-xl">
           <StyledText className="text-muted">Return to Vault</StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  }

  return (
    <DecryptionGuard>
      <StyledKeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background"
      >
        <StatusBar style="light" />

        {/* Header */}
        <StyledView className="flex-row items-center px-6 pt-14 pb-4 border-b border-border/10 bg-background/90 z-10">
          <StyledTouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <StyledText className="text-white font-bold text-lg tracking-tight">
              {contact.email.split('@')[0]}
            </StyledText>
            <StyledText className="text-muted text-xs font-mono">
              E2EE Tunnel Active
            </StyledText>
          </StyledView>
          <StyledView className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border/20">
            <Ionicons name="person" size={18} color={COLORS.muted} />
          </StyledView>
        </StyledView>

        {/* Chat Area */}
        <StyledFlatList
           ref={flatListRef}
           data={contactMessages}
           keyExtractor={(item: ChatMessage) => item.id}
           renderItem={renderMessage}
           contentContainerStyle={{ padding: 24, paddingTop: 32 }}
           showsVerticalScrollIndicator={false}
           ListEmptyComponent={
             <StyledView className="items-center justify-center mt-20 opacity-50">
               <Ionicons name="lock-closed-outline" size={48} color={COLORS.muted} />
               <StyledText className="text-muted text-center mt-4 px-10">
                 End-to-end encrypted relay established. Messages are secured with unique x25519 keys.
               </StyledText>
             </StyledView>
           }
        />

        {/* Input Area */}
        <StyledView className="px-6 py-4 border-t border-border/10 bg-background pb-10">
          <StyledView className="flex-row items-center bg-surface border border-border/20 rounded-full pl-5 pr-2 py-2">
            <StyledTextInput
              className="flex-1 text-white text-base min-h-[40px]"
              placeholder="Encrypt message..."
              placeholderTextColor={COLORS.muted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              maxLength={1000}
            />
            <StyledTouchableOpacity 
              disabled={!inputText.trim()}
              onPress={handleSend}
              className={`w-10 h-10 rounded-full items-center justify-center ml-2 ${
                inputText.trim() ? 'bg-primary' : 'bg-surface border border-border/10'
              }`}
            >
              <Ionicons 
                name="arrow-up" 
                size={20} 
                color={inputText.trim() ? COLORS.background : COLORS.muted} 
              />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

      </StyledKeyboardAvoidingView>
    </DecryptionGuard>
  );
}
