import { create } from 'zustand';
import { StorageService } from '../services/storage/secureStorage';

export interface ChatMessage {
  id: string; // clientMessageId or server generated
  senderId: string;
  recipientId: string;
  text: string; // decrypted plaintext
  timestamp: string;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
}

interface MessageState {
  messages: Record<string, ChatMessage[]>; // Keyed by contactId (the other person)
  addMessage: (contactId: string, message: ChatMessage) => Promise<void>;
  markAsRead: (contactId: string) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},

  addMessage: async (contactId: string, message: ChatMessage) => {
    const { messages } = get();
    const contactMessages = messages[contactId] || [];
    
    // Prevent duplicates
    if (contactMessages.some(m => m.id === message.id)) return;

    const updatedContactMessages = [...contactMessages, message];
    
    // Sort by timestamp
    updatedContactMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const newMessages = {
      ...messages,
      [contactId]: updatedContactMessages,
    };

    // Serialize and save to secure storage (for MVP, we store all messages together. 
    // In production, SQLite with encrypted columns is better for large histories).
    await StorageService.setItem('chat_history', JSON.stringify(newMessages));
    set({ messages: newMessages });
  },

  markAsRead: async (contactId: string) => {
    const { messages } = get();
    if (!messages[contactId]) return;

    const newMessages = {
      ...messages,
      [contactId]: messages[contactId].map(m => ({ ...m, isRead: true })),
    };

    await StorageService.setItem('chat_history', JSON.stringify(newMessages));
    set({ messages: newMessages });
  },

  initialize: async () => {
    const data = await StorageService.getItem('chat_history');
    if (data) {
      set({ messages: JSON.parse(data) });
    }
  },
}));
