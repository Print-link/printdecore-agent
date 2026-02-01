import { apiService } from './api';

// Simple browser-compatible EventEmitter
class EventEmitter {
	private events: { [key: string]: Array<(...args: any[]) => void> } = {};

	on(event: string, listener: (...args: any[]) => void) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(listener);
	}

	off(event: string, listener: (...args: any[]) => void) {
		if (this.events[event]) {
			this.events[event] = this.events[event].filter((l) => l !== listener);
		}
	}

	emit(event: string, ...args: any[]) {
		if (this.events[event]) {
			this.events[event].forEach((listener) => {
				try {
					listener(...args);
				} catch (error) {
					console.error(`Error in event listener for ${event}:`, error);
				}
			});
		}
	}

	removeAllListeners(event?: string) {
		if (event) {
			delete this.events[event];
		} else {
			this.events = {};
		}
	}
}

export interface WhatsAppChat {
	id: string;
	name: string;
	unreadCount: number;
	lastMessage?: {
		body: string;
		timestamp: number;
	};
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
	contactName?: string;
}

class WhatsAppService extends EventEmitter {
	private isConnected: boolean = false;
	private isConnecting: boolean = false;
	private chats: Map<string, WhatsAppChat> = new Map();
	private messages: Map<string, WhatsAppMessage[]> = new Map();
	private pollingInterval: ReturnType<typeof setInterval> | null = null;
	private statusPollingInterval: ReturnType<typeof setInterval> | null = null;
	private eventSource: EventSource | null = null;
	private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
	private lastQrCode: string | null = null;

	constructor() {
		super();
		// Check initial connection status
		this.checkInitialStatus();
	}

	/**
	 * Check if WhatsApp is already connected when service initializes
	 */
	private async checkInitialStatus() {
		try {
			const response = await apiService.getWhatsAppStatus();
			if (response.connected) {
				this.isConnected = true;
				this.emit('ready');
				this.startPolling();
				this.setupEventSource();
			} else if (response.qrCode) {
				this.lastQrCode = response.qrCode;
				this.emit('qr', response.qrCode);
			}
		} catch (error) {
			// Silently fail on initial check - user might not have backend running
			console.debug('Initial WhatsApp status check failed:', error);
		}
	}

	async connect() {
		if (this.isConnecting || this.isConnected) {
			return;
		}

		this.isConnecting = true;
		this.emit('connecting');

		// Set timeout for connection (5 minutes)
		this.connectionTimeout = setTimeout(() => {
			if (this.isConnecting) {
				this.isConnecting = false;
				this.emit('auth_failure', 'Connection timeout. Please try again.');
				this.stopStatusPolling();
			}
		}, 5 * 60 * 1000);

		try {
			const response = await apiService.connectWhatsApp();
			
			if (response.qrCode) {
				this.lastQrCode = response.qrCode;
				this.emit('qr', response.qrCode);
			}

			if (response.connected) {
				this.handleConnected();
			} else {
				// Start polling for connection status with QR code refresh
				this.startStatusPolling();
			}
		} catch (error: any) {
			this.isConnecting = false;
			this.stopStatusPolling();
			if (this.connectionTimeout) {
				clearTimeout(this.connectionTimeout);
				this.connectionTimeout = null;
			}
			this.emit('error', error);
			throw error;
		}
	}

	/**
	 * Optimized status polling with exponential backoff and QR refresh
	 */
	private startStatusPolling() {
		if (this.statusPollingInterval) {
			return; // Already polling
		}

		let pollCount = 0;
		const maxPolls = 120; // 10 minutes max (120 * 5s)
		const baseInterval = 3000; // Start with 3 seconds
		const maxInterval = 10000; // Max 10 seconds

		const poll = async () => {
			if (!this.isConnecting || this.isConnected) {
				this.stopStatusPolling();
				return;
			}

			try {
				const response = await apiService.getWhatsAppStatus();
				
				if (response.connected) {
					this.handleConnected();
					this.stopStatusPolling();
					return;
				}

				// Update QR code if it changed or expired
				if (response.qrCode && response.qrCode !== this.lastQrCode) {
					this.lastQrCode = response.qrCode;
					this.emit('qr', response.qrCode);
				}

				pollCount++;
				
				// Continue polling with adaptive interval
				if (pollCount < maxPolls) {
					const interval = Math.min(
						baseInterval + (pollCount * 50), // Gradually increase
						maxInterval
					);
					this.statusPollingInterval = setTimeout(poll, interval);
				} else {
					this.isConnecting = false;
					this.stopStatusPolling();
					this.emit('auth_failure', 'Connection timeout. QR code may have expired. Please try again.');
				}
			} catch (error) {
				pollCount++;
				if (pollCount < maxPolls) {
					// On error, use longer interval
					this.statusPollingInterval = setTimeout(poll, maxInterval);
				} else {
					this.isConnecting = false;
					this.stopStatusPolling();
					this.emit('error', error);
				}
			}
		};

		// Start polling immediately
		poll();
	}

