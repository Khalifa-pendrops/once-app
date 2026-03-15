import { useAuthStore } from '../../store/authStore';

// WS URL mapping from HTTPS
const WS_URL = 'wss://once-app-qdwh.onrender.com/ws';

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
        const data = JSON.parse(event.data);
        console.log('[WS] Received:', data);
        
        switch (data.type) {
          case 'welcome':
            console.log('[WS] Handshake established.');
            break;
          case 'pending':
          case 'message':
            this.handleIncomingMessage(data);
            break;
          case 'ack_ok':
            console.log('[WS] Message ACKed by server:', data.messageId);
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

  private async handleIncomingMessage(data: any) {
    // 1. Send ACK immediately so server marks it delivered
    this.send({ type: 'ack', messageId: data.messageId });
    
    try {
      // 2. Extract payload based on push type
      let nonce, ciphertext, senderPublicKey;
      
      if (data.type === 'message') {
        ({ nonce, ciphertext, senderPublicKey } = data);
      } else if (data.type === 'pending') {
        const payloadStr = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
        if (!payloadStr) return;
        const payload = JSON.parse(payloadStr);
        ({ nonce, ciphertext, senderPublicKey } = payload);
      } else {
        return;
      }

      const { decryptedKey } = useAuthStore.getState();

      if (!decryptedKey) {
        console.warn('[WS] Cannot decrypt message: Vault is locked.');
        return;
      }

      // 3. Decrypt the message
      const { E2EService } = await import('../crypto/e2e');
      const plaintext = E2EService.decryptMessage(
        ciphertext,
        nonce,
        senderPublicKey,
        decryptedKey
      );

      console.log('[WS] Decrypted message from:', data.senderUserId);

      // 4. Save to Message Store
      const { useMessageStore } = await import('../../store/messageStore');
      const { addMessage } = useMessageStore.getState();

      const messageRecord = {
        id: data.clientMessageId || data.messageId,
        senderId: data.senderUserId,
        recipientId: useAuthStore.getState().userId || '',
        text: plaintext,
        timestamp: data.createdAt || new Date().toISOString(),
        isRead: false,
        status: 'delivered' as const,
      };

      await addMessage(data.senderUserId, messageRecord);

      // (Optional) Add contact if missing
      const { useContactStore } = await import('../../store/contactStore');
      const { addContact } = useContactStore.getState();
      
      await addContact({
        id: data.senderUserId,
        email: `Unknown Node (${data.senderUserId.substring(0, 5)})`, // MVP fallback
        publicKey: senderPublicKey,
        deviceId: 'unknown',
        status: 'pending' // we haven't officially added them
      });

    } catch (err) {
      console.error('[WS] Failed to process incoming message:', err);
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
