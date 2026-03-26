import { memo } from "react";
import {
  Spinner, FileText, Download, Reply, TickSent, TickDelivered,
  TickRead, AlertCircle, Clock, BarChart3, ShoppingBag, Receipt,
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

// ─── Poll / Catalog body renderer ────────────────────────────────────────

function parsePollBody(body: string): { question: string; options: string[] } | null {
  // Matches: 📊 *Question*\n1. Option\n2. Option ...
  const match = body.match(/^📊\s+\*(.+?)\*\n([\s\S]+)$/);
  if (!match) return null;
  const options = match[2].split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  if (options.length < 2) return null;
  return { question: match[1], options };
}

function parseCatalogBody(body: string): { header: string; items: { name: string; description?: string; price?: string }[]; footer?: string } | null {
  // Matches: 📋 *Header*\n\n*1. Item*\n   desc\n   💰 price ...
  const match = body.match(/^📋\s+\*(.+?)\*\n([\s\S]+)$/);
  if (!match) return null;
  const lines = match[2].split("\n");
  const items: { name: string; description?: string; price?: string }[] = [];
  let footer: string | undefined;
  let current: { name: string; description?: string; price?: string } | null = null;

  for (const line of lines) {
    const itemMatch = line.match(/^\*\d+\.\s+(.+?)\*$/);
    if (itemMatch) {
      if (current) items.push(current);
      current = { name: itemMatch[1] };
    } else if (current && line.trim().startsWith("💰")) {
      current.price = line.trim().replace("💰", "").trim();
    } else if (current && line.trim() && !line.startsWith("_")) {
      current.description = line.trim();
    } else if (line.startsWith("_") && line.endsWith("_")) {
      footer = line.slice(1, -1);
    }
  }
  if (current) items.push(current);
  if (items.length === 0) return null;
  return { header: match[1], items, footer };
}

function parseQuoteBody(body: string): { branch?: string; category: string; description?: string; total: string; validUntil?: string; paymentLink?: string } | null {
  // Matches: 📋 *QUOTE*\n\n🏢 *Branch*\n\n📂 *Category:* ...\n💰 *Total: ...*\n\n💳 Pay here: ...
  if (!body.startsWith("📋 *QUOTE*")) return null;
  const lines = body.split("\n");
  let branch: string | undefined;
  let category = "";
  let description: string | undefined;
  let total = "";
  let validUntil: string | undefined;
  let paymentLink: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("🏢")) {
      branch = trimmed.replace(/🏢\s*\*?|\*$/g, "").trim();
    } else if (trimmed.startsWith("📂")) {
      category = trimmed.replace(/📂\s*\*?Category:\*?\s*/i, "").trim();
    } else if (trimmed.startsWith("📝")) {
      description = trimmed.replace(/📝\s*\*?Details:\*?\s*/i, "").trim();
    } else if (trimmed.startsWith("💰")) {
      total = trimmed.replace(/💰\s*\*?Total:\s*|\*$/g, "").trim();
    } else if (trimmed.startsWith("⏳")) {
      validUntil = trimmed.replace("⏳", "").trim();
    } else if (trimmed.startsWith("💳")) {
      paymentLink = trimmed.replace(/💳\s*Pay here:\s*/i, "").trim();
    }
  }

  if (!category && !total) return null;
  return { branch, category, description, total, validUntil, paymentLink };
}

