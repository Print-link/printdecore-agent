import { apiClient } from "./client";

// ─── Labels ────────────────────────────────────────────────────────────

export interface WhatsAppLabel {
  id: string;
  managerId: string;
  name: string;
  color: string;
  sortOrder: number;
  chatCount?: number;
}

export interface ChatLabel {
  chatId: string;
  labelId: string;
  labelName: string;
  labelColor: string;
}

async function getLabels(): Promise<WhatsAppLabel[]> {
  const res = await apiClient.get("/whatsapp/features/labels");
  return res.data.data;
}

async function createLabel(name: string, color: string): Promise<WhatsAppLabel> {
  const res = await apiClient.post("/whatsapp/features/labels", { name, color });
  return res.data.data;
}

async function updateLabel(id: string, data: { name?: string; color?: string }): Promise<WhatsAppLabel> {
  const res = await apiClient.put(`/whatsapp/features/labels/${id}`, data);
  return res.data.data;
}

async function deleteLabel(id: string): Promise<void> {
  await apiClient.delete(`/whatsapp/features/labels/${id}`);
}

async function assignLabel(chatId: string, labelId: string): Promise<void> {
  await apiClient.post("/whatsapp/features/labels/assign", { chatId, labelId });
}

async function removeLabelFromChat(chatId: string, labelId: string): Promise<void> {
  await apiClient.post("/whatsapp/features/labels/remove", { chatId, labelId });
}

async function getChatLabels(chatId: string): Promise<ChatLabel[]> {
  const res = await apiClient.get(`/whatsapp/features/labels/chat/${chatId}`);
  return res.data.data;
}

// ─── Broadcasts ────────────────────────────────────────────────────────

export interface Broadcast {
  id: string;
  name: string;
  messageBody: string;
  mediaUrl?: string;
  mediaType?: string;
  targetType: "all" | "labels" | "manual";
  targetLabelIds?: string[];
  targetChatIds?: string[];
  status: string;
  scheduledAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
}

async function getBroadcasts(): Promise<Broadcast[]> {
  const res = await apiClient.get("/whatsapp/features/broadcasts");
  return res.data.data;
}

async function createBroadcast(data: {
  name: string; messageBody: string; targetType: "all" | "labels" | "manual";
  targetLabelIds?: string[]; targetChatIds?: string[];
  mediaUrl?: string; mediaType?: string; scheduledAt?: string;
}): Promise<Broadcast> {
  const res = await apiClient.post("/whatsapp/features/broadcasts", data);
  return res.data.data;
}

async function sendBroadcast(id: string): Promise<{ recipientCount: number }> {
  const res = await apiClient.post(`/whatsapp/features/broadcasts/${id}/send`);
  return res.data.data;
}

async function getBroadcastDetail(id: string): Promise<Broadcast & { recipients: any[] }> {
  const res = await apiClient.get(`/whatsapp/features/broadcasts/${id}`);
  return res.data.data;
}

// ─── Quick Replies ─────────────────────────────────────────────────────

export interface QuickReply {
  id: string;
  title: string;
  shortcut?: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  category?: string;
  useCount: number;
}

async function getQuickReplies(): Promise<QuickReply[]> {
  const res = await apiClient.get("/whatsapp/features/quick-replies");
  return res.data.data;
}

async function createQuickReply(data: {
  title: string; body: string; shortcut?: string; category?: string;
}): Promise<QuickReply> {
  const res = await apiClient.post("/whatsapp/features/quick-replies", data);
  return res.data.data;
}

async function updateQuickReply(id: string, data: Partial<{
  title: string; body: string; shortcut: string; category: string;
}>): Promise<QuickReply> {
  const res = await apiClient.put(`/whatsapp/features/quick-replies/${id}`, data);
  return res.data.data;
}

async function deleteQuickReply(id: string): Promise<void> {
  await apiClient.delete(`/whatsapp/features/quick-replies/${id}`);
}

async function useQuickReply(id: string): Promise<void> {
  await apiClient.post(`/whatsapp/features/quick-replies/${id}/use`);
}

// ─── CRM Contacts ──────────────────────────────────────────────────────

export interface CrmContact {
  id: string;
  chatId: string;
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  notes?: string;
  avatarUrl?: string;
  customerId?: string;
  source: string;
  lifetimeValue: number;
  totalOrders: number;
  lastOrderAt?: string;
  lastContactedAt?: string;
  tags: string[];
}

async function getContacts(options?: {
  search?: string; tags?: string[]; limit?: number; offset?: number;
}): Promise<CrmContact[]> {
  const params: Record<string, string> = {};
  if (options?.search) params.search = options.search;
  if (options?.tags) params.tags = options.tags.join(",");
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  const res = await apiClient.get("/whatsapp/features/contacts", { params });
  return res.data.data;
}

async function getContactByChatId(chatId: string): Promise<CrmContact | null> {
  const res = await apiClient.get(`/whatsapp/features/contacts/chat/${chatId}`);
  return res.data.data;
}

async function upsertContact(data: {
  chatId: string; phone: string; name?: string; email?: string;
  company?: string; notes?: string; tags?: string[];
}): Promise<CrmContact> {
  const res = await apiClient.post("/whatsapp/features/contacts", data);
  return res.data.data;
}

async function updateContact(id: string, data: Partial<{
  name: string; email: string; company: string; notes: string; tags: string[];
}>): Promise<CrmContact> {
  const res = await apiClient.put(`/whatsapp/features/contacts/${id}`, data);
  return res.data.data;
}

async function getContactStats(): Promise<{ total: number; withEmail: number; topValue: number }> {
  const res = await apiClient.get("/whatsapp/features/contacts/stats");
  return res.data.data;
}

// ─── Interactive Messages ──────────────────────────────────────────────

async function sendPoll(chatId: string, question: string, options: string[], selectableCount?: number): Promise<{ messageId: string; sentMessage?: any }> {
  const res = await apiClient.post("/whatsapp/features/interactive/poll", {
    chatId, question, options, selectableCount,
  });
  return res.data.data;
}

async function sendCatalog(chatId: string, bodyText: string, products: Array<{ name: string; description?: string; price?: string }>, buttonText?: string): Promise<{ messageId: string; sentMessage?: any }> {
  const res = await apiClient.post("/whatsapp/features/interactive/catalog", {
    chatId, bodyText, products, buttonText,
  });
  return res.data.data;
}

async function sendButtonMessage(chatId: string, bodyText: string, buttons: Array<{ text: string; id?: string; type?: string; url?: string }>, footerText?: string): Promise<{ messageId: string }> {
  const res = await apiClient.post("/whatsapp/features/interactive/buttons", {
    chatId, bodyText, buttons, footerText,
  });
  return res.data.data;
}

// ─── Export ────────────────────────────────────────────────────────────

export const whatsappFeaturesApi = {
  // Labels
  getLabels, createLabel, updateLabel, deleteLabel,
  assignLabel, removeLabelFromChat, getChatLabels,
  // Broadcasts
  getBroadcasts, createBroadcast, sendBroadcast, getBroadcastDetail,
  // Quick Replies
  getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply, useQuickReply,
  // CRM Contacts
  getContacts, getContactByChatId, upsertContact, updateContact, getContactStats,
  // Interactive Messages
  sendPoll, sendCatalog, sendButtonMessage,
};
