import { apiClient } from "./client";

async function connectWhatsApp(): Promise<{ connected: boolean; qrCode?: string; message?: string }> {
	const response = await apiClient.post("/whatsapp/connect");
	return response.data;
}

async function disconnectWhatsApp(): Promise<void> {
	await apiClient.post("/whatsapp/disconnect");
}

async function getWhatsAppStatus(): Promise<{ connected: boolean; connecting?: boolean; qrCode?: string }> {
	const response = await apiClient.get("/whatsapp/status");
	return response.data;
}

async function getWhatsAppChats(): Promise<Array<{
	id: string;
	name: string;
	unreadCount: number;
	lastMessage?: { body: string; timestamp: number };
	isGroup: boolean;
	pictureUrl?: string;
}>> {
	const response = await apiClient.get("/whatsapp/chats");
	return response.data.chats || [];
}

async function getWhatsAppChatMessages(
	chatId: string,
	limit: number = 50
): Promise<Array<{
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
}>> {
	const response = await apiClient.get(
		`/whatsapp/chats/${chatId}/messages`,
		{ params: { limit } }
	);
	return response.data.messages || [];
}

async function sendWhatsAppMessage(
	chatId: string,
	message: string,
	quotedMessageId?: string,
): Promise<{ success: boolean; sentMessage?: any }> {
	const response = await apiClient.post(`/whatsapp/chats/${chatId}/messages`, {
		message,
		quotedMessageId,
	});
	return response.data;
}

async function pinChat(chatId: string, pinned: boolean): Promise<void> {
	await apiClient.post(`/whatsapp/chats/${chatId}/pin`, { pinned });
}

async function archiveChat(chatId: string, archived: boolean): Promise<void> {
	await apiClient.post(`/whatsapp/chats/${chatId}/archive`, { archived });
}

async function muteChat(chatId: string, muted: boolean): Promise<void> {
	await apiClient.post(`/whatsapp/chats/${chatId}/mute`, { muted });
}

async function sendTypingIndicator(
	chatId: string,
	type: "composing" | "paused" = "composing",
): Promise<void> {
	await apiClient.post(`/whatsapp/chats/${chatId}/typing`, { type }).catch(() => {});
}

async function reactToMessage(
	chatId: string,
	messageId: string,
	emoji: string,
): Promise<void> {
	await apiClient.post(`/whatsapp/chats/${chatId}/messages/${messageId}/react`, { emoji });
}

async function markWhatsAppChatAsRead(chatId: string): Promise<void> {
	await apiClient.post(`/whatsapp/chats/${chatId}/read`);
}

async function downloadMessageMedia(messageId: string): Promise<{
	mediaUrl: string;
	mimeType: string;
	filename?: string;
} | null> {
	try {
		const response = await apiClient.get(`/whatsapp/messages/${messageId}/media`);
		if (response.data.success) {
			return {
				mediaUrl: response.data.mediaUrl,
				mimeType: response.data.mimeType,
				filename: response.data.filename,
			};
		}
		return null;
	} catch {
		return null;
	}
}

export const whatsappApi = {
	connectWhatsApp,
	disconnectWhatsApp,
	getWhatsAppStatus,
	getWhatsAppChats,
	getWhatsAppChatMessages,
	sendWhatsAppMessage,
	pinChat,
	archiveChat,
	muteChat,
	sendTypingIndicator,
	reactToMessage,
	markWhatsAppChatAsRead,
	downloadMessageMedia,
};