function PollOrCatalogBody({ message, isFromMe }: { message: WhatsAppMessage; isFromMe: boolean }) {
  const t = useThemeClasses();

  // Try poll
  if (message.mediaType === "poll" || message.body.startsWith("📊 *")) {
    const poll = parsePollBody(message.body);
    if (poll) {
      const votes = message.pollVotes;
      const totalVotes = votes ? votes.reduce((sum, v) => sum + v.count, 0) : 0;

      return (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className={isFromMe ? "text-gray-700" : "text-blue-500"} />
            <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Poll</span>
            {totalVotes > 0 && (
              <span className="text-xs opacity-50 ml-auto">
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm font-bold mb-2">{poll.question}</p>
          <div className="space-y-1.5">
            {poll.options.map((opt, i) => {
              const voteData = votes?.find(v => v.optionName === opt);
              const count = voteData?.count || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

              return (
                <div
                  key={i}
                  className={cn(
                    "relative px-3 py-2 rounded-lg text-sm border overflow-hidden",
                    isFromMe
                      ? "bg-amber-300/40 border-amber-500/30"
                      : t.isDark ? "bg-gray-600/50 border-gray-500/50" : "bg-gray-50 border-gray-200",
                  )}
                >
                  {/* Vote progress bar */}
                  {totalVotes > 0 && pct > 0 && (
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                        isFromMe ? "bg-amber-500/25" : t.isDark ? "bg-blue-500/20" : "bg-blue-100",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <span>{opt}</span>
                    {totalVotes > 0 && (
                      <span className="text-xs font-semibold opacity-70 flex-shrink-0">
                        {count > 0 ? `${pct}%` : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Try quote
  if (message.body.startsWith("📋 *QUOTE*")) {
    const quote = parseQuoteBody(message.body);
    if (quote) {
      return (
        <div className="w-full max-w-[260px]">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={14} className={isFromMe ? "text-gray-700" : "text-amber-500"} />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Quote</span>
          </div>
          {quote.branch && <p className="text-xs font-semibold mb-1.5">{quote.branch}</p>}
          <div className={cn(
            "px-3 py-2 rounded-lg border mb-2",
            isFromMe ? "bg-amber-300/30 border-amber-500/20" : t.isDark ? "bg-gray-600/40 border-gray-500/40" : "bg-gray-50 border-gray-200",
          )}>
            <p className="text-xs opacity-70">{quote.category}</p>
            {quote.description && <p className="text-xs mt-0.5">{quote.description}</p>}
            <p className="text-base font-bold mt-1">{quote.total}</p>
          </div>
          {quote.validUntil && <p className="text-[10px] opacity-50 mb-1">{quote.validUntil}</p>}
          {quote.paymentLink && (
            <a
              href={quote.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block text-center text-xs font-semibold py-2 rounded-lg transition-colors",
                isFromMe
                  ? "bg-gray-900/80 text-white hover:bg-gray-900"
                  : "bg-amber-400 text-gray-900 hover:bg-amber-500",
              )}
            >
              Pay Now
            </a>
          )}
        </div>
      );
    }
  }

  // Try catalog
  if (message.body.startsWith("📋 *")) {
    const catalog = parseCatalogBody(message.body);
    if (catalog) {
      return (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={16} className={isFromMe ? "text-gray-700" : "text-purple-500"} />
            <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Catalog</span>
          </div>
          <p className="text-sm font-bold mb-2">{catalog.header}</p>
          <div className="space-y-2">
            {catalog.items.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "px-3 py-2 rounded-lg border",
                  isFromMe
                    ? "bg-amber-300/40 border-amber-500/30"
                    : t.isDark ? "bg-gray-600/50 border-gray-500/50" : "bg-gray-50 border-gray-200",
                )}
              >
                <p className="text-sm font-semibold">{item.name}</p>
                {item.description && <p className="text-xs opacity-70 mt-0.5">{item.description}</p>}
                {item.price && <p className="text-xs font-bold mt-1">{item.price}</p>}
              </div>
            ))}
          </div>
          {catalog.footer && (
            <p className="text-xs opacity-60 mt-2 italic">{catalog.footer}</p>
          )}
        </div>
      );
    }
  }

  // Default: plain text with WhatsApp-style bold/italic formatting
  return <FormattedBody body={message.body} />;
}

function FormattedBody({ body }: { body: string }) {
  // Render WhatsApp-style formatting: *bold*, _italic_, ~strikethrough~
  const parts = body.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);
  return (
    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*"))
          return <strong key={i}>{part.slice(1, -1)}</strong>;
        if (part.startsWith("_") && part.endsWith("_"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("~") && part.endsWith("~"))
          return <s key={i}>{part.slice(1, -1)}</s>;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

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

          {/* Body — with special rendering for polls and catalogs */}
          {!(message.hasMedia && message.body === "Document") && (
            <PollOrCatalogBody message={message} isFromMe={message.isFromMe} />
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
