export interface WhatsAppChat {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: { body: string; timestamp: number };
  isGroup: boolean;
  pictureUrl?: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  hasMedia: boolean;
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
  contactName?: string;
}

export interface WhatsAppStatusResponse {
  connected: boolean;
  connecting?: boolean;
  syncing?: boolean;
  qrCode?: string;
}

export interface WhatsAppConnectResponse {
  connected: boolean;
  qrCode?: string;
  message?: string;
}

export interface WhatsAppSendResponse {
  success: boolean;
  sentMessage?: WhatsAppMessage;
}
