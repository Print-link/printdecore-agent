import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  whatsappFeaturesApi,
  type QuickReply,
} from "../../../services/api/whatsappFeatures";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Zap, Search } from "../../../components/icons";

interface QuickReplyPickerProps {
  onSelect: (text: string) => void;
}

export default function QuickReplyPicker({ onSelect }: QuickReplyPickerProps) {
  const t = useThemeClasses();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 0, left: 0 });

  // Position dropdown above the button
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
  }, [open]);

  // Close on outside click — exclude both button AND dropdown
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const { data: replies = [] } = useQuery<QuickReply[]>({
    queryKey: ["whatsapp", "quickReplies"],
    queryFn: () => whatsappFeaturesApi.getQuickReplies(),
    staleTime: 60000,
    enabled: open,
  });

  const filtered = replies.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.body.toLowerCase().includes(search.toLowerCase()) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(search.toLowerCase())),
  );

  const handleSelect = (reply: QuickReply) => {
    onSelect(reply.body);
    whatsappFeaturesApi.useQuickReply(reply.id).catch(() => {});
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={cn(
          "p-2 rounded-lg transition-colors",
          t.isDark
            ? "hover:bg-gray-700 text-gray-400"
            : "hover:bg-gray-100 text-gray-500",
          open &&
            (t.isDark
              ? "bg-gray-700 text-amber-400"
              : "bg-amber-50 text-amber-600"),
        )}
        title="Quick Replies"
      >
        <Zap size={18} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "fixed w-72 rounded-xl border shadow-xl overflow-hidden",
            t.isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200",
          )}
          style={{
            bottom: dropdownPos.bottom,
            left: dropdownPos.left,
            zIndex: 9999,
          }}
        >
          {/* Search */}
          <div className={cn("p-3 border-b", t.border)}>
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg border",
                t.isDark
                  ? "bg-gray-700 border-gray-600"
                  : "bg-gray-50 border-gray-200",
              )}
            >
              <Search size={14} className={t.textTertiary} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                autoFocus
                className={cn(
                  "flex-1 text-xs bg-transparent border-none focus:outline-none",
                  t.text,
                )}
              />
            </div>
          </div>

          {/* Reply list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className={cn("text-xs text-center py-6", t.textTertiary)}>
                {replies.length === 0
                  ? "No quick replies yet"
                  : "No matches"}
              </p>
            ) : (
              filtered.map((reply) => (
                <button
                  key={reply.id}
                  onMouseDown={(e) => {
                    // Prevent the outside-click handler from firing
                    e.stopPropagation();
                  }}
                  onClick={() => handleSelect(reply)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b last:border-0 transition-colors",
                    t.isDark
                      ? "hover:bg-gray-700/50 border-gray-700/50"
                      : "hover:bg-gray-50 border-gray-100",
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn("text-xs font-semibold", t.text)}>
                      {reply.title}
                    </span>
                    {reply.shortcut && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-mono",
                          t.isDark
                            ? "bg-gray-700 text-gray-400"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {reply.shortcut}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-[11px] line-clamp-2",
                      t.textSecondary,
                    )}
                  >
                    {reply.body}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
