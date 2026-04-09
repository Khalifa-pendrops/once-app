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

export interface ContactRequest {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  recipientUserId: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'ignored';
  createdAt: string;
  respondedAt?: string | null;
}

interface ContactState {
  contacts: Contact[];
  incomingRequests: ContactRequest[];
  outgoingRequests: ContactRequest[];
  addContact: (contact: Contact) => Promise<void>;
  updateContactStatus: (userId: string, status: Contact['status']) => Promise<void>;
  setIncomingRequests: (requests: ContactRequest[]) => Promise<void>;
  setOutgoingRequests: (requests: ContactRequest[]) => Promise<void>;
  upsertIncomingRequest: (request: ContactRequest) => Promise<void>;
  upsertOutgoingRequest: (request: ContactRequest) => Promise<void>;
  removeIncomingRequest: (requestId: string) => Promise<void>;
  reset: () => Promise<void>;
  initialize: () => Promise<void>;
}

const CONTACTS_KEY = 'contacts_meta';
const CONTACT_REQUESTS_KEY = 'contact_requests_meta';

async function persistContacts(contacts: Contact[]) {
  await StorageService.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

async function persistRequests(incomingRequests: ContactRequest[], outgoingRequests: ContactRequest[]) {
  await StorageService.setItem(
    CONTACT_REQUESTS_KEY,
    JSON.stringify({ incomingRequests, outgoingRequests })
  );
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  incomingRequests: [],
  outgoingRequests: [],

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

    await persistContacts(newContacts);
    set({ contacts: newContacts });
  },

  updateContactStatus: async (userId: string, status: Contact['status']) => {
    const { contacts } = get();
    const newContacts = contacts.map(c => 
      c.id === userId ? { ...c, status } : c
    );
    await persistContacts(newContacts);
    set({ contacts: newContacts });
  },

  setIncomingRequests: async (incomingRequests: ContactRequest[]) => {
    const { outgoingRequests } = get();
    await persistRequests(incomingRequests, outgoingRequests);
    set({ incomingRequests });
  },

  setOutgoingRequests: async (outgoingRequests: ContactRequest[]) => {
    const { incomingRequests } = get();
    await persistRequests(incomingRequests, outgoingRequests);
    set({ outgoingRequests });
  },

  upsertIncomingRequest: async (request: ContactRequest) => {
    const { incomingRequests, outgoingRequests } = get();
    const existingIndex = incomingRequests.findIndex(r => r.id === request.id);
    const nextIncoming = existingIndex >= 0
      ? incomingRequests.map(r => (r.id === request.id ? request : r))
      : [request, ...incomingRequests];

    await persistRequests(nextIncoming, outgoingRequests);
    set({ incomingRequests: nextIncoming });
  },

  upsertOutgoingRequest: async (request: ContactRequest) => {
    const { incomingRequests, outgoingRequests } = get();
    const existingIndex = outgoingRequests.findIndex(r => r.id === request.id);
    const nextOutgoing = existingIndex >= 0
      ? outgoingRequests.map(r => (r.id === request.id ? request : r))
      : [request, ...outgoingRequests];

    await persistRequests(incomingRequests, nextOutgoing);
    set({ outgoingRequests: nextOutgoing });
  },

  removeIncomingRequest: async (requestId: string) => {
    const { incomingRequests, outgoingRequests } = get();
    const nextIncoming = incomingRequests.filter(r => r.id !== requestId);
    await persistRequests(nextIncoming, outgoingRequests);
    set({ incomingRequests: nextIncoming });
  },

  reset: async () => {
    await StorageService.removeItem(CONTACTS_KEY);
    await StorageService.removeItem(CONTACT_REQUESTS_KEY);
    set({
      contacts: [],
      incomingRequests: [],
      outgoingRequests: [],
    });
  },

  initialize: async () => {
    const data = await StorageService.getItem(CONTACTS_KEY);
    if (data) {
      set({ contacts: JSON.parse(data) });
    }

    const requestData = await StorageService.getItem(CONTACT_REQUESTS_KEY);
    if (requestData) {
      const parsed = JSON.parse(requestData) as {
        incomingRequests?: ContactRequest[];
        outgoingRequests?: ContactRequest[];
      };

      set({
        incomingRequests: parsed.incomingRequests || [],
        outgoingRequests: parsed.outgoingRequests || [],
      });
    }
  },
}));
