import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { keyApi } from '../../src/api/keys';

const OPENED_MESSAGE_TTL_MS = 5000;

const StyledView = View as any;
const StyledText = Text as any;
const StyledTextInput = TextInput as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const StyledFlatList = FlatList as any;
const StyledKeyboardAvoidingView = KeyboardAvoidingView as any;
const StyledSafeAreaView = SafeAreaView as any;
const TERMINAL_AMBER = '#F6C177';
const TERMINAL_CYAN = '#67E8F9';

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

      const keyData = await keyApi.getContactKeys(contact.id);
      const uniqueRecipientKeys = keyData.keys.filter(
        (key, index, keys) => keys.findIndex((candidate) => candidate.deviceId === key.deviceId) === index
      );

      if (uniqueRecipientKeys.length === 0) {
        throw new Error('Recipient has no active device keys.');
      }

      // 4. Construct API payload exactly as expected by MessageRoutes
      if (!publicKey) {
          console.error("Missing public key");
          await updateMessageStatus(contact.id, clientMessageId, 'failed');
          return;
      }

      const payload = {
        recipientUserId: contact.id,
        clientMessageId,
        payloads: uniqueRecipientKeys.map((recipientKey) => {
          const { nonce, ciphertext } = E2EService.encryptMessage(
            messageText,
            decryptedKey,
            recipientKey.publicKey
          );

          return {
            deviceId: recipientKey.deviceId,
            nonce,
            ciphertext,
            senderPublicKey: publicKey
          };
        })
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
            className={`px-4 py-3 ${
              isMe 
                ? '' 
                : ''
            }`}
            style={isMe ? styles.myMessageBubble : styles.peerMessageBubble}
          >
            {item.isLocked && !isMe ? (
              <StyledView className="flex-row items-center">
                <Ionicons name="key-outline" size={16} color={TERMINAL_AMBER} />
                <StyledText className="ml-2 text-base leading-5 font-mono uppercase tracking-[2px]" style={styles.lockedMessageText}>
                  Tap to unlock
                </StyledText>
              </StyledView>
            ) : (
              <StyledText className="text-base leading-5" style={isMe ? styles.myMessageText : styles.peerMessageText}>
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
        <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.emptyText}>Contact not found or missing keys.</StyledText>
        <StyledTouchableOpacity onPress={() => router.back()} className="mt-4 px-5 py-4" style={styles.returnButton}>
           <StyledText className="font-mono text-xs uppercase tracking-[3px]" style={styles.returnButtonText}>Return to Vault</StyledText>
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
        <StyledSafeAreaView className="flex-1">
          <StatusBar style="light" />

          {/* Header */}
          <StyledView className="flex-row items-center px-6 pt-4 pb-4 border-b border-border/10 bg-background/90 z-10">
            <StyledTouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
              <Ionicons name="chevron-back" size={28} color={TERMINAL_AMBER} />
            </StyledTouchableOpacity>
            <StyledView className="flex-1">
              <StyledText className="text-muted text-[10px] font-mono uppercase tracking-[3px] mb-1">
                secure://relay-thread
              </StyledText>
              <StyledText className="font-bold text-lg tracking-tight" style={styles.threadTitle}>
                {contact.email.split('@')[0]}
              </StyledText>
              <StyledText className="text-xs font-mono uppercase tracking-[2px]" style={styles.threadStatus}>
                E2EE Tunnel Active
              </StyledText>
            </StyledView>
            <StyledView style={styles.threadAvatar}>
              <Ionicons name="person" size={18} color={TERMINAL_CYAN} />
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
                 <StyledText className="text-muted text-center mt-4 px-10 font-mono text-xs uppercase tracking-[2px]">
                   End-to-end encrypted relay established. Messages are secured with unique x25519 keys.
                 </StyledText>
               </StyledView>
             }
          />

          {/* Input Area */}
          <StyledView className="px-6 py-4 border-t border-border/10 bg-background">
            <StyledView style={styles.inputShell}>
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
                className="w-10 h-10 items-center justify-center ml-2"
                style={inputText.trim() ? styles.sendButtonActive : styles.sendButtonIdle}
              >
                <Ionicons 
                  name="arrow-up" 
                  size={20} 
                  color={inputText.trim() ? TERMINAL_AMBER : COLORS.muted} 
                />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledSafeAreaView>
      </StyledKeyboardAvoidingView>
    </DecryptionGuard>
  );
}

const styles = StyleSheet.create({
  threadTitle: {
    color: TERMINAL_AMBER,
  },
  threadStatus: {
    color: '#8B8B8B',
  },
  threadAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.28)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  myMessageBubble: {
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.4)',
    borderRadius: 4,
    backgroundColor: '#090909',
  },
  peerMessageBubble: {
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.18)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  myMessageText: {
    color: TERMINAL_AMBER,
  },
  peerMessageText: {
    color: '#E5E5E5',
  },
  lockedMessageText: {
    color: TERMINAL_AMBER,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.16)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  sendButtonActive: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.4)',
    borderRadius: 4,
    backgroundColor: '#0A0A0A',
  },
  sendButtonIdle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(115, 115, 115, 0.18)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  emptyText: {
    color: '#8B8B8B',
  },
  returnButton: {
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.3)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  returnButtonText: {
    color: TERMINAL_AMBER,
  },
});
