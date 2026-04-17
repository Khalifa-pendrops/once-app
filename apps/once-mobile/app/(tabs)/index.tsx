import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StatusBar, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DecryptionGuard } from '../../src/components/auth/DecryptionGuard';
import { COLORS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useContactStore, Contact, ContactRequest } from '../../src/store/contactStore';
import { contactRequestApi } from '../../src/api/contactRequests';
import { keyApi } from '../../src/api/keys';
import { useAuthStore } from '../../src/store/authStore';
import { useMessageStore } from '../../src/store/messageStore';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;
const TERMINAL_AMBER = '#F6C177';
const TERMINAL_CYAN = '#67E8F9';

export default function ChatListScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const resetContacts = useContactStore((state) => state.reset);
  const resetMessages = useMessageStore((state) => state.reset);
  const {
    contacts,
    incomingRequests,
    initialize,
    setIncomingRequests,
    setOutgoingRequests,
    addContact,
    updateContactStatus,
    removeIncomingRequest,
  } = useContactStore();

  useEffect(() => {
    const syncVaultState = async () => {
      await initialize();

      try {
        const [incoming, outgoing] = await Promise.all([
          contactRequestApi.listIncoming(),
          contactRequestApi.listOutgoing(),
        ]);

        await setIncomingRequests(incoming.requests);
        await setOutgoingRequests(outgoing.requests);

        for (const request of outgoing.requests) {
          await updateContactStatus(
            request.recipientUserId,
            request.status === 'accepted' ? 'accepted' : 'pending'
          );
        }
      } catch (error) {
        console.error('Failed to sync contact requests:', error);
      }
    };

    void syncVaultState();
  }, [initialize, setIncomingRequests, setOutgoingRequests, updateContactStatus]);

  const handleAcceptRequest = async (request: ContactRequest) => {
    try {
      await contactRequestApi.accept(request.id);
      const keyData = await keyApi.getContactKeys(request.requesterUserId);

      if (!keyData.keys || keyData.keys.length === 0) {
        throw new Error('No active keys found for this requester.');
      }

      const primaryKey = keyData.keys[0];

      await addContact({
        id: request.requesterUserId,
        email: request.requesterEmail,
        deviceId: primaryKey.deviceId,
        publicKey: primaryKey.publicKey,
        status: 'accepted',
      });

      await removeIncomingRequest(request.id);
      await updateContactStatus(request.requesterUserId, 'accepted');
    } catch (error) {
      console.error('Failed to accept contact request:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'This will end the current session on this device and return you to the vault login.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetMessages();
              await resetContacts();
              await logout();
            } catch (error) {
              console.error('Failed to sign out cleanly:', error);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <StyledTouchableOpacity
      activeOpacity={0.7}
      className="mx-6 mb-4 px-4 py-4 flex-row items-center"
      style={styles.nodeCard}
      onPress={() => router.push(`/chat/${item.id}` as any)}
    >
      <StyledView style={styles.nodeAvatar}>
        <Ionicons name="person-outline" size={22} color={TERMINAL_AMBER} />
      </StyledView>

      <StyledView className="flex-1 ml-4">
        <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[2px] mb-1">
          {item.status === 'accepted' ? 'channel://active' : 'channel://pending'}
        </StyledText>
        <StyledView className="flex-row justify-between items-center mb-1">
          <StyledText className="font-bold text-lg tracking-tight" style={styles.nodeName}>
            {item.email.split('@')[0]}
          </StyledText>
          <StyledText className="text-xs font-mono uppercase tracking-[2px]" style={styles.nodeStatus}>
            {item.status === 'accepted' ? 'armed' : 'pending'}
          </StyledText>
        </StyledView>
        <StyledText numberOfLines={1} className="text-sm font-mono" style={styles.nodeKey}>
          {`key::${item.publicKey.substring(0, 16)}...`}
        </StyledText>
      </StyledView>
    </StyledTouchableOpacity>
  );

  const renderRequestItem = (request: ContactRequest) => (
    <StyledView key={request.id} className="mx-6 mb-4 px-4 py-4" style={styles.requestCard}>
      <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[2px] mb-1">
        inbound://handshake
      </StyledText>
      <StyledText className="font-bold text-lg tracking-tight mb-1" style={styles.nodeName}>
        {request.requesterEmail}
      </StyledText>
      <StyledText className="text-sm font-mono mb-4" style={styles.nodeKey}>
        {'> remote node requests secure relay access'}
      </StyledText>

      <StyledTouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleAcceptRequest(request)}
        className="self-start px-4 py-3"
        style={styles.acceptButton}
      >
        <StyledText className="font-mono text-[10px] uppercase tracking-[3px]" style={styles.acceptButtonText}>
          Accept Link
        </StyledText>
      </StyledTouchableOpacity>
    </StyledView>
  );

  return (
    <DecryptionGuard>
      <SafeAreaView className="flex-1 bg-background" edges={['top']} style={{ paddingTop: 14 }}>
        <StatusBar barStyle="light-content" />

        <StyledView className="px-6 mb-8 flex-row justify-between items-center">
          <StyledView>
            <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mb-2">
              secure://vault-index
            </StyledText>
            <StyledText className="text-3xl font-black tracking-tighter" style={styles.heroTitle}>
              VAULT
            </StyledText>
            <StyledView className="flex-row items-center mt-2">
              <StyledView style={styles.heroStatusDot} />
              <StyledText className="text-xs font-mono uppercase tracking-widest" style={styles.heroStatusText}>
                {contacts.length} Nodes Synced
              </StyledText>
            </StyledView>
          </StyledView>

          <StyledView className="flex-row items-center">
            <StyledTouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={TERMINAL_CYAN} />
            </StyledTouchableOpacity>
            <StyledTouchableOpacity style={styles.addButton} onPress={() => router.push('/modal')}>
              <Ionicons name="add-outline" size={22} color={TERMINAL_AMBER} />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {contacts.length === 0 && incomingRequests.length === 0 ? (
          <StyledView className="flex-1 items-center justify-center px-10">
            <Ionicons name="scan-outline" size={60} color={COLORS.muted} style={{ opacity: 0.5, marginBottom: 16 }} />
            <StyledText className="text-muted text-center font-mono text-xs uppercase tracking-[2px]">
              Your vault is empty. Process a transmission key to establish a secure link.
            </StyledText>
          </StyledView>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={
              incomingRequests.length > 0 ? (
                <StyledView className="mb-4">
                  <StyledText className="mx-6 mb-3 text-muted font-mono text-[10px] uppercase tracking-[3px]">
                    Incoming Requests
                  </StyledText>
                  {incomingRequests.map(renderRequestItem)}
                </StyledView>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </DecryptionGuard>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    color: TERMINAL_AMBER,
    textShadowColor: 'rgba(246, 193, 119, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  heroStatusDot: {
    width: 8,
    height: 8,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: TERMINAL_CYAN,
  },
  heroStatusText: {
    color: '#8B8B8B',
  },
  addButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.4)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  logoutButton: {
    width: 42,
    height: 42,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.35)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  nodeCard: {
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.16)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  nodeAvatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.28)',
    borderRadius: 4,
    backgroundColor: '#080808',
  },
  nodeName: {
    color: TERMINAL_AMBER,
  },
  nodeStatus: {
    color: '#8B8B8B',
  },
  nodeKey: {
    color: '#737373',
  },
  requestCard: {
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.26)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  acceptButton: {
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.4)',
    borderRadius: 4,
    backgroundColor: '#0A0A0A',
  },
  acceptButtonText: {
    color: TERMINAL_AMBER,
  },
});
