import { useState, useEffect, useMemo, useCallback } from "react";
import { useWhatsAppStore } from "../../../stores/whatsappStore";
import type { WhatsAppMessage } from "../../../types/whatsapp";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { apiService } from "../../../services/api";
import { usePlanFeature } from "../../../hooks/usePlanFeature";

// ─── Modular components ─────────────────────────────────────────────────
import ConversationHeader from "./ConversationHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QuoteTracker from "./QuoteTracker";
import ContactCrmPanel from "./ContactCrmPanel";
import SendQuoteModal from "./SendQuoteModal";
import SendPollModal from "./SendPollModal";
import SendCatalogModal from "./SendCatalogModal";

// ─── Types ──────────────────────────────────────────────────────────────

interface ConversationViewProps {
  chatId: string;
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function ConversationView({ chatId }: ConversationViewProps) {
  const t = useThemeClasses();
  const {
    chats, messages, isLoadingMessages, typingChats,
    sendMessage, reactToMessage, sendTypingIndicator, stopTypingIndicator,
    loadMessages, setSelectedChat,
  } = useWhatsAppStore();

  // ─── Plan features ────────────────────────────────────────────────
  const { allowed: hasLabels } = usePlanFeature("hasWhatsappLabels");
  const { allowed: hasCrm } = usePlanFeature("hasCrm");
  const { allowed: hasWhatsapp } = usePlanFeature("hasWhatsapp");
  const { allowed: hasPolls } = usePlanFeature("hasWhatsappPolls");
  const { allowed: hasCatalog } = usePlanFeature("hasWhatsappCatalog");

  // ─── Local state ──────────────────────────────────────────────────
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<WhatsAppMessage | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
  const [downloadingFile, setDownloadingFile] = useState<Set<string>>(new Set());
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  // ─── Derived state ────────────────────────────────────────────────
  const chat = chats.find((c) => c.id === chatId);
  const isContactTyping = typingChats.has(chatId);
  const isDirectChat = chat && !chat.isGroup;
  const chatMessages = useMemo(() => messages.get(chatId) || [], [messages, chatId]);
  const contactPhone = chatId.replace("@s.whatsapp.net", "").replace("@c.us", "");

  // ─── Effects ──────────────────────────────────────────────────────

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
      setReplyingTo(null);
      setReactionPickerMsgId(null);
    }
  }, [chatId, loadMessages]);

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || isSending) return;
    const text = messageText.trim();
    const quotedId = replyingTo?.id;
    setMessageText("");
    setReplyingTo(null);
    setIsSending(true);
    stopTypingIndicator(chatId);
    try {
      await sendMessage(chatId, text, quotedId);
    } catch {
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  }, [messageText, isSending, replyingTo, chatId, sendMessage, stopTypingIndicator]);

  const handleReact = useCallback((msgId: string, emoji: string) => {
    reactToMessage(chatId, msgId, emoji);
    setReactionPickerMsgId(null);
  }, [chatId, reactToMessage]);

  const handleToggleReactionPicker = useCallback((msgId: string) => {
    setReactionPickerMsgId((prev) => (prev === msgId ? null : msgId));
  }, []);

  const handleSaveFile = useCallback(async (url: string, filename: string, messageId: string) => {
    setDownloadingFile((prev) => new Set(prev).add(messageId));
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloadingFile((prev) => { const n = new Set(prev); n.delete(messageId); return n; });
    }
  }, []);

  const handleDownloadMedia = useCallback(async (messageId: string) => {
    setLoadingMedia((prev) => new Set(prev).add(messageId));
    try {
      const result = await apiService.downloadMessageMedia(messageId);
      if (result?.mediaUrl) {
        const chatMsgs = messages.get(chatId);
        if (chatMsgs) {
          useWhatsAppStore.getState().setMessages(chatId, chatMsgs.map((m) => m.id === messageId ? { ...m, mediaUrl: result.mediaUrl } : m));
        }
        await handleSaveFile(result.mediaUrl, result.filename || "file", messageId);
      }
    } catch { /* silent */ } finally {
      setLoadingMedia((prev) => { const n = new Set(prev); n.delete(messageId); return n; });
    }
  }, [chatId, messages, handleSaveFile]);

  const handleQuoteSent = useCallback(async (_quoteId: string, text: string) => {
    try { await sendMessage(chatId, text); } catch { /* silent */ }
  }, [chatId, sendMessage]);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col h-full", t.surfaceInset)}>
      <ConversationHeader
        chat={chat}
        chatId={chatId}
        isLoading={isLoadingMessages}
        isTyping={isContactTyping}
        hasLabels={hasLabels}
        hasPolls={hasPolls}
        hasCatalog={hasCatalog}
        onBack={() => setSelectedChat(null)}
        onShowQuote={() => setShowQuoteModal(true)}
        onShowPoll={() => setShowPollModal(true)}
        onShowCatalog={() => setShowCatalogModal(true)}
      />

      {isDirectChat && <QuoteTracker chatId={chatId} />}
      {isDirectChat && hasCrm && (
        <ContactCrmPanel chatId={chatId} contactPhone={contactPhone} contactName={chat?.name} />
      )}

      <MessageList
        chatMessages={chatMessages}
        isLoading={isLoadingMessages}
        reactionPickerMsgId={reactionPickerMsgId}
        downloadingFile={downloadingFile}
        loadingMedia={loadingMedia}
        onReply={setReplyingTo}
        onReact={handleReact}
        onToggleReactionPicker={handleToggleReactionPicker}
        onSaveFile={handleSaveFile}
        onDownloadMedia={handleDownloadMedia}
      />

      <MessageInput
        messageText={messageText}
        isSending={isSending}
        replyingTo={replyingTo}
        hasQuickReplies={hasWhatsapp}
        onMessageChange={setMessageText}
        onSend={handleSend}
        onCancelReply={() => setReplyingTo(null)}
        onTyping={() => sendTypingIndicator(chatId)}
      />

      {/* Modals */}
      {isDirectChat && (
        <>
          <SendQuoteModal
            open={showQuoteModal}
            onClose={() => setShowQuoteModal(false)}
            chatId={chatId}
            contactPhone={contactPhone}
            contactName={chat?.name}
            businessPhoneNumber=""
            onQuoteSent={handleQuoteSent}
          />
          {hasPolls && <SendPollModal open={showPollModal} onClose={() => setShowPollModal(false)} chatId={chatId} />}
          {hasCatalog && <SendCatalogModal open={showCatalogModal} onClose={() => setShowCatalogModal(false)} chatId={chatId} />}
        </>
      )}
    </div>
  );
}
