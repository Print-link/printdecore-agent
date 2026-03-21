import { Avatar, Button, IconButton } from "../../../components/ui";
import { ArrowLeft, Receipt, BarChart3, ShoppingBag } from "../../../components/icons";
import type { WhatsAppChat } from "../../../types/whatsapp";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import LabelPicker from "./LabelPicker";
import { ConversationHeaderSkeleton } from "./skeletons";

interface ConversationHeaderProps {
  chat: WhatsAppChat | undefined;
  chatId: string;
  isLoading: boolean;
  isTyping: boolean;
  hasLabels: boolean;
  hasPolls: boolean;
  hasCatalog: boolean;
  onBack: () => void;
  onShowQuote: () => void;
  onShowPoll: () => void;
  onShowCatalog: () => void;
}

export default function ConversationHeader({
  chat, chatId, isLoading, isTyping,
  hasLabels, hasPolls, hasCatalog,
  onBack, onShowQuote, onShowPoll, onShowCatalog,
}: ConversationHeaderProps) {
  const t = useThemeClasses();

  if (!chat && isLoading) return <ConversationHeaderSkeleton />;

  return (
    <div
      className={cn(
        "px-6 py-4 border-b flex items-center gap-4",
        t.isDark ? "bg-gray-800" : "bg-white",
        t.border,
      )}
    >
      <IconButton icon={ArrowLeft} onClick={onBack} label="Back" />
      {chat && (
        <>
          <Avatar src={chat.pictureUrl} name={chat.name} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold", t.text)}>{chat.name}</h3>
            {isTyping ? (
              <p className="text-xs text-amber-500 font-medium animate-pulse">typing...</p>
            ) : chat.isGroup ? (
              <p className={cn("text-xs", t.textSecondary)}>Group</p>
            ) : hasLabels ? (
              <LabelPicker chatId={chatId} compact />
            ) : null}
          </div>
          {!chat.isGroup && (
            <div className="flex items-center gap-1.5">
              {hasPolls && (
                <Button variant="secondary" size="sm" icon={BarChart3} onClick={onShowPoll}>Poll</Button>
              )}
              {hasCatalog && (
                <Button variant="secondary" size="sm" icon={ShoppingBag} onClick={onShowCatalog}>Catalog</Button>
              )}
              <Button variant="primary" size="sm" icon={Receipt} onClick={onShowQuote}>Quote</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
