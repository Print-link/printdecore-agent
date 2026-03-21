import { useRef, useEffect, useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { EmptyState } from "../../../components/ui";
import type { WhatsAppMessage } from "../../../types/whatsapp";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { MessagesSkeleton } from "./skeletons";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  chatMessages: WhatsAppMessage[];
  isLoading: boolean;
  reactionPickerMsgId: string | null;
  downloadingFile: Set<string>;
  loadingMedia: Set<string>;
  onReply: (msg: WhatsAppMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
  onToggleReactionPicker: (msgId: string) => void;
  onSaveFile: (url: string, filename: string, msgId: string) => void;
  onDownloadMedia: (msgId: string) => void;
}

function groupMessagesByDate(messages: WhatsAppMessage[]) {
  const groups: Record<string, WhatsAppMessage[]> = {};
  for (const msg of messages) {
    const key = format(new Date(msg.timestamp), "yyyy-MM-dd");
    (groups[key] ??= []).push(msg);
  }
  return groups;
}

export default function MessageList({
  chatMessages, isLoading, reactionPickerMsgId,
  downloadingFile, loadingMedia,
  onReply, onReact, onToggleReactionPicker, onSaveFile, onDownloadMedia,
}: MessageListProps) {
  const t = useThemeClasses();
  const endRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(chatMessages.length);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatMessages.length > prevCountRef.current && chatMessages.length > 0) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    prevCountRef.current = chatMessages.length;
  }, [chatMessages.length]);

  const messageGroups = useMemo(() => groupMessagesByDate(chatMessages), [chatMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoading && chatMessages.length === 0 ? (
        <MessagesSkeleton />
      ) : chatMessages.length === 0 ? (
        <EmptyState title="No messages yet" />
      ) : (
        Object.entries(messageGroups).map(([dateKey, msgs]) => {
          const date = new Date(dateKey);
          const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");

          return (
            <div key={dateKey}>
              <div className="flex items-center justify-center my-4">
                <div className={cn("px-3 py-1 rounded-full text-xs font-medium", t.isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600")}>
                  {label}
                </div>
              </div>
              <div className="space-y-2">
                {msgs.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    showReactionPicker={reactionPickerMsgId === msg.id}
                    downloadingFile={downloadingFile.has(msg.id)}
                    loadingMedia={loadingMedia.has(msg.id)}
                    onReply={onReply}
                    onReact={onReact}
                    onToggleReactionPicker={onToggleReactionPicker}
                    onSaveFile={onSaveFile}
                    onDownloadMedia={onDownloadMedia}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );
}
