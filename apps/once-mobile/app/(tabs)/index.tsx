import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { DecryptionGuard } from '../../src/components/auth/DecryptionGuard';
import { COLORS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;

const MOCK_CONVERSATIONS = [
  { id: '1', contact: 'Kael.vault', lastMessage: 'The relay is confirmed.', time: '2m', unread: true },
  { id: '2', contact: 'Zero_Day', lastMessage: 'Identity sealed.', time: '1h', unread: false },
  { id: '3', contact: 'Phantom_Node', lastMessage: 'Awaiting coordination.', time: 'yesterday', unread: false },
];

export default function ChatListScreen() {
  const renderItem = ({ item }: { item: typeof MOCK_CONVERSATIONS[0] }) => (
    <StyledTouchableOpacity 
      activeOpacity={0.7}
      className="flex-row items-center px-6 py-5 border-b border-border/10"
    >
      <StyledView className="w-12 h-12 rounded-full bg-surface border border-border/20 items-center justify-center">
        <Ionicons name="person-outline" size={24} color={COLORS.primary} />
      </StyledView>
      
      <StyledView className="flex-1 ml-4">
        <StyledView className="flex-row justify-between items-center mb-1">
          <StyledText className="text-white font-bold text-lg tracking-tight">
            {item.contact}
          </StyledText>
          <StyledText className="text-muted text-xs">
            {item.time}
          </StyledText>
        </StyledView>
        <StyledText 
          numberOfLines={1} 
          className={`text-sm ${item.unread ? 'text-white' : 'text-muted'}`}
        >
          {item.lastMessage}
        </StyledText>
      </StyledView>
      
      {item.unread && (
        <StyledView className="w-2 h-2 rounded-full bg-primary ml-3" />
      )}
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
                Nodes Synced
              </StyledText>
            </StyledView>
          </StyledView>
          
          <StyledTouchableOpacity className="w-10 h-10 rounded-full bg-surface items-center justify-center">
            <Ionicons name="add-outline" size={24} color={COLORS.primary} />
          </StyledTouchableOpacity>
        </StyledView>

        <FlatList
          data={MOCK_CONVERSATIONS}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </StyledView>
    </DecryptionGuard>
  );
}
