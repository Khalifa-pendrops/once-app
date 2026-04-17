import React, { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContactStore } from '../../src/store/contactStore';
import { useMessageStore } from '../../src/store/messageStore';
import { useAuthStore } from '../../src/store/authStore';

const StyledScrollView = ScrollView as any;
const StyledView = View as any;
const StyledText = Text as any;

const TERMINAL_AMBER = '#F6C177';
const TERMINAL_CYAN = '#67E8F9';
const TERMINAL_MUTED = '#8B8B8B';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const initializeContacts = useContactStore((state) => state.initialize);
  const contacts = useContactStore((state) => state.contacts);
  const incomingRequests = useContactStore((state) => state.incomingRequests);
  const outgoingRequests = useContactStore((state) => state.outgoingRequests);

  const initializeMessages = useMessageStore((state) => state.initialize);
  const messages = useMessageStore((state) => state.messages);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const deviceId = useAuthStore((state) => state.deviceId);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const publicKey = useAuthStore((state) => state.publicKey);

  useEffect(() => {
    void initializeContacts();
    void initializeMessages();
  }, [initializeContacts, initializeMessages]);

  const allMessages = Object.values(messages).flat();
  const now = Date.now();

  const acceptedContacts = contacts.filter((contact) => contact.status === 'accepted').length;
  const pendingContacts = contacts.filter((contact) => contact.status === 'pending').length;
  const totalThreads = Object.keys(messages).length;

  const outgoingCount = allMessages.filter((message) => message.senderId !== message.recipientId && message.status !== 'failed').length;
  const failedCount = allMessages.filter((message) => message.status === 'failed').length;
  const lockedCount = allMessages.filter((message) => message.isLocked).length;
  const acknowledgedCount = allMessages.filter((message) => message.status === 'acknowledged').length;
  const deliveredCount = allMessages.filter((message) => message.status === 'delivered').length;
  const expiringSoonCount = allMessages.filter(
    (message) => message.expiresAt && message.expiresAt > now && message.expiresAt - now < 5 * 60 * 1000
  ).length;

  const latestMessage = [...allMessages].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  )[0];

  const telemetryCards = [
    {
      label: 'linked nodes',
      value: acceptedContacts,
      hint: `${pendingContacts} pending`,
      accent: TERMINAL_AMBER,
      icon: 'git-network-outline' as const,
    },
    {
      label: 'pending requests',
      value: incomingRequests.length + outgoingRequests.filter((request) => request.status === 'pending').length,
      hint: `${incomingRequests.length} inbound`,
      accent: TERMINAL_CYAN,
      icon: 'swap-horizontal-outline' as const,
    },
    {
      label: 'active threads',
      value: totalThreads,
      hint: `${allMessages.length} retained messages`,
      accent: TERMINAL_AMBER,
      icon: 'chatbubbles-outline' as const,
    },
    {
      label: 'unlock pressure',
      value: lockedCount,
      hint: `${expiringSoonCount} expiring soon`,
      accent: TERMINAL_CYAN,
      icon: 'lock-closed-outline' as const,
    },
  ];

  const statusRows = [
    { label: 'acknowledged', value: acknowledgedCount, accent: TERMINAL_AMBER },
    { label: 'delivered', value: deliveredCount, accent: TERMINAL_CYAN },
    { label: 'outgoing ok', value: outgoingCount, accent: '#9FE870' },
    { label: 'failed', value: failedCount, accent: '#EF4444' },
  ];

  const sessionRows = [
    { label: 'session state', value: isAuthenticated ? 'authenticated' : 'offline' },
    { label: 'vault seal', value: isUnlocked ? 'open' : 'sealed' },
    { label: 'device id', value: deviceId ? `${deviceId.slice(0, 12)}...` : 'not registered' },
    { label: 'public key', value: publicKey ? `${publicKey.slice(0, 16)}...` : 'missing' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <StyledScrollView 
        className="flex-1" 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      >
      <StyledView className="mb-8">
        <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mb-2">
          secure://vault-telemetry
        </StyledText>
        <StyledText className="text-3xl font-black tracking-tight" style={styles.heroTitle}>
          STATS
        </StyledText>
        <StyledText className="font-mono text-xs uppercase tracking-[2px] mt-3" style={styles.heroHint}>
          {'> local telemetry derived from vault links, requests, and retained encrypted traffic'}
        </StyledText>
      </StyledView>

      <StyledView style={styles.cardGrid}>
        {telemetryCards.map((card) => (
          <StyledView key={card.label} style={styles.metricCard}>
            <StyledView className="flex-row items-center justify-between mb-4">
              <Ionicons name={card.icon} size={18} color={card.accent} />
              <StyledText className="font-mono text-[10px] uppercase tracking-[2px]" style={styles.metricLabel}>
                {card.label}
              </StyledText>
            </StyledView>
            <StyledText style={[styles.metricValue, { color: card.accent }]}>
              {card.value}
            </StyledText>
            <StyledText className="font-mono text-[10px] uppercase tracking-[2px]" style={styles.metricHint}>
              {card.hint}
            </StyledText>
          </StyledView>
        ))}
      </StyledView>

      <StyledView style={styles.section}>
        <StyledText className="font-mono text-[10px] uppercase tracking-[3px] mb-4" style={styles.sectionLabel}>
          message state matrix
        </StyledText>
        {statusRows.map((row) => (
          <StyledView key={row.label} style={styles.row}>
            <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowLabel}>
              {row.label}
            </StyledText>
            <StyledText className="font-mono text-sm uppercase tracking-[2px]" style={{ color: row.accent }}>
              {row.value}
            </StyledText>
          </StyledView>
        ))}
      </StyledView>

      <StyledView style={styles.section}>
        <StyledText className="font-mono text-[10px] uppercase tracking-[3px] mb-4" style={styles.sectionLabel}>
          current session
        </StyledText>
        {sessionRows.map((row) => (
          <StyledView key={row.label} style={styles.row}>
            <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowLabel}>
              {row.label}
            </StyledText>
            <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowValue}>
              {row.value}
            </StyledText>
          </StyledView>
        ))}
      </StyledView>

      <StyledView style={styles.section}>
        <StyledText className="font-mono text-[10px] uppercase tracking-[3px] mb-4" style={styles.sectionLabel}>
          latest traffic sample
        </StyledText>
        {latestMessage ? (
          <>
            <StyledView style={styles.row}>
              <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowLabel}>
                timestamp
              </StyledText>
              <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowValue}>
                {new Date(latestMessage.timestamp).toLocaleString()}
              </StyledText>
            </StyledView>
            <StyledView style={styles.row}>
              <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowLabel}>
                state
              </StyledText>
              <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowValue}>
                {latestMessage.isLocked ? 'locked payload' : latestMessage.status}
              </StyledText>
            </StyledView>
            <StyledView style={styles.row}>
              <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowLabel}>
                expiry
              </StyledText>
              <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.rowValue}>
                {latestMessage.expiresAt ? new Date(latestMessage.expiresAt).toLocaleTimeString() : 'none'}
              </StyledText>
            </StyledView>
          </>
        ) : (
          <StyledText className="font-mono text-xs uppercase tracking-[2px]" style={styles.emptyState}>
            {'> no retained messages yet // transmit or receive traffic to populate telemetry'}
          </StyledText>
        )}
      </StyledView>
    </StyledScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  heroTitle: {
    color: TERMINAL_AMBER,
    textShadowColor: 'rgba(246, 193, 119, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  heroHint: {
    color: TERMINAL_MUTED,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    minHeight: 132,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(246, 193, 119, 0.16)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  metricLabel: {
    color: TERMINAL_MUTED,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
  },
  metricHint: {
    color: TERMINAL_MUTED,
  },
  section: {
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.14)',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  sectionLabel: {
    color: TERMINAL_CYAN,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  rowLabel: {
    color: TERMINAL_MUTED,
    flexShrink: 1,
    paddingRight: 12,
  },
  rowValue: {
    color: '#E5E5E5',
    flexShrink: 1,
    textAlign: 'right',
  },
  emptyState: {
    color: TERMINAL_MUTED,
  },
});
