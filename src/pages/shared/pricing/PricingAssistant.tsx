import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Badge, Button } from "../../../components/ui";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Send, Sparkles, Spreadsheet, Trash2, Upload, X } from "../../../components/icons";
import {
  pricingAssistantApi,
  pricingError,
  UNIT_LABEL,
  type ApplyResult,
  type AssistantMessage,
  type CatalogDraft,
  type DraftPrice,
  type DraftProduct,
  type ReadSheet,
} from "../../../services/api/shopPricing";

/**
 * The pricing assistant: the manager tells it what they sell (or uploads
 * their Excel price list), it builds a draft of categories, products,
 * choices and prices, and they check it, change it, or ask for changes —
 * nothing is saved until they press "Add to my shop".
 */

interface Saved {
  messages: AssistantMessage[];
  draft: CatalogDraft | null;
  sheet: ReadSheet | null;
}

const storeKey = (branchId: string) => `pricingAssistant:${branchId}`;
const load = (branchId: string): Saved | null => {
  try {
    const raw = localStorage.getItem(storeKey(branchId));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
};
const save = (branchId: string, s: Saved) => {
  try {
    localStorage.setItem(storeKey(branchId), JSON.stringify(s));
  } catch {
    // Full or blocked storage: the conversation just isn't kept
  }
};
const forget = (branchId: string) => {
  try {
    localStorage.removeItem(storeKey(branchId));
  } catch {
    /* nothing to do */
  }
};

const money = (n: number) => `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const EACH: Record<DraftProduct["pricingUnit"], string> = { item: "each", side: "per side", sheet: "per sheet", sqft: "per sq ft", sqm: "per m²" };
const rowsIn = (s: ReadSheet) => s.sheets.reduce((n, x) => n + x.rows.length + x.cutRows, 0);

/** What a row is for, in words: "A5 · Gloss" or "Any options" */
const whenText = (w: DraftPrice["when"]) => Object.values(w ?? {}).join(" · ") || "Any options";

/** A worked example the manager can sanity-check: the first price at a typical quantity */
function example(p: DraftProduct): string | null {
  const row = p.prices[0];
  if (!row) return null;
  const area = p.pricingUnit === "sqft" || p.pricingUnit === "sqm";
  const breaks = [...(row.breaks ?? [])].sort((a, b) => a.fromQty - b.fromQty);
  const qty = area ? 1 : breaks[0]?.fromQty ?? (p.pricingUnit === "item" ? 10 : 20);
  const measure = area ? (p.pricingUnit === "sqft" ? 12 : 1) : qty; // a 3×4 ft banner, or 1 m²
  const unit = breaks.filter((b) => b.fromQty <= measure).pop()?.price ?? row.price;
  let total = unit * measure + (row.setupFee ?? 0);
  if (row.minimumCharge && total < row.minimumCharge) total = row.minimumCharge;
  const what = area ? (p.pricingUnit === "sqft" ? "a 3 × 4 ft" : "a 1 m²") : `${qty} ×`;
  return `${what} ${whenText(row.when) === "Any options" ? p.name : `${whenText(row.when)} ${p.name}`} = ${money(total)}`;
}

/** The lowest price per unit anywhere in the product */
const fromPrice = (p: DraftProduct) => {
  const all = p.prices.flatMap((r) => [r.price, ...(r.breaks ?? []).map((b) => b.price)]).filter((n) => n > 0);
  return all.length ? Math.min(...all) : null;
};

const STARTERS: Array<{ title: string; body: string; upload?: boolean; text?: string }> = [
  { title: "Upload my price list", body: "Excel or CSV — I'll read it and set everything up.", upload: true },
  { title: "Start from scratch", body: "Tell me what you print and I'll suggest products and prices.", text: "I run a print shop. We do " },
  { title: "Improve what I have", body: "I'll look at your products and suggest what to add or fix.", text: "Look at my current products and suggest how to make them better for customers." },
];

export function PricingAssistant({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const saved = useMemo(() => load(branchId), [branchId]);

  const [messages, setMessages] = useState<AssistantMessage[]>(saved?.messages ?? []);
  const [draft, setDraft] = useState<CatalogDraft | null>(saved?.draft ?? null);
  const [sheet, setSheet] = useState<ReadSheet | null>(saved?.sheet ?? null);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [reading, setReading] = useState(false);
  const [tab, setTab] = useState<"chat" | "draft">("chat");
  const [confirming, setConfirming] = useState(false);
  const [publish, setPublish] = useState(true);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [shown, setShown] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => save(branchId, { messages, draft, sheet }), [branchId, messages, draft, sheet]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, thinking]);

  const close = () => {
    setShown(false);
    setTimeout(onClose, 200);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !confirming && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const send = async (raw: string, withSheet: ReadSheet | null = sheet) => {
    const message = raw.trim();
    if (!message || thinking) return;
    const next = [...messages, { role: "user" as const, text: message }];
    setMessages(next);
    setText("");
    setThinking(true);
    try {
      const res = await pricingAssistantApi.chat(branchId, { messages: next, sheet: withSheet, draft });
      setMessages([...next, { role: "assistant", text: res.reply }]);
      if (res.draft) {
        setDraft(res.draft);
        // On a phone, show the draft as soon as there is one
        if (!draft && window.innerWidth < 1024) setTab("draft");
      }
    } catch (e) {
      setMessages([...next, { role: "assistant", text: `Sorry, that didn't work: ${pricingError(e).message}. Try again in a moment.` }]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setReading(true);
    try {
      const read = await pricingAssistantApi.readSheet(branchId, file);
      setSheet(read);
      const count = read.sheets.length;
      await send(
        `Here's my price list (${read.fileName}${count > 1 ? `, ${count} sheets` : ""}). Please set up my products and prices from it.`,
        read,
      );
    } catch (e) {
      showError(pricingError(e).message, "Couldn't read that file", 6000);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateProduct = (ref: string, change: (p: DraftProduct) => DraftProduct) =>
    setDraft((d) => (d ? { ...d, products: d.products.map((p) => (p.ref === ref ? { ...change(p), problems: [] } : p)) } : d));
  const removeProduct = (ref: string) => setDraft((d) => (d ? { ...d, products: d.products.filter((p) => p.ref !== ref) } : d));

  const startOver = () => {
    if (messages.length && !window.confirm("Start over? This clears the conversation and the draft.")) return;
    forget(branchId);
    setMessages([]);
    setDraft(null);
    setSheet(null);
    setResult(null);
    setTab("chat");
  };

  const apply = async () => {
    if (!draft) return;
    setApplying(true);
    try {
      const res = await pricingAssistantApi.apply(branchId, draft, publish);
      setResult(res);
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ["shopPricing", branchId] });
      qc.invalidateQueries({ queryKey: ["serviceCategories", branchId] });
      if (res.saved.length) {
        success(`${res.saved.length} product${res.saved.length === 1 ? "" : "s"} added to your shop`, res.published ? "On sale now" : "Saved", 5000);
        // Keep what failed in the draft so they can fix it
        const left = draft.products.filter((p) => !res.saved.some((s) => s.name.toLowerCase() === p.name.toLowerCase()));
        setDraft(left.length ? { ...draft, products: left } : null);
        if (!left.length) {
          setMessages([]);
          setSheet(null);
        }
      }
    } catch (e) {
      showError(pricingError(e).message, "Couldn't add the products", 6000);
    } finally {
      setApplying(false);
    }
  };

  const products = useMemo(() => draft?.products ?? [], [draft]);
  const broken = products.filter((p) => p.problems?.length).length;
  const groups = useMemo(() => {
    const m = new Map<string, DraftProduct[]>();
    for (const p of products) m.set(p.category, [...(m.get(p.category) ?? []), p]);
    return [...m.entries()];
  }, [products]);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const chat = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-5">
            <div className="flex gap-3">
              <span className="shrink-0 w-9 h-9 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center"><Sparkles size={18} /></span>
              <div className={cn("rounded-2xl rounded-tl-sm px-4 py-3 text-sm", t.surfaceInset, t.text)}>
                <p className="font-medium">Hi! I'll set up your products and prices for you.</p>
                <p className={cn("mt-1", t.textSecondary)}>
                  Upload your price list or just tell me what you print. I'll build everything — categories, choices like size and paper, and prices — and you check it before anything goes live.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  disabled={reading || thinking}
                  onClick={() => {
                    if (s.upload || !s.text) return fileRef.current?.click();
                    if (s.text.endsWith(" ")) {
                      setText(s.text);
                      inputRef.current?.focus();
                    } else void send(s.text);
                  }}
                  className={cn(
                    "text-left rounded-xl border px-4 py-3 transition-colors",
                    t.border,
                    t.isDark ? "hover:bg-gray-800 hover:border-amber-500/60" : "hover:bg-amber-50 hover:border-amber-300",
                  )}
                >
                  <p className={cn("text-sm font-medium flex items-center gap-2", t.text)}>
                    {s.upload && <Upload size={16} className="text-amber-500" />}
                    {s.title}
                  </p>
                  <p className={cn("text-xs mt-0.5", t.textSecondary)}>{s.body}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm bg-amber-400 text-gray-900 whitespace-pre-wrap">{m.text}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center"><Sparkles size={16} /></span>
                <div className={cn("max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed", t.surfaceInset, t.text)}>{m.text}</div>
              </div>
            ),
          )
        )}

        {thinking && (
          <div className="flex gap-3 items-center">
            <span className="shrink-0 w-8 h-8 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center animate-pulse"><Sparkles size={16} /></span>
            <p className={cn("text-sm", t.textSecondary)}>
              {sheet && messages.length <= 2 ? "Reading your price list and building your products… this can take a minute." : "Thinking…"}
            </p>
          </div>
        )}

        {/* One-tap follow-ups from the latest draft */}
        {!thinking && draft && lastAssistant && messages[messages.length - 1]?.role === "assistant" && (draft.suggestions.length > 0 || draft.questions.length > 0) && (
          <div className="pl-11 space-y-2">
            {draft.questions.length > 0 && (
              <div className={cn("rounded-xl border px-3 py-2.5 text-xs space-y-1", t.border)}>
                <p className={cn("font-semibold", t.text)}>To get it right, tell me:</p>
                {draft.questions.map((q) => <p key={q} className={t.textSecondary}>• {q}</p>)}
              </div>
            )}
            {draft.suggestions.length > 0 && (
              <div>
                <p className={cn("text-xs font-semibold mb-1.5", t.textSecondary)}>Ideas for your shop — tap to do it</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(`Yes, please do this: ${s}`)}
                      className={cn(
                        "text-left text-xs rounded-full border px-3 py-1.5 transition-colors",
                        t.isDark ? "border-amber-500/40 text-amber-200 hover:bg-amber-500/10" : "border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={cn("border-t px-3 sm:px-4 py-3 space-y-2", t.border)}>
        {sheet && (
          <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs", t.surfaceInset)}>
            <Spreadsheet size={16} className="text-emerald-500 shrink-0" />
            <span className={cn("truncate flex-1", t.text)}>
              {sheet.fileName} · {sheet.sheets.length} sheet{sheet.sheets.length === 1 ? "" : "s"} · {rowsIn(sheet)} rows
            </span>
            <button type="button" className={t.textSecondary} onClick={() => setSheet(null)} aria-label="Remove spreadsheet"><X size={14} /></button>
          </div>
        )}
        <div className={cn("flex items-end gap-2 rounded-xl border px-2 py-1.5", t.border, t.isDark ? "bg-gray-800" : "bg-white")}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={reading || thinking}
            className={cn("p-2 rounded-lg shrink-0", t.textSecondary, t.isDark ? "hover:bg-gray-700" : "hover:bg-gray-100")}
            title="Upload your price list (Excel or CSV)"
            aria-label="Upload your price list"
          >
            {reading ? <span className="block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={20} />}
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder={draft ? "Ask for changes — e.g. “make A4 GHS 2.50” or “add lamination”" : "Tell me what you print…"}
            className={cn("flex-1 resize-none bg-transparent outline-none text-sm py-2 max-h-40", t.text)}
          />
          <button
            type="button"
            onClick={() => void send(text)}
            disabled={!text.trim() || thinking}
            className="p-2 rounded-lg shrink-0 bg-amber-400 text-gray-900 disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
    </div>
  );

  const draftPanel = (
    <div className="flex flex-col h-full min-h-0">
      {result && (
        <div className={cn("mx-4 sm:mx-5 mt-4 rounded-xl border px-4 py-3 text-sm", result.failed.length ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20" : "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20")}>
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            {result.saved.length} added{result.published ? " and on sale" : " — prices saved as a draft"}
            {result.categoriesCreated.length > 0 && ` · new categor${result.categoriesCreated.length === 1 ? "y" : "ies"}: ${result.categoriesCreated.join(", ")}`}
          </p>
          {!result.published && result.saved.length > 0 && <p className="text-xs mt-1 text-gray-600 dark:text-gray-300">Publish your prices on the Pricing page when you're ready for customers to order.</p>}
          {result.failed.map((f) => (
            <p key={f.name + f.problem} className="text-xs mt-1 text-amber-800 dark:text-amber-200">• {f.name}: {f.problem}</p>
          ))}
          {result.categoriesCreated.length > 0 && <p className="text-xs mt-1 text-gray-600 dark:text-gray-300">Tip: add a photo to each new category under “Categories” so customers can spot it.</p>}
        </div>
      )}

      {!draft || products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
          <span className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-3", t.surfaceInset)}><Sparkles size={26} className="text-amber-500" /></span>
          <p className={cn("text-sm font-medium", t.text)}>{result ? "All done" : "Your draft will appear here"}</p>
          <p className={cn("text-xs mt-1 max-w-xs", t.textSecondary)}>
            {result ? "Ask for more products any time." : "As we talk, I'll lay out your products and prices here. You can change anything before it goes live."}
          </p>
        </div>
      ) : (
        <>
          <div className="px-4 sm:px-5 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", t.text)}>
                  {products.length} product{products.length === 1 ? "" : "s"} ready to check
                </p>
                {draft.summary && <p className={cn("text-xs mt-0.5", t.textSecondary)}>{draft.summary}</p>}
              </div>
              <Button icon={CheckCircle} onClick={() => setConfirming(true)} disabled={applying || thinking}>
                Add to my shop
              </Button>
            </div>
            {broken > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {broken} need{broken === 1 ? "s" : ""} a fix — open {broken === 1 ? "it" : "them"} below, or ask me to fix {broken === 1 ? "it" : "them"}.
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-6 space-y-5">
            {groups.map(([category, rows]) => (
              <div key={category}>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-1.5", t.textSecondary)}>{category}</p>
                <div className="space-y-2">
                  {rows.map((p) => (
                    <ProductCard key={p.ref} product={p} onChange={(c) => updateProduct(p.ref, c)} onRemove={() => removeProduct(p.ref)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/50 z-50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} onClick={close} />
      <div
        role="dialog"
        aria-label="Pricing assistant"
        className={cn(
          "fixed inset-0 sm:inset-4 lg:inset-8 z-50 flex flex-col sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-200",
          t.isDark ? "bg-gray-900" : "bg-white",
          shown ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
        )}
      >
        <div className={cn("px-4 sm:px-6 py-3.5 border-b flex items-center gap-3", t.border)}>
          <span className="w-9 h-9 rounded-xl bg-amber-400 text-gray-900 flex items-center justify-center shrink-0"><Sparkles size={20} /></span>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold", t.text)}>Pricing assistant</h3>
            <p className={cn("text-xs truncate", t.textSecondary)}>Tell me what you sell or upload your price list. You approve everything.</p>
          </div>
          {(messages.length > 0 || draft) && (
            <Button size="sm" variant="ghost" onClick={startOver}>Start over</Button>
          )}
          <button type="button" onClick={close} className={cn("p-2 rounded-lg", t.textSecondary, t.isDark ? "hover:bg-gray-800" : "hover:bg-gray-100")} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Phone: one panel at a time */}
        <div className={cn("lg:hidden flex border-b", t.border)}>
          {(["chat", "draft"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn("flex-1 py-2.5 text-sm font-medium border-b-2", tab === k ? "border-amber-400 " + t.text : "border-transparent " + t.textSecondary)}
            >
              {k === "chat" ? "Chat" : `Draft${products.length ? ` (${products.length})` : ""}`}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className={cn("min-h-0 w-full lg:w-[440px] lg:shrink-0 lg:border-r", t.border, tab === "chat" ? "flex flex-col" : "hidden lg:flex lg:flex-col")}>{chat}</div>
          <div className={cn("min-h-0 flex-1", t.isDark ? "bg-gray-950/40" : "bg-gray-50", tab === "draft" ? "flex flex-col" : "hidden lg:flex lg:flex-col")}>{draftPanel}</div>
        </div>
      </div>

      {confirming && draft && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => !applying && setConfirming(false)}>
          <div className={cn("w-full max-w-md rounded-2xl shadow-xl p-6", t.isDark ? "bg-gray-800" : "bg-white")} onClick={(e) => e.stopPropagation()}>
            <h4 className={cn("text-base font-semibold", t.text)}>Add {products.length - broken} product{products.length - broken === 1 ? "" : "s"} to your shop?</h4>
            <ul className={cn("mt-3 text-sm space-y-1", t.textSecondary)}>
              {products.filter((p) => p.updatesExisting).length > 0 && <li>• {products.filter((p) => p.updatesExisting).length} will update products you already have</li>}
              {broken > 0 && <li className="text-amber-600">• {broken} that need{broken === 1 ? "s" : ""} a fix will be left in the draft</li>}
              <li>• New categories are made for you; you can add photos after</li>
            </ul>
            <label className={cn("mt-4 flex items-start gap-3 rounded-xl border p-3 cursor-pointer", t.border)}>
              <input type="checkbox" className="mt-0.5 accent-amber-500" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              <span className="text-sm">
                <span className={cn("font-medium", t.text)}>Put them on sale now</span>
                <span className={cn("block text-xs", t.textSecondary)}>Customers can order and pay straight away. Untick to save the prices as a draft and publish later.</span>
              </span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={applying}>Not yet</Button>
              <Button onClick={() => void apply()} loading={applying} disabled={products.length - broken === 0}>
                {publish ? "Add and put on sale" : "Add as draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** One product in the draft: a summary line, opening to its choices and prices, all editable */
function ProductCard({ product: p, onChange, onRemove }: { product: DraftProduct; onChange: (c: (p: DraftProduct) => DraftProduct) => void; onRemove: () => void }) {
  const t = useThemeClasses();
  const [open, setOpen] = useState(!!p.problems?.length);
  const lowest = fromPrice(p);
  const ex = example(p);
  const cell = cn("w-20 px-2 py-1 rounded-md border text-sm text-right", t.input);

  const setPrice = (i: number, change: Partial<DraftPrice>) => onChange((x) => ({ ...x, prices: x.prices.map((r, j) => (j === i ? { ...r, ...change } : r)) }));
  const setBreak = (i: number, b: number, price: number) =>
    onChange((x) => ({ ...x, prices: x.prices.map((r, j) => (j === i ? { ...r, breaks: (r.breaks ?? []).map((k, n) => (n === b ? { ...k, price } : k)) } : r)) }));

  return (
    <div className={cn("rounded-xl border", p.problems?.length ? "border-amber-300 dark:border-amber-700" : t.border, t.isDark ? "bg-gray-900" : "bg-white")}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", t.text)}>{p.name || "Untitled product"}</p>
          <p className={cn("text-xs truncate", t.textSecondary)}>
            {[p.type !== p.name && p.type, p.choices.map((c) => c.name).join(", "), lowest !== null && `from ${money(lowest)} ${EACH[p.pricingUnit]}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {p.problems?.length ? <Badge color="amber">Needs a fix</Badge> : p.updatesExisting ? <Badge color="blue">Updates yours</Badge> : <Badge color="green">New</Badge>}
        {open ? <ChevronUp size={16} className={t.textSecondary} /> : <ChevronDown size={16} className={t.textSecondary} />}
      </button>

      {open && (
        <div className={cn("px-4 pb-4 pt-1 space-y-4 border-t", t.borderSubtle)}>
          {p.problems?.length ? (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
              {p.problems.slice(0, 4).map((x) => <p key={x}>• {x}</p>)}
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3 pt-3">
            <label className="block text-xs">
              <span className={t.textSecondary}>Name customers see</span>
              <input className={cn("mt-1 w-full px-3 py-2 rounded-lg border text-sm", t.input)} value={p.name} onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))} />
            </label>
            <label className="block text-xs">
              <span className={t.textSecondary}>Category</span>
              <input className={cn("mt-1 w-full px-3 py-2 rounded-lg border text-sm", t.input)} value={p.category} onChange={(e) => onChange((x) => ({ ...x, category: e.target.value }))} />
            </label>
          </div>

          <div>
            <p className={cn("text-xs font-semibold mb-1.5", t.text)}>What customers choose</p>
            {p.choices.length === 0 ? (
              <p className={cn("text-xs", t.textSecondary)}>No choices — one simple price.</p>
            ) : (
              <div className="space-y-1.5">
                {p.choices.map((c) => (
                  <div key={c.name} className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={cn("font-medium mr-1", t.text)}>{c.name}{c.multiple ? " (any)" : ""}:</span>
                    {c.options.map((o) => (
                      <span key={o} className={cn("rounded-full px-2 py-0.5", t.surfaceInset, t.text)}>{o}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {(p.pricingUnit === "sqft" || p.pricingUnit === "sqm" || p.customSize) && (
              <p className={cn("text-xs mt-1.5", t.textSecondary)}>Customers type their own width and height.</p>
            )}
          </div>

          <div>
            <p className={cn("text-xs font-semibold mb-1.5", t.text)}>Prices ({UNIT_LABEL[p.pricingUnit]})</p>
            <div className={cn("rounded-lg border divide-y", t.border, t.isDark ? "divide-gray-700" : "divide-gray-100")}>
              {p.prices.map((r, i) => (
                <div key={i} className="px-3 py-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex-1 text-sm", t.text)}>{whenText(r.when)}</span>
                    <span className={cn("text-xs", t.textSecondary)}>GHS</span>
                    <input type="number" min={0} step="0.01" className={cell} value={r.price} onChange={(e) => setPrice(i, { price: Number(e.target.value) })} aria-label={`Price for ${whenText(r.when)}`} />
                    <span className={cn("text-xs w-14", t.textSecondary)}>{EACH[p.pricingUnit]}</span>
                  </div>
                  {(r.breaks ?? []).map((b, n) => (
                    <div key={n} className="flex items-center gap-2 pl-4">
                      <span className={cn("flex-1 text-xs", t.textSecondary)}>from {b.fromQty.toLocaleString()}{p.pricingUnit === "sqft" ? " sq ft" : p.pricingUnit === "sqm" ? " m²" : ""}</span>
                      <span className={cn("text-xs", t.textSecondary)}>GHS</span>
                      <input type="number" min={0} step="0.01" className={cell} value={b.price} onChange={(e) => setBreak(i, n, Number(e.target.value))} aria-label={`Price from ${b.fromQty}`} />
                      <span className={cn("text-xs w-14", t.textSecondary)}>{EACH[p.pricingUnit]}</span>
                    </div>
                  ))}
                  {(r.setupFee || r.minimumCharge) ? (
                    <p className={cn("text-xs pl-4", t.textSecondary)}>
                      {[r.setupFee && `Setup ${money(r.setupFee)} per order`, r.minimumCharge && `Minimum order ${money(r.minimumCharge)}`].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {(p.extras ?? []).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {(p.extras ?? []).map((x) => (
                  <p key={x.choice + x.option} className={cn("text-xs", t.textSecondary)}>
                    + {x.label || x.option}:{" "}
                    {x.charge === "percent" ? `${x.amount}% extra` : `${money(x.amount)} ${x.charge === "per_order" ? "per order" : x.charge === "per_measure" ? (p.pricingUnit === "sqm" ? "per m²" : "per sq ft") : x.charge === "per_side" ? "per side" : "each"}`}
                  </p>
                ))}
              </div>
            )}
            {ex && <p className={cn("text-xs mt-2 rounded-lg px-3 py-2", t.surfaceInset, t.textSecondary)}>Example: {ex}</p>}
          </div>

          {(p.notes ?? []).length > 0 && (
            <div className="text-xs space-y-0.5">
              <p className={cn("font-semibold", t.text)}>Please check</p>
              {(p.notes ?? []).map((n) => <p key={n} className={t.textSecondary}>• {n}</p>)}
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
              <Trash2 size={14} /> Remove from draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