	private stopStatusPolling() {
		if (this.statusPollingInterval) {
			clearTimeout(this.statusPollingInterval);
			this.statusPollingInterval = null;
		}
		if (this.connectionTimeout) {
			clearTimeout(this.connectionTimeout);
			this.connectionTimeout = null;
		}
	}

	private handleConnected() {
		this.isConnected = true;
		this.isConnecting = false;
		this.lastQrCode = null;
		this.stopStatusPolling();
		this.emit('ready');
		this.startPolling();
		this.setupEventSource();
		// Load chats immediately
		this.loadChats();
	}

	private startPolling() {
		// Poll for new messages and connection status
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}

		this.pollingInterval = setInterval(async () => {
			if (!this.isConnected) {
				return;
			}

			try {
				// Check connection status first
				const status = await apiService.getWhatsAppStatus();
				if (!status.connected) {
					// Connection lost
					this.isConnected = false;
					this.emit('disconnected', 'Connection lost');
					this.stopPolling();
					return;
				}

				// Load chats to keep them up to date
				await this.loadChats();
			} catch (error) {
				console.error('Error polling:', error);
				// If it's an auth error, connection might be lost
				if ((error as any)?.response?.status === 401) {
					this.isConnected = false;
					this.emit('disconnected', 'Authentication failed');
					this.stopPolling();
				}
			}
		}, 5000); // Poll every 5 seconds for more real-time updates
	}

	private stopPolling() {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
			this.pollingInterval = null;
		}
	}

	private setupEventSource() {
		// Use Server-Sent Events for real-time updates if available
		if (this.eventSource) {
			this.eventSource.close();
		}

		try {
			const token = localStorage.getItem("auth-token");
			if (!token) {
				console.warn('No auth token found, skipping EventSource setup');
				return;
			}
			
			const API_BASE_URL =
				import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
			// URL encode the token to handle special characters
			const eventSourceUrl = `${API_BASE_URL}/whatsapp/events?token=${encodeURIComponent(token)}`;
			
			this.eventSource = new EventSource(eventSourceUrl);
			
			this.eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					
					if (data.type === 'new_message') {
						// Add message to cache immediately (avoid duplicates)
						const chatMessages = this.messages.get(data.chatId) || [];
						const exists = chatMessages.some(m => m.id === data.message.id);
						if (!exists) {
							chatMessages.push(data.message);
							// Sort by timestamp
							chatMessages.sort((a, b) => a.timestamp - b.timestamp);
							this.messages.set(data.chatId, chatMessages);
						}
						
						this.emit('new_message', data.message, data.chatId);
					} else if (data.type === 'chats_updated') {
						// Update chats immediately from SSE
						const chatMap = new Map<string, WhatsAppChat>();
						data.chats.forEach((chat: WhatsAppChat) => {
							chatMap.set(chat.id, chat);
						});
						this.chats = chatMap;
						this.emit('chats_updated', data.chats);
					} else if (data.type === 'ready') {
						this.isConnected = true;
						this.emit('ready');
						this.loadChats();
					} else if (data.type === 'disconnected') {
						this.isConnected = false;
						this.emit('disconnected', data.reason || 'Connection lost');
						this.stopPolling();
					} else if (data.type === 'qr') {
						this.emit('qr', data.qrCode);
					} else if (data.type === 'connected') {
						// SSE connection established
						console.log('SSE connection established');
					}
				} catch (error) {
					console.error('Error parsing SSE data:', error);
				}
			};

			this.eventSource.onerror = (error) => {
				console.warn('EventSource error, falling back to polling:', error);
				// EventSource will auto-reconnect, but we rely on polling as backup
			};
		} catch (error) {
			console.warn('EventSource not available, using polling only:', error);
		}
	}

	async disconnect() {
		try {
			await apiService.disconnectWhatsApp();
		} catch (error) {
			console.error('Error disconnecting:', error);
		}

		this.stopPolling();
		this.stopStatusPolling();

		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}

		this.isConnected = false;
		this.isConnecting = false;
		this.lastQrCode = null;
		this.chats.clear();
		this.messages.clear();
		this.emit('disconnected');
	}

	async loadChats() {
		if (!this.isConnected) {
			return;
		}

		try {
			const chats = await apiService.getWhatsAppChats();
			
			const chatMap = new Map<string, WhatsAppChat>();
			chats.forEach((chat) => {
				chatMap.set(chat.id, chat);
			});

			this.chats = chatMap;
			this.emit('chats_updated', chats);
		} catch (error) {
			console.error('Error loading chats:', error);
			this.emit('error', error);
		}
	}

	async getChats(): Promise<WhatsAppChat[]> {
		if (!this.isConnected) {
			return [];
		}

		await this.loadChats();
		return Array.from(this.chats.values()).sort((a, b) => {
			const aTime = a.lastMessage?.timestamp || 0;
			const bTime = b.lastMessage?.timestamp || 0;
			return bTime - aTime;
		});
	}

	async getChatMessages(chatId: string, limit: number = 50, forceRefresh: boolean = false): Promise<WhatsAppMessage[]> {
		if (!this.isConnected) {
			return [];
		}

		// Check cache first (unless force refresh)
		if (!forceRefresh && this.messages.has(chatId)) {
			return this.messages.get(chatId) || [];
		}

		try {
			const messages = await apiService.getWhatsAppChatMessages(chatId, limit);
			this.messages.set(chatId, messages);
			return messages;
		} catch (error) {
			console.error('Error loading messages:', error);
			this.emit('error', error);
			return [];
		}
	}

	async sendMessage(chatId: string, message: string): Promise<boolean> {
		if (!this.isConnected) {
			throw new Error('WhatsApp client is not connected');
		}

		const tempMessage: WhatsAppMessage = {
			id: `temp-${Date.now()}`,
			from: 'me',
			to: chatId,
			body: message,
			timestamp: Date.now(),
			isFromMe: true,
			hasMedia: false,
		};

		try {
			// Optimistically add message to cache for immediate UI update
			const chatMessages = this.messages.get(chatId) || [];
			chatMessages.push(tempMessage);
			this.messages.set(chatId, chatMessages);
			this.emit('new_message', tempMessage, chatId);

			// Send message to backend
			const response = await apiService.sendWhatsAppMessage(chatId, message);
			
			// If backend returns the sent message, use it; otherwise reload
			if (response && (response as any).sentMessage) {
				// Replace temp message with real message
				const realMessage = (response as any).sentMessage;
				const updatedMessages = chatMessages.map(m => 
					m.id === tempMessage.id ? realMessage : m
				);
				this.messages.set(chatId, updatedMessages);
				this.emit('new_message', realMessage, chatId);
			} else {
				// Reload messages to get the actual message from server
				setTimeout(async () => {
					try {
						await this.getChatMessages(chatId, 50, true); // Force refresh
					} catch (error) {
						console.error('Error reloading messages:', error);
					}
				}, 300);
			}

			// Refresh chats list to update last message
			setTimeout(async () => {
				try {
					await this.loadChats();
				} catch (error) {
					console.error('Error refreshing chats:', error);
				}
			}, 500);

			return true;
		} catch (error) {
			console.error('Error sending message:', error);
			// Remove optimistic message on error
			const chatMessages = this.messages.get(chatId) || [];
			this.messages.set(chatId, chatMessages.filter(m => m.id !== tempMessage.id));
			this.emit('error', error);
			throw error;
		}
	}

	async markAsRead(chatId: string): Promise<void> {
		if (!this.isConnected) {
			return;
		}

		try {
			await apiService.markWhatsAppChatAsRead(chatId);
			await this.loadChats(); // Refresh chats to update unread count
		} catch (error) {
			console.error('Error marking as read:', error);
		}
	}

	getConnectionStatus() {
		return {
			isConnected: this.isConnected,
			isConnecting: this.isConnecting,
		};
	}
}

export const whatsappService = new WhatsAppService();
