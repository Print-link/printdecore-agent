import { memo } from "react";
import {
  Spinner, FileText, Download, Reply, TickSent, TickDelivered,
  TickRead, AlertCircle, Clock,
} from "../../../components/icons";
import type { WhatsAppMessage, MessageStatus } from "../../../types/whatsapp";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { format, isToday, isYesterday } from "date-fns";

// ─── Status Tick ────────────────────────────────────────────────────────

function MessageStatusTick({ status }: { status?: MessageStatus }) {
  switch (status) {
    case "pending": return <Clock size={12} className="text-gray-500" />;
    case "sent": return <TickSent size={14} className="text-gray-600" />;
    case "delivered": return <TickDelivered size={14} className="text-gray-600" />;
    case "read": return <TickRead size={14} className="text-blue-500" />;
    case "failed": return <AlertCircle size={14} className="text-red-500" />;
    default: return <TickSent size={14} className="text-gray-600" />;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday " + format(date, "HH:mm");
  return format(date, "MMM d, HH:mm");
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// ─── Props ──────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: WhatsAppMessage;
  showReactionPicker: boolean;
  downloadingFile: boolean;
  loadingMedia: boolean;
  onReply: (msg: WhatsAppMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
  onToggleReactionPicker: (msgId: string) => void;
  onSaveFile: (url: string, filename: string, msgId: string) => void;
  onDownloadMedia: (msgId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

function MessageBubbleInner({
  message, showReactionPicker, downloadingFile, loadingMedia,
  onReply, onReact, onToggleReactionPicker, onSaveFile, onDownloadMedia,
}: MessageBubbleProps) {
  const t = useThemeClasses();

  const DownloadButton = ({ url, filename }: { url: string; filename: string }) => (
    <button
      onClick={() => onSaveFile(url, filename, message.id)}
      disabled={downloadingFile}
      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
    >
      {downloadingFile ? <Spinner size="xs" /> : <Download size={12} />}
      {downloadingFile ? "Saving..." : "Download"}
    </button>
  );

  return (
    <div
      id={`msg-${message.id}`}
      className={cn("flex group transition-all duration-300 rounded-lg", message.isFromMe ? "justify-end" : "justify-start")}
    >
      {/* Hover actions — before bubble for sent */}
      {message.isFromMe && !message.id.startsWith("temp-") && (
        <div className="self-center flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
          <button onClick={() => onToggleReactionPicker(message.id)} className={cn("p-1.5 rounded-full", t.isDark ? "hover:bg-gray-700 text-gray-500" : "hover:bg-gray-100 text-gray-400")} title="React">
            <span className="text-sm">😊</span>
          </button>
          <button onClick={() => onReply(message)} className={cn("p-1.5 rounded-full", t.isDark ? "hover:bg-gray-700 text-gray-500" : "hover:bg-gray-100 text-gray-400")} title="Reply">
            <Reply size={14} />
          </button>
        </div>
      )}

      <div className={`max-w-[70%] ${message.isFromMe ? "items-end" : "items-start"} flex flex-col`}>
        {!message.isFromMe && (
          <span className={cn("text-xs mb-1 px-2", t.textSecondary)}>{message.contactName || "Unknown"}</span>
        )}

        <div className={cn("px-4 py-2 rounded-lg",
          message.isFromMe ? "bg-amber-400 text-gray-900"
            : t.isDark ? "bg-gray-700 text-gray-100" : "bg-white text-gray-900 border border-gray-200",
        )}>
          {/* Quoted message */}
          {message.quotedMessage && (
            <div
              className={cn("mb-2 px-3 py-1.5 rounded border-l-3 text-xs cursor-pointer",
                message.isFromMe ? "bg-amber-500/30 border-l-amber-600" : t.isDark ? "bg-gray-600/50 border-l-amber-400" : "bg-gray-100 border-l-amber-400",
              )}
              onClick={() => {
                const el = document.getElementById(`msg-${message.quotedMessage!.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("ring-2", "ring-amber-400");
                  setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 1500);
                }
              }}
            >
              <p className={cn("font-semibold mb-0.5", message.isFromMe ? "text-amber-800" : "text-amber-500")}>
                {message.quotedMessage.isFromMe ? "You" : message.quotedMessage.contactName || "Unknown"}
              </p>
              <p className="line-clamp-2 opacity-80">
                {message.quotedMessage.mediaType && !message.quotedMessage.body
                  ? `📎 ${message.quotedMessage.mediaType}` : message.quotedMessage.body}
              </p>
            </div>
          )}

          {/* Media */}
          {message.hasMedia && (
            <div className="mb-2">
              {message.mediaUrl ? (
                <>
                  {message.mediaType === "video" && (
                    <div>
                      <video src={message.mediaUrl} controls className="max-w-full rounded-lg" style={{ maxHeight: "300px" }} />
                      <DownloadButton url={message.mediaUrl} filename={message.mediaFilename || "video"} />
                    </div>
                  )}
                  {message.mediaType === "audio" && (
                    <div>
                      <audio src={message.mediaUrl} controls className="w-full" />
                      <DownloadButton url={message.mediaUrl} filename={message.mediaFilename || "audio"} />
                    </div>
                  )}
                  {(message.mediaType === "document" || message.mediaType === "sticker") && (
                    <div className={cn("p-3 rounded-lg border", t.isDark ? "bg-gray-600 border-gray-500" : "bg-gray-100 border-gray-300")}>
                      <div className="flex items-center gap-3">
                        <FileText size={28} className="flex-shrink-0 text-amber-500" />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", t.text)}>{message.mediaFilename || message.body || "Document"}</p>
                          <DownloadButton url={message.mediaUrl} filename={message.mediaFilename || "document"} />
                        </div>
                      </div>
                    </div>
                  )}
                  {(!message.mediaType || message.mediaType === "image") && (
                    <div>
                      <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <img src={message.mediaUrl} alt="Media" className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" style={{ maxHeight: "400px", objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </a>
                      <DownloadButton url={message.mediaUrl} filename={message.mediaFilename || "image"} />
                    </div>
                  )}
                </>
              ) : (
                <div className={cn("p-3 rounded-lg border", t.isDark ? "bg-gray-600 border-gray-500" : "bg-gray-100 border-gray-300")}>
                  <div className="flex items-center gap-3">
                    <FileText size={28} className="flex-shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", t.text)}>{message.mediaFilename || message.body || "Media"}</p>
                      {loadingMedia ? (
                        <p className={cn("text-xs mt-1", t.textSecondary)}><Spinner size="xs" className="inline-block mr-1" />Downloading...</p>
                      ) : (
                        <button onClick={() => onDownloadMedia(message.id)} className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0">
                          <Download size={12} />Download media
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {!(message.hasMedia && message.body === "Document") && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          )}

          {/* Timestamp + status */}
          <span className={cn("text-xs mt-1 flex items-center gap-1", message.isFromMe ? "text-gray-700 justify-end" : t.textSecondary)}>
            {formatTime(message.timestamp)}
            {message.isFromMe && <MessageStatusTick status={message.status} />}
          </span>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", message.isFromMe ? "justify-end" : "justify-start")}>
            {(() => {
              const grouped = new Map<string, number>();
              for (const r of message.reactions) grouped.set(r.emoji, (grouped.get(r.emoji) || 0) + 1);
              return Array.from(grouped.entries()).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, message.reactions!.some(r => r.isFromMe && r.emoji === emoji) ? "" : emoji)}
                  className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                    message.reactions!.some(r => r.isFromMe && r.emoji === emoji)
                      ? "border-amber-400 bg-amber-400/20"
                      : t.isDark ? "border-gray-600 bg-gray-700/50 hover:bg-gray-600" : "border-gray-200 bg-white hover:bg-gray-50",
                  )}
                >
                  {emoji}{count > 1 && <span className={t.textSecondary}>{count}</span>}
                </button>
              ));
            })()}
          </div>
        )}

        {/* Reaction picker */}
        {showReactionPicker && (
          <div className={cn("flex items-center gap-1 px-2 py-1.5 rounded-full shadow-lg border mt-1",
            message.isFromMe ? "ml-auto" : "mr-auto",
            t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
          )}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => onReact(message.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-transform hover:scale-125">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions — after bubble for received */}
      {!message.isFromMe && !message.id.startsWith("temp-") && (
        <div className="self-center flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button onClick={() => onReply(message)} className={cn("p-1.5 rounded-full", t.isDark ? "hover:bg-gray-700 text-gray-500" : "hover:bg-gray-100 text-gray-400")} title="Reply">
            <Reply size={14} />
          </button>
          <button onClick={() => onToggleReactionPicker(message.id)} className={cn("p-1.5 rounded-full", t.isDark ? "hover:bg-gray-700 text-gray-500" : "hover:bg-gray-100 text-gray-400")} title="React">
            <span className="text-sm">😊</span>
          </button>
        </div>
      )}
    </div>
  );
}

const MessageBubble = memo(MessageBubbleInner);
export default MessageBubble;
