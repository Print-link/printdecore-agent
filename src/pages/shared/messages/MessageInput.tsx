import { useRef, useEffect } from "react";
import { Send, Reply, X } from "../../../components/icons";
import { Button } from "../../../components/ui";
import type { WhatsAppMessage } from "../../../types/whatsapp";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import QuickReplyPicker from "./QuickReplyPicker";

interface MessageInputProps {
  messageText: string;
  isSending: boolean;
  replyingTo: WhatsAppMessage | null;
  hasQuickReplies: boolean;
  onMessageChange: (text: string) => void;
  onSend: () => void;
  onCancelReply: () => void;
  onTyping: () => void;
}

export default function MessageInput({
  messageText, isSending, replyingTo, hasQuickReplies,
  onMessageChange, onSend, onCancelReply, onTyping,
}: MessageInputProps) {
  const t = useThemeClasses();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [messageText]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      {/* Reply bar */}
      {replyingTo && (
        <div className={cn("px-4 pt-2 border-t", t.isDark ? "bg-gray-800" : "bg-white", t.border)}>
          <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border-l-3", t.isDark ? "bg-gray-700/60 border-l-amber-400" : "bg-gray-100 border-l-amber-400")}>
            <Reply size={14} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-500">
                {replyingTo.isFromMe ? "You" : replyingTo.contactName || "Unknown"}
              </p>
              <p className={cn("text-xs truncate", t.textSecondary)}>
                {replyingTo.hasMedia && !replyingTo.body ? `📎 ${replyingTo.mediaType || "Media"}` : replyingTo.body}
              </p>
            </div>
            <button onClick={onCancelReply} className={cn("p-1 rounded-full flex-shrink-0", t.isDark ? "hover:bg-gray-600" : "hover:bg-gray-200")}>
              <X size={14} className={t.textSecondary} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={cn("px-4 py-3", !replyingTo && "border-t", t.isDark ? "bg-gray-800" : "bg-white", !replyingTo && t.border)}>
        <div className="flex items-end gap-2">
          {hasQuickReplies && (
            <QuickReplyPicker
              onSelect={(text) => {
                onMessageChange(text);
                textareaRef.current?.focus();
              }}
            />
          )}
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => {
              onMessageChange(e.target.value);
              if (e.target.value.trim()) onTyping();
            }}
            onKeyDown={handleKeyPress}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            rows={1}
            className={cn("flex-1 px-4 py-2 rounded-lg text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-amber-400 overflow-y-auto", t.input)}
          />
          <Button
            onClick={onSend}
            disabled={!messageText.trim() || isSending}
            loading={isSending}
            icon={isSending ? undefined : Send}
            variant={!messageText.trim() || isSending ? "secondary" : "primary"}
            className="p-2"
          />
        </div>
      </div>
    </>
  );
}
