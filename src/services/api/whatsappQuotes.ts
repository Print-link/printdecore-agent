import { apiClient } from "./client";

export interface CreateQuoteParams {
  chatId: string;
  businessPhoneNumber: string;
  contactPhone: string;
  contactName?: string;
  category: string;
  description?: string;
  amount: number;
  currency?: string;
  branchId?: string;
  paymentType?: "online" | "cash";
}

export interface WhatsAppQuote {
  id: string;
  chatId: string;
  category: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentLink?: string;
  createdAt: string;
}

export interface CreateQuoteResponse {
  success: boolean;
  data: {
    quote: WhatsAppQuote;
    paymentLink: string;
    messageText: string;
  };
}

async function createWhatsAppQuote(
  params: CreateQuoteParams
): Promise<CreateQuoteResponse> {
  const response = await apiClient.post("/whatsapp-quotes", params);
  return response.data;
}

async function setQuoteMessageId(
  quoteId: string,
  whatsappMessageId: string
): Promise<void> {
  await apiClient.patch(`/whatsapp-quotes/${quoteId}/message`, {
    whatsappMessageId,
  });
}

async function getQuotesForChat(chatId: string): Promise<WhatsAppQuote[]> {
  const response = await apiClient.get(`/whatsapp-quotes/chat/${chatId}`);
  return response.data.data || [];
}

async function cancelQuote(quoteId: string): Promise<void> {
  await apiClient.patch(`/whatsapp-quotes/${quoteId}/cancel`);
}

export const whatsappQuoteApi = {
  createWhatsAppQuote,
  setQuoteMessageId,
  getQuotesForChat,
  cancelQuote,
};
