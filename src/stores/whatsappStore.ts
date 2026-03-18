import { create } from 'zustand';
import { whatsappService, type WhatsAppChat, type WhatsAppMessage } from '../services/whatsappService';
import { playNotificationSound } from '../contexts/SettingsContext';

interface WhatsAppState {
	// Connection state
	isConnected: boolean;
	isConnecting: boolean;
	qrCode: string | null;
	error: string | null;

	// Chats and messages
	chats: WhatsAppChat[];
	selectedChatId: string | null;
	messages: Map<string, WhatsAppMessage[]>;

	// Actions
	setIsConnected: (connected: boolean) => void;
	setIsConnecting: (connecting: boolean) => void;
	setQrCode: (qr: string | null) => void;
	setError: (error: string | null) => void;
	setChats: (chats: WhatsAppChat[]) => void;
	setSelectedChat: (chatId: string | null) => void;
	setMessages: (chatId: string, messages: WhatsAppMessage[]) => void;
	addMessage: (chatId: string, message: WhatsAppMessage) => void;
	updateChat: (chat: WhatsAppChat) => void;
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	loadChats: () => Promise<void>;
	loadMessages: (chatId: string) => Promise<void>;
	sendMessage: (chatId: string, message: string) => Promise<void>;
	markAsRead: (chatId: string) => Promise<void>;
	ensureStatusChecked: () => void;
}

export const useWhatsAppStore = create<WhatsAppState>((set, get) => {
	// Setup event listeners
	whatsappService.on('qr', (qr) => {
		set({ qrCode: qr, error: null });
	});

	whatsappService.on('ready', () => {
		set({ isConnected: true, isConnecting: false, qrCode: null, error: null });
		get().loadChats();
	});

	whatsappService.on('authenticated', () => {
		set({ error: null });
	});

	whatsappService.on('auth_failure', (msg) => {
		set({ isConnected: false, isConnecting: false, error: msg || 'Authentication failed' });
	});

	whatsappService.on('disconnected', () => {
		set({ isConnected: false, isConnecting: false, qrCode: null });
	});

	whatsappService.on('connecting', () => {
		set({ isConnecting: true, error: null });
	});

	whatsappService.on('chats_updated', (chats) => {
		set({ chats });
	});

	whatsappService.on('new_message', (message: WhatsAppMessage, chatId: string) => {
		if (!chatId || !message) return;
		const { messages } = get();
		const chatMessages = messages.get(chatId) || [];

		// Check if message already exists (avoid duplicates) — also check for temp messages
		const exists = chatMessages.some(m =>
			m.id === message.id ||
			(m.id.startsWith('temp-') && m.body === message.body && m.isFromMe && message.isFromMe)
		);
		if (!exists) {
			const updatedChatMessages = [...chatMessages, message];
			updatedChatMessages.sort((a, b) => a.timestamp - b.timestamp);

			const newMessages = new Map(messages);
			newMessages.set(chatId, updatedChatMessages);
			set({ messages: newMessages });

			// Play notification sound for incoming messages
			if (!message.isFromMe) {
				playNotificationSound('message');
			}
		}

		// Refresh chat list to update last message and unread counts
		get().loadChats();
	});

	// When a sent message's temp ID is replaced with real ID, refresh that chat's messages
	whatsappService.on('messages_updated', (chatId: string) => {
		if (!chatId) return;
		const { messages } = get();
		const serviceMessages = whatsappService.getMessagesForChat(chatId);
		if (serviceMessages) {
			const newMessages = new Map(messages);
			newMessages.set(chatId, [...serviceMessages]);
			set({ messages: newMessages });
		}
	});

	whatsappService.on('error', (error) => {
		set({ error: error?.message || 'An error occurred' });
	});

	return {
		// Initial state — restore connection flag from service (which reads sessionStorage)
		isConnected: whatsappService.getConnectionStatus().isConnected,
		isConnecting: false,
		qrCode: null,
		error: null,
		chats: [],
		selectedChatId: null,
		messages: new Map(),

		// Setters
		setIsConnected: (connected) => set({ isConnected: connected }),
		setIsConnecting: (connecting) => set({ isConnecting: connecting }),
		setQrCode: (qr) => set({ qrCode: qr }),
		setError: (error) => set({ error }),
		setChats: (chats) => set({ chats }),
		setSelectedChat: (chatId) => set({ selectedChatId: chatId }),
		setMessages: (chatId, messages) => {
			const currentMessages = new Map(get().messages);
			currentMessages.set(chatId, messages);
			set({ messages: currentMessages });
		},
		addMessage: (chatId, message) => {
			const { messages } = get();
			const chatMessages = messages.get(chatId) || [];
			chatMessages.push(message);
			const newMessages = new Map(messages);
			newMessages.set(chatId, chatMessages);
			set({ messages: newMessages });
		},
		updateChat: (chat) => {
			const { chats } = get();
			const updatedChats = chats.map((c) => (c.id === chat.id ? chat : c));
			set({ chats: updatedChats });
		},

		// Actions
		connect: async () => {
			try {
				set({ error: null });
				await whatsappService.connect();
			} catch (error: any) {
				set({ error: error?.message || 'Failed to connect' });
				throw error;
			}
		},

		disconnect: async () => {
			try {
				await whatsappService.disconnect();
				set({
					isConnected: false,
					isConnecting: false,
					qrCode: null,
					chats: [],
					messages: new Map(),
					selectedChatId: null,
				});
			} catch (error: any) {
				set({ error: error?.message || 'Failed to disconnect' });
			}
		},

		loadChats: async () => {
			try {
				const chats = await whatsappService.getChats();
				set({ chats });
			} catch (error: any) {
				set({ error: error?.message || 'Failed to load chats' });
			}
		},

		loadMessages: async (chatId, limit = 50, forceRefresh = false) => {
			try {
				const messages = await whatsappService.getChatMessages(chatId, limit, forceRefresh);
				get().setMessages(chatId, messages);
			} catch (error: any) {
				set({ error: error?.message || 'Failed to load messages' });
			}
		},

		sendMessage: async (chatId, message) => {
			try {
				await whatsappService.sendMessage(chatId, message);
				// Messages are updated via optimistic update + messages_updated event
				// No need to reload — avoids fetching stale/mixed data
			} catch (error: any) {
				set({ error: error?.message || 'Failed to send message' });
				throw error;
			}
		},

		markAsRead: async (chatId) => {
			try {
				await whatsappService.markAsRead(chatId);
				await get().loadChats();
			} catch (error: any) {
				console.error('Failed to mark as read:', error);
			}
		},

		ensureStatusChecked: () => {
			whatsappService.ensureInitialStatusChecked();
		},
	};
});
