import { useAuthStore } from '../../store/authStore';
import { messageApi } from '../../api/messages';

// WS URL mapping from HTTPS
const WS_URL = 'wss://once-app-qdwh.onrender.com/ws';
const ACKNOWLEDGED_MESSAGE_TTL_MS = 5000;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private pingInterval: any = null;

  connect() {
    const { token, deviceId, isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated || !token || !deviceId) {
      console.log('[WS] Cannot connect: Missing auth session or device ID.');
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = `${WS_URL}?token=${token}&deviceId=${deviceId}`;
    console.log('[WS] Connecting to:', url);

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] Connected to vault relay.');
      this.clearReconnect();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : String(event.data);

        if (raw === 'pong') {
          return;
        }

        const data = JSON.parse(raw);
        console.log('[WS] Received:', data);
        
        switch (data.type) {
          case 'welcome':
            console.log('[WS] Handshake established.');
            void this.syncPendingMessages();
            break;
          case 'pending':
          case 'message':
            this.handleIncomingMessage(data);
            break;
          case 'contact_request':
            void this.handleIncomingContactRequest(data.request);
            break;
          case 'contact_request_accepted':
            void this.handleAcceptedContactRequest(data.request);
            break;
          case 'ack_ok':
            console.log('[WS] Message ACKed by server:', data.messageId);
            break;
          case 'message_acked':
            console.log('[WS] Outgoing message acknowledged:', data.messageId);
            void this.handleOutgoingAcknowledgement(data.messageId);
            break;
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    this.socket.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason);
      this.stopHeartbeat();
      this.scheduleReconnect();
    };
  }

  private async storeIncomingMessage(data: any) {
    try {
      let nonce, ciphertext, senderPublicKey;
      
      if (data.type === 'message') {
        ({ nonce, ciphertext, senderPublicKey } = data);
      } else if (data.type === 'pending') {
        // Pending payloads are sent by the server in the same flat shape as live messages.
        ({ nonce, ciphertext, senderPublicKey } = data);
      } else {
        return;
      }

      const { useMessageStore } = await import('../../store/messageStore');
      const { addMessage } = useMessageStore.getState();

      const messageRecord = {
        id: data.clientMessageId || data.messageId,
        serverMessageId: data.messageId,
        senderId: data.senderUserId,
        recipientId: useAuthStore.getState().userId || '',
        text: '',
        timestamp: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
        isRead: false,
        status: 'delivered' as const,
        isLocked: true,
        nonce,
        ciphertext,
        senderPublicKey,
      };

      await addMessage(data.senderUserId, messageRecord);
      const { useContactStore } = await import('../../store/contactStore');
      const { addContact } = useContactStore.getState();
      
      await addContact({
        id: data.senderUserId,
        email: `Unknown Node (${data.senderUserId.substring(0, 5)})`, // MVP fallback
        publicKey: senderPublicKey,
        deviceId: 'unknown',
        status: 'pending' // we haven't officially added them
      });

      return true;

    } catch (err) {
      console.error('[WS] Failed to process incoming message:', err);
      return false;
    }
  }

  private async handleIncomingMessage(data: any) {
    await this.storeIncomingMessage(data);
  }

  private async handleIncomingContactRequest(request: any) {
    try {
      const { useContactStore } = await import('../../store/contactStore');
      const { upsertIncomingRequest } = useContactStore.getState();
      await upsertIncomingRequest(request);
    } catch (err) {
      console.error('[WS] Failed to process incoming contact request:', err);
    }
  }

  private async handleAcceptedContactRequest(request: any) {
    try {
      const { useContactStore } = await import('../../store/contactStore');
      const { upsertOutgoingRequest, updateContactStatus } = useContactStore.getState();

      await upsertOutgoingRequest(request);
      await updateContactStatus(request.recipientUserId, 'accepted');
    } catch (err) {
      console.error('[WS] Failed to process accepted contact request:', err);
    }
  }

  async syncPendingMessages() {
    try {
      const { messages } = await messageApi.listPendingMessages();

      for (const message of messages) {
        await this.storeIncomingMessage({ ...message, type: 'pending' });
      }
    } catch (err) {
      console.error('[WS] Failed to sync pending messages:', err);
    }
  }

  private async handleOutgoingAcknowledgement(serverMessageId: string) {
    try {
      const { useMessageStore } = await import('../../store/messageStore');
      const { acknowledgeOutgoingMessage } = useMessageStore.getState();
      await acknowledgeOutgoingMessage(serverMessageId, Date.now() + ACKNOWLEDGED_MESSAGE_TTL_MS);
    } catch (err) {
      console.error('[WS] Failed to update outgoing acknowledgement:', err);
    }
  }

  send(data: object) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send: Socket not open.');
    }
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.stopHeartbeat();
    this.clearReconnect();
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('[WS] Attempting reconnect...');
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const wsClient = new WebSocketClient();
