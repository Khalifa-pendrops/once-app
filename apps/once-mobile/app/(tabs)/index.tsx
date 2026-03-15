import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { DecryptionGuard } from '../../src/components/auth/DecryptionGuard';
import { COLORS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useContactStore, Contact } from '../../src/store/contactStore';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;

export default function ChatListScreen() {
  const router = useRouter();
  const { contacts, initialize } = useContactStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const renderItem = ({ item }: { item: Contact }) => (
    <StyledTouchableOpacity 
      activeOpacity={0.7}
      className="flex-row items-center px-6 py-5 border-b border-border/10"
      onPress={() => console.log('Open chat with', item.id)}
    >
      <StyledView className="w-12 h-12 rounded-full bg-surface border border-border/20 items-center justify-center">
        <Ionicons name="person-outline" size={24} color={COLORS.primary} />
      </StyledView>
      
      <StyledView className="flex-1 ml-4">
        <StyledView className="flex-row justify-between items-center mb-1">
          <StyledText className="text-white font-bold text-lg tracking-tight">
            {item.email.split('@')[0]}
          </StyledText>
          <StyledText className="text-muted text-xs">
            {item.status === 'accepted' ? 'Active' : 'Pending'}
          </StyledText>
        </StyledView>
        <StyledText 
          numberOfLines={1} 
          className="text-sm text-muted"
        >
          {item.publicKey.substring(0, 16)}...
        </StyledText>
      </StyledView>
    </StyledTouchableOpacity>
  );

  return (
    <DecryptionGuard>
      <StyledView className="flex-1 bg-background pt-14">
        <StatusBar barStyle="light-content" />
        
        <StyledView className="px-6 mb-8 flex-row justify-between items-center">
          <StyledView>
            <StyledText className="text-white text-3xl font-black tracking-tighter">
              VAULT
            </StyledText>
            <StyledView className="flex-row items-center mt-1">
              <StyledView className="w-2 h-2 rounded-full bg-safety mr-2" />
              <StyledText className="text-muted text-xs font-mono uppercase tracking-widest">
                {contacts.length} Nodes Synced
              </StyledText>
            </StyledView>
          </StyledView>
          
          <StyledTouchableOpacity 
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
            onPress={() => router.push('/modal')}
          >
            <Ionicons name="add-outline" size={24} color={COLORS.primary} />
          </StyledTouchableOpacity>
        </StyledView>

        {contacts.length === 0 ? (
          <StyledView className="flex-1 items-center justify-center px-10">
            <Ionicons name="scan-outline" size={60} color={COLORS.muted} style={{ opacity: 0.5, marginBottom: 16 }} />
            <StyledText className="text-muted text-center">
              Your vault is empty. Process a transmission key to establish a secure link.
            </StyledText>
          </StyledView>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </StyledView>
    </DecryptionGuard>
  );
}
