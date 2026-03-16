import { create } from 'zustand';
import { whatsappService, type WhatsAppChat, type WhatsAppMessage } from '../services/whatsappService';

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
		const { messages, selectedChatId } = get();
		const chatMessages = messages.get(chatId) || [];
		
		// Check if message already exists (avoid duplicates)
		const exists = chatMessages.some(m => m.id === message.id);
		if (!exists) {
			// Create a new array (not mutate existing) - this ensures React detects the change
			const updatedChatMessages = [...chatMessages, message];
			// Sort by timestamp
			updatedChatMessages.sort((a, b) => a.timestamp - b.timestamp);
			
			// Create a completely new Map instance to ensure React detects the change
			const newMessages = new Map(messages);
			newMessages.set(chatId, updatedChatMessages);
			
			// Update state - this will trigger re-render for all components using messages
			set({ messages: newMessages });
			
			console.debug('New message added to chat:', chatId, 'Total messages:', updatedChatMessages.length);
		}
		
		// Refresh chat list to update last message and unread counts
		get().loadChats();
	});

	whatsappService.on('error', (error) => {
		set({ error: error?.message || 'An error occurred' });
	});

	return {
		// Initial state
		isConnected: false,
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
				// Reload messages
				await get().loadMessages(chatId);
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
