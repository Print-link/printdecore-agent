export interface WhatsAppChat {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: { body: string; timestamp: number };
  isGroup: boolean;
  pictureUrl?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface QuotedMessage {
  id: string;
  body: string;
  isFromMe: boolean;
  contactName?: string;
  mediaType?: string;
}

export interface MessageReaction {
  emoji: string;
  from: string;
  isFromMe: boolean;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

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
  quotedMessage?: QuotedMessage;
  reactions?: MessageReaction[];
  status?: MessageStatus;
  pollVotes?: PollVoteResult[];
}

export interface PollVoteResult {
  optionName: string;
  voters: string[];
  count: number;
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
