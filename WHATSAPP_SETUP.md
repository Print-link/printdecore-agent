# WhatsApp Integration Setup Guide

This guide explains how to set up WhatsApp integration using `whatsapp-web.js` based on the [official documentation](https://docs.wwebjs.dev/).

## Overview

WhatsApp integration uses `whatsapp-web.js` which requires Node.js and cannot run in the browser. The architecture is:

- **Frontend (React)**: Makes API calls to backend, displays QR codes, handles UI
- **Backend (Node.js)**: Runs `whatsapp-web.js`, manages WhatsApp connection, handles messages

## Backend Setup

### 1. Install Dependencies

In your backend project:

```bash
npm install whatsapp-web.js qrcode-terminal express cors
# or
yarn add whatsapp-web.js qrcode-terminal express cors
```

### 2. Backend Implementation

See `backend-whatsapp-example.js` for a complete example. Key points:

#### Initialize Client

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-session', // Persists session
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});
```

#### Handle QR Code Event

```javascript
client.on('qr', (qr) => {
  // QR code string is generated
  // Send to frontend via API
  qrcode.generate(qr, { small: true }); // Optional: display in terminal
});
```

#### Handle Ready Event

```javascript
client.on('ready', () => {
  console.log('Client is ready!');
  // Client is connected and ready
});
```

#### Initialize Client

```javascript
await client.initialize();
```

### 3. Required API Endpoints

Your backend must implement these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/whatsapp/connect` | Initialize WhatsApp connection, returns QR code |
| GET | `/api/whatsapp/status` | Get connection status and QR code |
| POST | `/api/whatsapp/disconnect` | Disconnect WhatsApp |
| GET | `/api/whatsapp/chats` | Get list of chats |
| GET | `/api/whatsapp/chats/:chatId/messages` | Get messages for a chat |
| POST | `/api/whatsapp/chats/:chatId/messages` | Send a message |
| POST | `/api/whatsapp/chats/:chatId/read` | Mark chat as read |
| GET | `/api/whatsapp/events` | Server-Sent Events for real-time updates (optional) |

### 4. Response Formats

#### Connect Response
```json
{
  "connected": false,
  "qrCode": "QR_CODE_STRING_HERE",
  "message": "Scan QR code to connect"
}
```

#### Status Response
```json
{
  "connected": false,
  "connecting": true,
  "qrCode": "QR_CODE_STRING_HERE"
}
```

#### Chats Response
```json
{
  "chats": [
    {
      "id": "chat_id",
      "name": "Contact Name",
      "unreadCount": 2,
      "lastMessage": {
        "body": "Last message text",
        "timestamp": 1234567890000
      },
      "isGroup": false,
      "pictureUrl": "https://..."
    }
  ]
}
```

#### Messages Response
```json
{
  "messages": [
    {
      "id": "message_id",
      "from": "sender_id",
      "to": "recipient_id",
      "body": "Message text",
      "timestamp": 1234567890000,
      "isFromMe": false,
      "hasMedia": false,
      "mediaUrl": "data:image/png;base64,...",
      "contactName": "Contact Name"
    }
  ]
}
```

## Frontend Setup

The frontend is already configured! It:

1. ✅ Displays QR codes in Settings page
2. ✅ Polls for connection status
3. ✅ Shows chat list with unread counts
4. ✅ Displays conversations
5. ✅ Sends messages
6. ✅ Handles real-time updates

## Connection Flow

1. User clicks "Connect WhatsApp" in Settings
2. Frontend calls `POST /api/whatsapp/connect`
3. Backend initializes `whatsapp-web.js` client
4. Backend receives `qr` event and returns QR code string
5. Frontend displays QR code using `qrcode` library
6. User scans QR code with WhatsApp mobile app
7. Backend receives `ready` event when connected
8. Frontend polls status and detects connection
9. Frontend loads chats and messages

## Session Persistence

`LocalAuth` strategy saves session to `./whatsapp-session` directory. This means:
- User only needs to scan QR code once
- Session persists across server restarts
- To reconnect, just call `client.initialize()`

## Important Notes

⚠️ **WhatsApp does not officially support bots or unofficial clients**
- There's a risk of being blocked
- Use responsibly and at your own risk
- Consider using WhatsApp Business API for production

⚠️ **Requirements**
- Node.js v18 or higher
- Google Chrome (for Puppeteer)
- Sufficient server resources

## Troubleshooting

### QR Code Not Appearing
- Check backend logs for errors
- Ensure Puppeteer can launch Chrome
- Verify `/api/whatsapp/connect` returns QR code

### Connection Timeout
- QR codes expire after ~20 seconds
- Backend should emit new QR code automatically
- Frontend polls and updates QR code display

### Session Issues
- Delete `./whatsapp-session` folder to reset
- Re-initialize client to generate new QR code

## Resources

- [whatsapp-web.js Documentation](https://docs.wwebjs.dev/)
- [Authentication Guide](https://wwebjs.dev/guide/authentication.html)
- [Example Code](https://github.com/pedroslopez/whatsapp-web.js/tree/main/example)
