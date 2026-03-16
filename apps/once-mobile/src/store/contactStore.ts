import { create } from 'zustand';
import { StorageService } from '../services/storage/secureStorage';

export interface Contact {
  id: string; // userId
  email: string;
  publicKey: string; // x25519 public key
  deviceId: string;
  status: 'pending' | 'accepted' | 'ignored';
  lastSeen?: string;
}

interface ContactState {
  contacts: Contact[];
  addContact: (contact: Contact) => Promise<void>;
  updateContactStatus: (userId: string, status: Contact['status']) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],

  addContact: async (contact: Contact) => {
    const { contacts } = get();
    const existingIndex = contacts.findIndex(c => c.id === contact.id);
    
    let newContacts;
    if (existingIndex >= 0) {
      newContacts = [...contacts];
      newContacts[existingIndex] = contact;
    } else {
      newContacts = [...contacts, contact];
    }

    await StorageService.setItem('contacts_meta', JSON.stringify(newContacts));
    set({ contacts: newContacts });
  },

  updateContactStatus: async (userId: string, status: Contact['status']) => {
    const { contacts } = get();
    const newContacts = contacts.map(c => 
      c.id === userId ? { ...c, status } : c
    );
    await StorageService.setItem('contacts_meta', JSON.stringify(newContacts));
    set({ contacts: newContacts });
  },

  initialize: async () => {
    const data = await StorageService.getItem('contacts_meta');
    if (data) {
      set({ contacts: JSON.parse(data) });
    }
  },
}));
