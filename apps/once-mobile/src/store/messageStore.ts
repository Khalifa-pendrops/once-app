import { create } from 'zustand';
import { StorageService } from '../services/storage/secureStorage';

export interface ChatMessage {
  id: string; // clientMessageId or server generated
  serverMessageId?: string;
  senderId: string;
  recipientId: string;
  text: string; // decrypted plaintext
  timestamp: string;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'acknowledged' | 'failed';
  expiresAt?: number;
  isLocked?: boolean;
  nonce?: string;
  ciphertext?: string;
  senderPublicKey?: string;
}

interface MessageState {
  messages: Record<string, ChatMessage[]>; // Keyed by contactId (the other person)
  addMessage: (contactId: string, message: ChatMessage) => Promise<void>;
  updateMessageStatus: (
    contactId: string,
    messageId: string,
    status: ChatMessage['status'],
    expiresAt?: number,
    serverMessageId?: string
  ) => Promise<void>;
  markAsRead: (contactId: string) => Promise<void>;
  removeMessage: (contactId: string, messageId: string) => Promise<void>;
  unlockMessage: (
    contactId: string,
    messageId: string,
    plaintext: string,
    expiresAt?: number
  ) => Promise<void>;
  acknowledgeOutgoingMessage: (serverMessageId: string, expiresAt?: number) => Promise<void>;
  initialize: () => Promise<void>;
}

const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

    if (message.expiresAt) {
      const timerKey = `${contactId}:${message.id}`;
      const existingTimer = expiryTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const delay = Math.max(0, message.expiresAt - Date.now());
      expiryTimers.set(
        timerKey,
        setTimeout(() => {
          void get().removeMessage(contactId, message.id);
        }, delay)
      );
    }
  },

  updateMessageStatus: async (
    contactId: string,
    messageId: string,
    status: ChatMessage['status'],
    expiresAt?: number,
    serverMessageId?: string
  ) => {
    const { messages } = get();
    if (!messages[contactId]) return;

    const newMessages = {
      ...messages,
      [contactId]: messages[contactId].map(m => 
        m.id === messageId
          ? { ...m, status, ...(expiresAt ? { expiresAt } : {}), ...(serverMessageId ? { serverMessageId } : {}) }
          : m
      ),
    };

    await StorageService.setItem('chat_history', JSON.stringify(newMessages));
    set({ messages: newMessages });

    if (expiresAt) {
      const timerKey = `${contactId}:${messageId}`;
      const existingTimer = expiryTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const delay = Math.max(0, expiresAt - Date.now());
      expiryTimers.set(
        timerKey,
        setTimeout(() => {
          void get().removeMessage(contactId, messageId);
        }, delay)
      );
    }
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

  removeMessage: async (contactId: string, messageId: string) => {
    const { messages } = get();
    if (!messages[contactId]) return;

    const remainingMessages = messages[contactId].filter(m => m.id !== messageId);
    const newMessages = { ...messages };

    if (remainingMessages.length > 0) {
      newMessages[contactId] = remainingMessages;
    } else {
      delete newMessages[contactId];
    }

    const timerKey = `${contactId}:${messageId}`;
    const existingTimer = expiryTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      expiryTimers.delete(timerKey);
    }

    await StorageService.setItem('chat_history', JSON.stringify(newMessages));
    set({ messages: newMessages });
  },

  unlockMessage: async (contactId: string, messageId: string, plaintext: string, expiresAt?: number) => {
    const { messages } = get();
    if (!messages[contactId]) return;

    const newMessages = {
      ...messages,
      [contactId]: messages[contactId].map((message) =>
        message.id === messageId
          ? {
              ...message,
              text: plaintext,
              isLocked: false,
              isRead: true,
              nonce: undefined,
              ciphertext: undefined,
              senderPublicKey: undefined,
              ...(expiresAt ? { expiresAt } : {}),
            }
          : message
      ),
    };

    await StorageService.setItem('chat_history', JSON.stringify(newMessages));
    set({ messages: newMessages });

    if (expiresAt) {
      const timerKey = `${contactId}:${messageId}`;
      const existingTimer = expiryTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const delay = Math.max(0, expiresAt - Date.now());
      expiryTimers.set(
        timerKey,
        setTimeout(() => {
          void get().removeMessage(contactId, messageId);
        }, delay)
      );
    }
  },

  acknowledgeOutgoingMessage: async (serverMessageId: string, expiresAt?: number) => {
    const { messages } = get();
    let matchedContactId: string | null = null;
    let matchedMessageId: string | null = null;

    const newMessages: Record<string, ChatMessage[]> = {};

    for (const [contactId, contactMessages] of Object.entries(messages)) {
      newMessages[contactId] = contactMessages.map((message) => {
        if (message.serverMessageId !== serverMessageId) {
          return message;
        }

        matchedContactId = contactId;
        matchedMessageId = message.id;
        return {
          ...message,
          status: 'acknowledged' as const,
          ...(expiresAt ? { expiresAt } : {}),
        };
      });
    }

    if (!matchedContactId || !matchedMessageId) return;

    await StorageService.setItem('chat_history', JSON.stringify(newMessages));
    set({ messages: newMessages });

    if (expiresAt) {
      const timerKey = `${matchedContactId}:${matchedMessageId}`;
      const existingTimer = expiryTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const delay = Math.max(0, expiresAt - Date.now());
      expiryTimers.set(
        timerKey,
        setTimeout(() => {
          void get().removeMessage(matchedContactId as string, matchedMessageId as string);
        }, delay)
      );
    }
  },

  initialize: async () => {
    const data = await StorageService.getItem('chat_history');
    if (data) {
      const parsed = JSON.parse(data) as Record<string, ChatMessage[]>;
      const now = Date.now();
      const filteredMessages: Record<string, ChatMessage[]> = {};

      for (const [contactId, contactMessages] of Object.entries(parsed)) {
        const activeMessages = contactMessages.filter((message) => !message.expiresAt || message.expiresAt > now);

        if (activeMessages.length > 0) {
          filteredMessages[contactId] = activeMessages;

          for (const message of activeMessages) {
            if (message.expiresAt) {
              const timerKey = `${contactId}:${message.id}`;
              const delay = Math.max(0, message.expiresAt - now);
              const existingTimer = expiryTimers.get(timerKey);
              if (existingTimer) {
                clearTimeout(existingTimer);
              }

              expiryTimers.set(
                timerKey,
                setTimeout(() => {
                  void get().removeMessage(contactId, message.id);
                }, delay)
              );
            }
          }
        }
      }

      await StorageService.setItem('chat_history', JSON.stringify(filteredMessages));
      set({ messages: filteredMessages });
    }
  },
}));
