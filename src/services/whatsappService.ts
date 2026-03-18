import { apiService } from './api';
import type { WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';

// Re-export types so existing imports from whatsappService still work
export type { WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';

// Simple browser-compatible EventEmitter
class EventEmitter {
	private events: Record<string, Array<(...args: any[]) => void>> = {};

	on(event: string, listener: (...args: any[]) => void) {
		(this.events[event] ??= []).push(listener);
	}

	off(event: string, listener: (...args: any[]) => void) {
		if (this.events[event]) {
			this.events[event] = this.events[event].filter((l) => l !== listener);
		}
	}

	emit(event: string, ...args: any[]) {
		this.events[event]?.forEach((listener) => {
			try { listener(...args); } catch (e) { console.error(`Event listener error [${event}]:`, e); }
		});
	}

	removeAllListeners(event?: string) {
		if (event) delete this.events[event];
		else this.events = {};
	}
}

class WhatsAppService extends EventEmitter {
	private isConnected: boolean = false;
	private isConnecting: boolean = false;
	private chats: Map<string, WhatsAppChat> = new Map();
	private messages: Map<string, WhatsAppMessage[]> = new Map();
	private eventSource: EventSource | null = null;
	private statusPollingTimer: ReturnType<typeof setTimeout> | null = null;
	private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
	private lastQrCode: string | null = null;
	private sseConnected: boolean = false;
	// Track message IDs we sent, so we can skip SSE duplicates
	_sentMessageIds: Set<string> = new Set();

	/** Only run initial status check once per page load */
	private initialStatusChecked = false;
	private initialStatusCheckPromise: Promise<void> | null = null;

	constructor() {
		super();
		// Restore connection state from sessionStorage to survive refresh
		if (typeof sessionStorage !== 'undefined') {
			this.isConnected = sessionStorage.getItem('wa-connected') === 'true';
		}
	}

	/** Persist connection state so refresh doesn't flash disconnected */
	private persistConnectionState(connected: boolean) {
		this.isConnected = connected;
		if (typeof sessionStorage !== 'undefined') {
			if (connected) {
				sessionStorage.setItem('wa-connected', 'true');
			} else {
				sessionStorage.removeItem('wa-connected');
			}
		}
	}

	/**
	 * Run initial status check once when we have an auth token.
	 * Always verifies with backend on fresh page load, even if sessionStorage
	 * says connected, to catch stale state.
	 */
	ensureInitialStatusChecked(): void {
		if (this.initialStatusChecked || this.initialStatusCheckPromise) {
			return;
		}
		if (typeof localStorage === 'undefined') return;
		if (!localStorage.getItem('auth-token')) return;
		this.initialStatusCheckPromise = this.checkInitialStatus().finally(() => {
			this.initialStatusChecked = true;
			this.initialStatusCheckPromise = null;
		});
	}

	private async checkInitialStatus() {
		try {
			const response = await apiService.getWhatsAppStatus();
			if (response.connected) {
				this.persistConnectionState(true);
				this.emit('ready');
				this.setupEventSource();
				this.loadChats(); // One-time load, then SSE handles updates
			} else if (response.qrCode) {
				// Backend is waiting for QR scan — clear any stale connected state
				this.persistConnectionState(false);
				this.lastQrCode = response.qrCode;
				this.emit('qr', response.qrCode);
			} else {
				// Backend says not connected and no QR — correct stale sessionStorage
				if (this.isConnected) {
					this.persistConnectionState(false);
					this.emit('disconnected');
				}
			}
		} catch (error) {
			console.debug('Initial WhatsApp status check failed:', error);
			// On network error, keep sessionStorage state (optimistic) — SSE will correct it
		}
	}

	// ─── Connect / Disconnect ───────────────────────────────────────────

	async connect() {
		if (this.isConnecting || this.isConnected) {
			return;
		}

		this.isConnecting = true;
		this.emit('connecting');

		// 5 minute timeout
		this.connectionTimeout = setTimeout(() => {
			if (this.isConnecting) {
				this.isConnecting = false;
				this.emit('auth_failure', 'Connection timeout. Please try again.');
				this.stopStatusPolling();
			}
		}, 5 * 60 * 1000);

		try {
			// Set up SSE FIRST so we catch QR codes and ready events in real-time
			this.setupEventSource();

			const response = await apiService.connectWhatsApp();

			if (response.qrCode) {
				this.lastQrCode = response.qrCode;
				this.emit('qr', response.qrCode);
			}

			if (response.connected) {
				this.handleConnected();
			} else {
				// Poll status only as fallback for QR code updates
				// (SSE already handles this, but poll as backup)
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

	async disconnect() {
		try {
			await apiService.disconnectWhatsApp();
		} catch (error) {
			console.error('Error disconnecting:', error);
		}

		this.cleanup();
		this.emit('disconnected');
	}

	// ─── Status Polling (only during QR scan, not after connected) ──────

	private startStatusPolling() {
		if (this.statusPollingTimer) return;

		let pollCount = 0;
		const maxPolls = 60; // 5 minutes max

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

				if (response.qrCode && response.qrCode !== this.lastQrCode) {
					this.lastQrCode = response.qrCode;
					this.emit('qr', response.qrCode);
				}

				pollCount++;
				if (pollCount < maxPolls) {
					// Poll every 5 seconds during QR scan
					this.statusPollingTimer = setTimeout(poll, 5000);
				} else {
					this.isConnecting = false;
					this.stopStatusPolling();
					this.emit('auth_failure', 'Connection timeout. QR code may have expired.');
				}
			} catch (error) {
				if ((error as any)?.response?.status === 401) {
					this.isConnecting = false;
					this.stopStatusPolling();
					return;
				}
				pollCount++;
				if (pollCount < maxPolls) {
					this.statusPollingTimer = setTimeout(poll, 10000);
				}
			}
		};

		poll();
	}

	private stopStatusPolling() {
		if (this.statusPollingTimer) {
			clearTimeout(this.statusPollingTimer);
			this.statusPollingTimer = null;
		}
		if (this.connectionTimeout) {
			clearTimeout(this.connectionTimeout);
			this.connectionTimeout = null;
		}
	}

	// ─── SSE (Server-Sent Events) — the primary real-time transport ─────

	private setupEventSource() {
		if (this.eventSource) {
			this.eventSource.close();
		}

		try {
			const token = localStorage.getItem('auth-token');
			if (!token) return;

			const API_BASE_URL =
				import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
			const url = `${API_BASE_URL}/whatsapp/events?token=${encodeURIComponent(token)}`;

			this.eventSource = new EventSource(url);

			this.eventSource.onopen = () => {
				this.sseConnected = true;
				console.debug('SSE connected');
			};

			this.eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.handleSSEEvent(data);
				} catch (error) {
					console.error('Error parsing SSE data:', error);
				}
			};

			this.eventSource.onerror = () => {
				this.sseConnected = false;
				// EventSource auto-reconnects — no polling fallback needed
			};
		} catch (error) {
			console.warn('EventSource setup failed:', error);
		}
	}

	private handleSSEEvent(data: any) {
		switch (data.type) {
			case 'qr':
				if (data.qrCode) {
					this.lastQrCode = data.qrCode;
					this.emit('qr', data.qrCode);
				}
				break;

			case 'ready':
				this.handleConnected();
				break;

			case 'new_message': {
				// Skip if this is the echo of a message we just sent
				if (data.message?.id && this._sentMessageIds.has(data.message.id)) {
					this._sentMessageIds.delete(data.message.id);
					break;
				}
				const chatId = data.chatId;
				if (!chatId) break;
				const chatMessages = this.messages.get(chatId) || [];
				const exists = chatMessages.some(m => m.id === data.message.id);
				if (!exists) {
					const updated = [...chatMessages, data.message];
					updated.sort((a, b) => a.timestamp - b.timestamp);
					this.messages.set(chatId, updated);
				}
				this.emit('new_message', data.message, chatId);
				break;
			}

			case 'chats_updated':
				if (data.chats) {
					const chatMap = new Map<string, WhatsAppChat>();
					data.chats.forEach((chat: WhatsAppChat) => chatMap.set(chat.id, chat));
					this.chats = chatMap;
					this.emit('chats_updated', data.chats);
				}
				break;

			case 'message_status':
				this.emit('message_status', data);
				break;

			case 'disconnected':
				this.persistConnectionState(false);
				this.emit('disconnected', data.reason || 'Connection lost');
				break;

			case 'connected':
				// SSE connection established — if backend status says connected, restore state
				if (data.status === 'connected') {
					this.handleConnected();
				}
				break;
		}
	}

	// ─── Connection State ───────────────────────────────────────────────

	private handleConnected() {
		this.persistConnectionState(true);
		this.isConnecting = false;
		this.lastQrCode = null;
		this.stopStatusPolling();
		this.emit('ready');

		// Set up SSE if not already running
		if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
			this.setupEventSource();
		}

		// Load chats once — SSE handles updates from here
		this.loadChats();
	}

	private cleanup() {
		this.stopStatusPolling();

		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}

		this.persistConnectionState(false);
		this.isConnecting = false;
		this.sseConnected = false;
		this.lastQrCode = null;
		this.chats.clear();
		this.messages.clear();
	}

	// ─── Data Methods ───────────────────────────────────────────────────

	async loadChats() {
		if (!this.isConnected) return;

		try {
			const chats = await apiService.getWhatsAppChats();
			const chatMap = new Map<string, WhatsAppChat>();
			chats.forEach((chat) => chatMap.set(chat.id, chat));
			this.chats = chatMap;
			this.emit('chats_updated', chats);
		} catch (error) {
			console.error('Error loading chats:', error);
			this.emit('error', error);
		}
	}

	async getChats(): Promise<WhatsAppChat[]> {
		if (!this.isConnected) return [];

		// Return cached chats immediately (SSE keeps them fresh)
		if (this.chats.size > 0) {
			return Array.from(this.chats.values()).sort((a, b) => {
				const aTime = a.lastMessage?.timestamp || 0;
				const bTime = b.lastMessage?.timestamp || 0;
				return bTime - aTime;
			});
		}

		// First load
		await this.loadChats();
		return Array.from(this.chats.values()).sort((a, b) => {
			const aTime = a.lastMessage?.timestamp || 0;
			const bTime = b.lastMessage?.timestamp || 0;
			return bTime - aTime;
		});
	}

	async getChatMessages(chatId: string, limit: number = 50, forceRefresh: boolean = false): Promise<WhatsAppMessage[]> {
		if (!this.isConnected) return [];

		// Return cache (SSE adds new messages in real-time)
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

		const tempId = `temp-${Date.now()}`;
		const tempMessage: WhatsAppMessage = {
			id: tempId,
			from: 'me',
			to: chatId,
			body: message,
			timestamp: Date.now(),
			isFromMe: true,
			hasMedia: false,
		};

		try {
			// Optimistic update — add temp message to THIS chat only
			const chatMessages = this.messages.get(chatId) || [];
			chatMessages.push(tempMessage);
			this.messages.set(chatId, [...chatMessages]);
			this.emit('new_message', tempMessage, chatId);

			const response = await apiService.sendWhatsAppMessage(chatId, message);

			// Replace temp message with real one if returned
			if (response && (response as any).sentMessage) {
				const realMessage = (response as any).sentMessage;
				// Track the real ID so we skip the SSE duplicate when it arrives
				this._sentMessageIds.add(realMessage.id);
				setTimeout(() => this._sentMessageIds.delete(realMessage.id), 10000);

				const current = this.messages.get(chatId) || [];
				const updated = current.map(m =>
					m.id === tempId ? realMessage : m
				);
				this.messages.set(chatId, updated);
				// Emit a 'messages_updated' event instead of 'new_message' to avoid duplicates
				this.emit('messages_updated', chatId);
			}

			return true;
		} catch (error) {
			console.error('Error sending message:', error);
			const chatMessages = this.messages.get(chatId) || [];
			this.messages.set(chatId, chatMessages.filter(m => m.id !== tempId));
			this.emit('error', error);
			throw error;
		}
	}

	async markAsRead(chatId: string): Promise<void> {
		if (!this.isConnected) return;

		try {
			await apiService.markWhatsAppChatAsRead(chatId);
			// Update local cache immediately instead of re-fetching
			const chat = this.chats.get(chatId);
			if (chat) {
				chat.unreadCount = 0;
				this.emit('chats_updated', Array.from(this.chats.values()));
			}
		} catch (error) {
			console.error('Error marking as read:', error);
		}
	}

	getMessagesForChat(chatId: string): WhatsAppMessage[] | undefined {
		return this.messages.get(chatId);
	}

	getConnectionStatus() {
		return {
			isConnected: this.isConnected,
			isConnecting: this.isConnecting,
		};
	}
}

export const whatsappService = new WhatsAppService();
