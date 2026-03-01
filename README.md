# ONCE Server

A production-ready, end-to-end encrypted (E2EE), multi-device messaging backend.

## 🚀 Features

- 🔐 **PreKey-based encryption** (Signal-style one-time keys)
- 📡 **WebSocket + HTTP contract parity**
- 📦 **Device-scoped message fanout**
- 🧹 **Automatic PreKey hygiene** (keep latest 100 unused)
- ⚡ **Idempotent message sending**
- 🔁 **Offline sync support**
- 🛡 **Rate limiting & strict schema validation**
- 🧪 **Automated golden regression suite**
- 📊 **Structured lifecycle logging**
- 🧯 **Graceful shutdown support**

## 🏗 Architecture Overview

### Core Principles

1. **Zero Plaintext Storage**
   - The server never sees decrypted message content.
   - Only encrypted payloads are stored: `nonce`, `ciphertext`, `senderPublicKey`.

2. **Device-Scoped Delivery**
   - Messages are delivered to specific devices, not broadcast to all user devices.
   - ACK operations are device-scoped.

3. **Forward Secrecy via PreKeys**
   - One-time PreKeys are atomically claimed.
   - Used keys are never reissued.
   - Old unused keys are automatically pruned.
   - Concurrency-safe using row-level locking.

4. **WebSocket & HTTP Parity**
   - Live WebSocket payloads match `/messages/pull` responses exactly (Same fields, createdAt, and structure).

5. **Production Hardening**
   - Rate limiting, payload size limits, strict JSON Schema validation, graceful shutdown, structured logging, and a full regression test suite.

## 🧱 Tech Stack

- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Cache/Queue**: Redis
- **Real-time**: WebSockets (`ws`)
- **Language**: TypeScript
- **Crypto**: `libsodium`

## 📬 Message Flow

### Sending a Message
1. Sender claims PreKey bundle for recipient device.
2. Sender encrypts message locally.
3. Sender calls: `POST /messages`
4. Server:
   - Stores encrypted payload.
   - Emits to correct device if connected.
   - Returns idempotent `messageId`.

### 📡 WebSocket Delivery

#### Connect
`ws://localhost:8080/ws?token=JWT&deviceId=DEVICE_ID`

#### Server Sends
```json
{
  "type": "message",
  "messageId": "...",
  "deviceId": "...",
  "nonce": "...",
  "ciphertext": "...",
  "senderPublicKey": "...",
  "preKeyId": "...",
  "createdAt": 1700000000000
}
```

#### ACK
- Client sends: `{ "type": "ack", "messageId": "..." }`
- Server responds: `{ "type": "ack_ok", "messageId": "..." }`

### 🔁 Offline Sync
If a device reconnects:
- Pending messages are automatically delivered via WebSocket.
- Or retrieved manually: `POST /messages/pull`

## 🔑 PreKey System

### Register PreKeys
`POST /prekeys/register`

**Request Body:**
```json
{
  "deviceId": "...",
  "keyType": "x25519",
  "publicKeys": ["..."]
}
```

### Hygiene Policy
- Keeps latest 100 unused PreKeys per device.
- Deletes older unused keys automatically.
- Never deletes used keys prematurely.

### Claim PreKey (Atomic)
`POST /prekeys/claim`

**Returns Bundle:**
```json
{
  "preKeyId": "...",
  "deviceId": "...",
  "keyType": "x25519",
  "publicKey": "...",
  "identityKey": "...",
  "signedPreKey": "..."
}
```

#### Concurrency Safety
- Uses `FOR UPDATE SKIP LOCKED`.
- Guarantees no duplicate claims and full atomicity under concurrency.

## 📱 Multi-Device Semantics
- Each payload targets a specific device.
- ACK is device-scoped.
- Partial fanout supported (ACK on one device does not delete others).

## 🔁 Idempotency
- Clients provide `clientMessageId`.
- If duplicate send occurs: Same `messageId` returned, no duplicate storage, no duplicate delivery.

## 🛡 Security Hardening

### Rate Limiting
- Global, per-route, and per-device limits on `/messages`.
- PreKey registration throttling.

### Payload Limits
- 1MB body limit.
- Strict JSON Schema validation.
- Maximum length enforcement for `ciphertext`, `nonce`, and `senderPublicKey`.

### Poisoned PreKey Protection
- Server validates that `preKeyId` belongs to the intended device.
- Prevents cross-device misuse.

## 📊 Observability
Structured lifecycle logging:
```json
{
  "messageId": "...",
  "senderUserId": "...",
  "senderDeviceId": "...",
  "recipientUserId": "...",
  "recipientDeviceId": "...",
  "event": "accepted | delivered | acked | expired",
  "transport": "ws | pull",
  "requestId": "..."
}
```

## 🧯 Graceful Shutdown
Handles `SIGINT` and `SIGTERM`:
- Stops accepting new requests.
- Closes WebSocket connections.
- Flushes Redis.
- Closes Prisma connection.

## 🧪 Golden Test Suite
Run full regression suite:
```bash
$env:TOKEN="..."
$env:DEVICE_A="..."
$env:DEVICE_B="..."
npx ts-node scripts/test-all.ts
```
**Covers:** WebSocket ACK confirmation, PreKey hygiene cap enforcement, Atomic claim concurrency, Idempotent send, Offline sync, Multi-device fanout, Rate limiting, and Poisoned key protection.

## ⚙ Environment Variables
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `NODE_ENV`

## 🛠 Running Locally
```bash
npm install
npm run dev
```

## ✅ Production Readiness Status
- WebSocket parity ✔
- Multi-device correctness ✔
- PreKey hygiene ✔
- Atomic claim safety ✔
- Idempotent send ✔
- Offline sync ✔
- Security hardening ✔
- Structured logging ✔
- Graceful shutdown ✔
- Golden regression suite ✔

**Status: Production-ready backend**
