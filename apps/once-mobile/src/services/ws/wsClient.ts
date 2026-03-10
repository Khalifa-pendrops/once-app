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

  private handleIncomingMessage(data: any) {
    // 1. Send ACK
    this.send({ type: 'ack', messageId: data.messageId });
    
    // 2. Dispatch to stores/listeners (to be implemented)
    console.log('[WS] Message ready for decryption:', data.messageId);
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
