import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Badge, Button } from "../../../components/ui";
import { AlertTriangle, Plus, Trash2 } from "../../../components/icons";
import { Tooltip } from "../../../components/shared/Tooltip";
import {
  money,
  pricingError,
  shopPricingApi,
  UNIT_LABEL,
  type PriceEntry,
  type PriceModifier,
  type ProductDefinition,
  type QuoteResult,
  type ShopProductRow,
  type Strategy,
} from "../../../services/api/shopPricing";

const optionKey = (attr: string, opt: string) => `${attr}:${opt}`;

/** What each price-row field does, shown next to its label */
const TIPS = {
  bulk: (
    <>
      A lower price for bigger orders. Write <b>from:price</b> pairs separated by “;”. For example, <b>100:0.85; 250:0.70</b> charges
      0.85 each from 100 and 0.70 each from 250. The highest step reached prices the <b>whole</b> order, so 250 can cost less than 249.
      Leave empty to always use the main price.
    </>
  ),
  setup: (
    <>
      A one-off fee added <b>once per order</b>, however many copies. Use it for file prep, plates or machine setup. Leave 0 if you
      don’t charge one.
    </>
  ),
  minimum: (
    <>
      The least an order can cost. If the order comes to less (after add-ons and setup), it’s raised to this amount before VAT.
      For example, with a minimum of 10, a 1.80 job costs 10. Leave 0 for no minimum.
    </>
  ),
};

export function ShopProductEditor({
  branchId,
  row,
  canEdit,
  onClose,
}: {
  branchId: string;
  row: ShopProductRow;
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["shopPricing", branchId, "product", row.id],
    queryFn: () => shopPricingApi.product(branchId, row.id),
  });

  // Without a Printdecore price, the shop's own prices are the only way to sell it
  const [strategy, setStrategy] = useState<Strategy>(row.setup?.strategy ?? (row.platformPriced ? "same" : "own"));
  const [pct, setPct] = useState(String(row.setup?.adjustmentPct ?? 0));
  const [disabled, setDisabled] = useState<Set<string>>(new Set(row.setup?.disabledOptionKeys ?? []));
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const joined = !!data?.setup;
  const savedOwn = data?.setup?.strategy === "own";

  useEffect(() => {
    if (!data?.setup) return;
    setStrategy(data.setup.strategy);
    setPct(String(data.setup.adjustmentPct));
    setDisabled(new Set(data.setup.disabledOptionKeys));
  }, [data?.setup]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["shopPricing", branchId] });

  // Slides in from the right; slides out before closing
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = scroll;
    };
  }, []);
  const close = () => {
    setShown(false);
    setTimeout(onClose, 200);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const save = async () => {
    setSaving(true);
    setProblems([]);
    try {
      await shopPricingApi.save(branchId, row.id, { strategy, adjustmentPct: Number(pct) || 0, disabledOptionKeys: [...disabled] });
      success(joined ? "Saved" : `${row.name} added to your shop`);
      refresh();
    } catch (e) {
      const err = pricingError(e);
      setProblems(err.problems.length ? err.problems : [err.message]);
    } finally {
      setSaving(false);
    }
  };

  const leave = async () => {
    if (!window.confirm(`Stop selling ${row.name} on Printdecore's pricing?`)) return;
    try {
      await shopPricingApi.leave(branchId, row.id);
      success(row.hasOldService ? "Removed — your old setup is back" : "Removed from your shop");
      refresh();
      close();
    } catch (e) {
      showError(pricingError(e).message);
    }
  };

  const product = data?.product;
  const draftVersionId = data?.priceList?.draftVersionId ?? null;

  return (
    <>
      <div
        className={cn("fixed inset-0 bg-black/50 z-50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={row.name}
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-3xl flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.15)] transform transition-transform duration-200",
          shown ? "translate-x-0" : "translate-x-full",
          t.surface,
        )}
      >
        <div className={cn("flex items-center justify-between gap-3 px-6 py-4 border-b", t.border)}>
          <div>
            <h3 className={cn("text-lg font-bold", t.text)}>{row.name}</h3>
            <p className={cn("text-xs", t.textSecondary)}>
              {product ? `Priced ${UNIT_LABEL[product.pricingUnit]}` : row.category} · Printdecore sets the options, you choose what you offer and your price
            </p>
          </div>
          <button onClick={close} className={cn("p-1 rounded-md text-xl leading-none shrink-0", t.textSecondary)} aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading || !product ? (
            <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
          ) : (
            <>
              {row.hasOldService && !joined && (
                <Notice>
                  You already sell this with your own options and prices. Adding it switches to Printdecore’s options — your
                  old setup is kept and comes back if you remove it.
                </Notice>
              )}

              <Block title="What you offer" subtitle="Switch off anything your shop can’t make. Customers won’t be able to pick it.">
                <div className="space-y-3">
                  {product.attributes.map((a) => (
                    <div key={a.key}>
                      <p className={cn("text-xs font-semibold mb-1.5", t.text)}>{a.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {a.options.map((o) => {
                          const k = optionKey(a.key, o.key);
                          const on = !disabled.has(k);
                          return (
                            <button
                              key={k}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                const next = new Set(disabled);
                                if (on) next.add(k);
                                else next.delete(k);
                                setDisabled(next);
                              }}
                              className={cn(
                                "px-3 py-1 rounded-full text-xs border transition-colors",
                                on ? "border-amber-400 bg-amber-50 text-gray-900 dark:bg-amber-900/20 dark:text-amber-100" : cn(t.border, t.textTertiary, "line-through"),
                              )}
                            >
                              {o.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {product.attributes.length === 0 && <p className={cn("text-xs", t.textSecondary)}>No options — one product for everyone.</p>}
                </div>
              </Block>

              <Block title="Your price">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { s: "same", title: "Same as Printdecore", body: "Follows Printdecore’s prices as they change." },
                      { s: "adjust", title: "Printdecore ± %", body: "Printdecore’s prices, higher or lower by a percentage." },
                      { s: "own", title: "My own prices", body: "Your own price table on the same options." },
                    ] as { s: Strategy; title: string; body: string }[]
                  ).map((o) => (
                    <button
                      key={o.s}
                      type="button"
                      disabled={!canEdit || (o.s !== "own" && !row.platformPriced)}
                      onClick={() => setStrategy(o.s)}
                      className={cn(
                        "text-left px-3 py-2.5 rounded-lg border transition-colors disabled:opacity-40",
                        strategy === o.s ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : t.border,
                      )}
                    >
                      <p className={cn("text-sm font-medium", t.text)}>{o.title}</p>
                      <p className={cn("text-xs mt-0.5", t.textSecondary)}>{o.body}</p>
                    </button>
                  ))}
                </div>
                {!row.platformPriced && (
                  <p className={cn("text-xs mt-2", t.textSecondary)}>
                    Printdecore hasn’t set a price for this product yet, so you sell it at your own prices. Customers can order it once
                    you publish them.
                  </p>
                )}
                {strategy === "adjust" && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      step="0.5"
                      className={cn("w-24 px-3 py-1.5 rounded-lg border text-sm", t.input)}
                      value={pct}
                      disabled={!canEdit}
                      onChange={(e) => setPct(e.target.value)}
                    />
                    <span className={cn("text-sm", t.textSecondary)}>
                      % {Number(pct) < 0 ? "below" : "above"} Printdecore — use a minus for cheaper (e.g. -10)
                    </span>
                  </div>
                )}
                {strategy === "own" && !savedOwn && (
                  <p className={cn("text-xs mt-2", t.textSecondary)}>
                    Save to start your price table — it begins as a copy of Printdecore’s prices, and customers pay those until you publish yours.
                  </p>
                )}
              </Block>

              {savedOwn && strategy === "own" && (
                <OwnPrices branchId={branchId} product={product} draftVersionId={draftVersionId} liveVersionId={data?.priceList?.liveVersionId ?? null} canEdit={canEdit} onChanged={refresh} />
              )}

              <Preview
                branchId={branchId}
                product={product}
                strategy={strategy}
                pct={Number(pct) || 0}
                disabled={[...disabled]}
                versionId={savedOwn && strategy === "own" ? draftVersionId : null}
              />
            </>
          )}
        </div>

        {canEdit && (
          <div className={cn("px-6 py-3 border-t flex items-center gap-3", t.border)}>
            <div className="flex-1 text-xs text-red-500 space-y-0.5">
              {problems.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {joined && <Button variant="ghost" onClick={leave}>Remove from my shop</Button>}
            <Button onClick={save} loading={saving} disabled={!product}>{joined ? "Save" : "Add to my shop"}</Button>
          </div>
        )}
      </aside>
    </>
  );
}

function Block({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  const t = useThemeClasses();
  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className={cn("text-sm font-semibold", t.text)}>{title}</h4>
          {subtitle && <p className={cn("text-xs mt-0.5", t.textSecondary)}>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-gray-800 dark:text-amber-100">
      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

// ── Own price table ─────────────────────────────────────────────────────────

const breaksText = (e: PriceEntry) => e.breaks.map((b) => `${b.min}:${b.unitPrice}`).join("; ");
const parseBreaks = (s: string) => {
  if (!s.trim()) return [];
  const out = [];
  for (const part of s.split(/[;,]/).map((p) => p.trim()).filter(Boolean)) {
    const [min, price] = part.split(":").map((x) => Number(x.trim()));
    if (!(min > 0) || !(price >= 0)) return null;
    out.push({ min, unitPrice: price });
  }
  return out.sort((a, b) => a.min - b.min);
};

function OwnPrices({
  branchId,
  product,
  draftVersionId,
  liveVersionId,
  canEdit,
  onChanged,
}: {
  branchId: string;
  product: ProductDefinition;
  draftVersionId: string | null;
  liveVersionId: string | null;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const versionId = draftVersionId ?? liveVersionId;
  const { data, isLoading } = useQuery({
    queryKey: ["shopPricing", branchId, "prices", versionId, product.id],
    queryFn: () => shopPricingApi.prices(branchId, versionId!, product.id),
    enabled: !!versionId,
  });
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [breaks, setBreaks] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<PriceModifier[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEntries(data.entries);
    setBreaks(data.entries.map(breaksText));
    setModifiers(data.modifiers);
    setDirty(false);
  }, [data]);

  const optionName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of product.attributes) for (const o of a.options) m.set(optionKey(a.key, o.key), `${a.name}: ${o.name}`);
    return m;
  }, [product]);
  const matchable = product.attributes.filter((a) => a.selection === "one" && a.options.length);
  const editable = canEdit && !!draftVersionId;
  const cell = cn("px-2 py-1 rounded-md border text-sm w-full", t.input);

  const startDraft = async () => {
    try {
      await shopPricingApi.openDraft(branchId);
      onChanged();
    } catch (e) {
      showError(pricingError(e).message);
    }
  };

  const save = async () => {
    const parsed = breaks.map(parseBreaks);
    const bad = parsed.findIndex((b) => b === null);
    if (bad >= 0) return showError(`Row ${bad + 1}: write bulk prices as "100:0.85; 250:0.70"`);
    setBusy(true);
    try {
      await shopPricingApi.savePrices(branchId, draftVersionId!, product.id, { entries: entries.map((e, i) => ({ ...e, breaks: parsed[i]! })), modifiers });
      success("Draft prices saved — publish them from the Pricing page");
      setDirty(false);
      onChanged();
    } catch (e) {
      const err = pricingError(e);
      showError(err.problems[0] ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  const setEntry = (i: number, e: PriceEntry) => {
    setEntries(entries.map((x, j) => (j === i ? e : x)));
    setDirty(true);
  };

  return (
    <Block
      title={`My prices (${UNIT_LABEL[product.pricingUnit]})`}
      subtitle={draftVersionId ? "Changes go into your draft. Customers see them once you publish." : "Your published prices. Open a draft to change them."}
      actions={
        canEdit && !draftVersionId ? (
          <Button size="sm" variant="secondary" onClick={startDraft}>Change prices</Button>
        ) : draftVersionId ? (
          <Badge color="amber">Draft</Badge>
        ) : undefined
      }
    >
      {!versionId || isLoading ? (
        <p className={cn("text-xs", t.textSecondary)}>{isLoading ? "Loading…" : "No prices yet."}</p>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className={cn("rounded-lg border p-2.5", t.border)}>
                <div className="flex flex-wrap items-end gap-2">
                  {matchable.map((a) => (
                    <label key={a.key} className="text-xs">
                      <span className={t.textSecondary}>{a.name}</span>
                      <select
                        className={cn(cell, "mt-0.5")}
                        disabled={!editable}
                        value={e.match[a.key] ?? ""}
                        onChange={(ev) => {
                          const match = { ...e.match };
                          if (ev.target.value) match[a.key] = ev.target.value;
                          else delete match[a.key];
                          setEntry(i, { ...e, match });
                        }}
                      >
                        <option value="">Any</option>
                        {a.options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
                      </select>
                    </label>
                  ))}
                  <label className="text-xs w-24">
                    <span className={t.textSecondary}>Price</span>
                    <input type="number" min="0" step="0.01" className={cn(cell, "mt-0.5")} disabled={!editable} value={e.unitPrice}
                      onChange={(ev) => setEntry(i, { ...e, unitPrice: Number(ev.target.value) || 0 })} />
                  </label>
                  <label className="text-xs flex-1 min-w-[160px]">
                    <span className={cn(t.textSecondary, "inline-flex items-center gap-1")}>
                      Cheaper in bulk (from:price)
                      <Tooltip label="About bulk prices" content={TIPS.bulk} />
                    </span>
                    <input className={cn(cell, "mt-0.5")} disabled={!editable} placeholder="e.g. 100:0.85; 250:0.70" value={breaks[i] ?? ""}
                      onChange={(ev) => { setBreaks(breaks.map((b, j) => (j === i ? ev.target.value : b))); setDirty(true); }} />
                  </label>
                  <label className="text-xs w-20">
                    <span className={cn(t.textSecondary, "inline-flex items-center gap-1")}>
                      Setup
                      <Tooltip label="About setup" content={TIPS.setup} />
                    </span>
                    <input type="number" min="0" step="0.01" className={cn(cell, "mt-0.5")} disabled={!editable} value={e.setupFee}
                      onChange={(ev) => setEntry(i, { ...e, setupFee: Number(ev.target.value) || 0 })} />
                  </label>
                  <label className="text-xs w-20">
                    <span className={cn(t.textSecondary, "inline-flex items-center gap-1")}>
                      Minimum
                      <Tooltip label="About the minimum" content={TIPS.minimum} />
                    </span>
                    <input type="number" min="0" step="0.01" className={cn(cell, "mt-0.5")} disabled={!editable} value={e.minimumCharge}
                      onChange={(ev) => setEntry(i, { ...e, minimumCharge: Number(ev.target.value) || 0 })} />
                  </label>
                  {editable && (
                    <button type="button" className="p-1.5 text-red-500" aria-label="Remove price"
                      onClick={() => { setEntries(entries.filter((_, j) => j !== i)); setBreaks(breaks.filter((_, j) => j !== i)); setDirty(true); }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {editable && (
            <Button size="sm" variant="ghost" icon={Plus} className="mt-2"
              onClick={() => { setEntries([...entries, { match: {}, unitPrice: 0, breaks: [], breakBasis: "quantity", setupFee: 0, minimumCharge: 0 }]); setBreaks([...breaks, ""]); setDirty(true); }}>
              Add a price
            </Button>
          )}

          {modifiers.length > 0 && (
            <div className="mt-4">
              <p className={cn("text-xs font-semibold mb-1.5", t.text)}>Extras</p>
              <div className="space-y-1.5">
                {modifiers.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={cn("flex-1", t.textSecondary)}>{m.label || optionName.get(m.optionKey) || m.optionKey}</span>
                    <input type="number" step="0.01" className={cn(cell, "w-24")} disabled={!editable} value={m.amount}
                      onChange={(ev) => { setModifiers(modifiers.map((x, j) => (j === i ? { ...x, amount: Number(ev.target.value) || 0 } : x))); setDirty(true); }} />
                    <span className={cn("text-xs w-32", t.textTertiary)}>
                      {m.kind === "percent" ? "% of the price" : m.kind === "per_order" ? "GHS per order" : m.kind === "per_side" ? "GHS per side" : m.kind === "per_measure" ? `GHS ${UNIT_LABEL[product.pricingUnit]}` : "GHS per item"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editable && (
            <div className="flex justify-end items-center gap-3 mt-3">
              {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
              <Button size="sm" onClick={save} loading={busy} disabled={!dirty}>Save draft prices</Button>
            </div>
          )}
        </>
      )}
    </Block>
  );
}

// ── Preview ─────────────────────────────────────────────────────────────────

function Preview({
  branchId,
  product,
  strategy,
  pct,
  disabled,
  versionId,
}: {
  branchId: string;
  product: ProductDefinition;
  strategy: Strategy;
  pct: number;
  disabled: string[];
  versionId: string | null;
}) {
  const t = useThemeClasses();
  const defaults = () => {
    const c: Record<string, string | string[]> = {};
    for (const a of product.attributes) {
      const allowed = a.options.filter((o) => !disabled.includes(optionKey(a.key, o.key)));
      if (a.selection === "one") {
        const k = a.defaultOptionKeys.find((d) => allowed.some((o) => o.key === d)) ?? (a.required ? allowed[0]?.key : undefined);
        if (k) c[a.key] = k;
      } else {
        const ks = a.defaultOptionKeys.filter((d) => allowed.some((o) => o.key === d));
        if (ks.length) c[a.key] = ks;
      }
    }
    return c;
  };
  const [choices, setChoices] = useState<Record<string, string | string[]>>(defaults);
  const [quantity, setQuantity] = useState(product.limits.minQuantity ?? 100);
  const [width, setWidth] = useState(914);
  const [height, setHeight] = useState(1829);
  const [pages, setPages] = useState(10);
  const [result, setResult] = useState<{ shop: QuoteResult; platform: QuoteResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const takesSize = product.sizeMode === "custom" || product.sizeMode === "both";

  const run = async () => {
    setBusy(true);
    try {
      setResult(
        await shopPricingApi.preview(branchId, {
          productId: product.id,
          strategy,
          adjustmentPct: pct,
          disabledOptionKeys: disabled,
          versionId,
          quantity,
          choices,
          ...(takesSize && { size: { widthMm: width, heightMm: height } }),
          ...(product.usesPages && { pages }),
        }),
      );
    } catch (e) {
      const err = pricingError(e);
      setResult({ shop: { ok: false, errors: [{ code: "error", message: err.problems[0] ?? err.message }] }, platform: { ok: false, errors: [] } });
    } finally {
      setBusy(false);
    }
  };

  const field = cn("px-2 py-1 rounded-md border text-sm", t.input);
  return (
    <Block title="Try an order" subtitle="Priced by Printdecore’s engine with the settings above, saved or not.">
      <div className="flex flex-wrap items-end gap-2">
        {product.attributes.map((a) => (
          <label key={a.key} className="text-xs">
            <span className={t.textSecondary}>{a.name}</span>
            <select
              className={cn(field, "block mt-0.5")}
              value={Array.isArray(choices[a.key]) ? (choices[a.key] as string[])[0] ?? "" : (choices[a.key] as string) ?? ""}
              onChange={(e) => {
                const next = { ...choices };
                if (e.target.value) next[a.key] = a.selection === "any" ? [e.target.value] : e.target.value;
                else delete next[a.key];
                setChoices(next);
              }}
            >
              <option value="">—</option>
              {a.options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
          </label>
        ))}
        {takesSize && (
          <>
            <label className="text-xs"><span className={t.textSecondary}>Width (mm)</span>
              <input type="number" className={cn(field, "block mt-0.5 w-20")} value={width} onChange={(e) => setWidth(Number(e.target.value) || 0)} /></label>
            <label className="text-xs"><span className={t.textSecondary}>Height (mm)</span>
              <input type="number" className={cn(field, "block mt-0.5 w-20")} value={height} onChange={(e) => setHeight(Number(e.target.value) || 0)} /></label>
          </>
        )}
        {product.usesPages && (
          <label className="text-xs"><span className={t.textSecondary}>Pages</span>
            <input type="number" min="1" className={cn(field, "block mt-0.5 w-16")} value={pages} onChange={(e) => setPages(Number(e.target.value) || 1)} /></label>
        )}
        <label className="text-xs"><span className={t.textSecondary}>Quantity</span>
          <input type="number" min="1" className={cn(field, "block mt-0.5 w-20")} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} /></label>
        <Button size="sm" onClick={run} loading={busy}>Price it</Button>
      </div>
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <QuoteCard title="Your customer pays" result={result.shop} />
          <QuoteCard title="Printdecore’s price" result={result.platform} muted />
        </div>
      )}
    </Block>
  );
}

function QuoteCard({ title, result, muted }: { title: string; result: QuoteResult; muted?: boolean }) {
  const t = useThemeClasses();
  return (
    <div className={cn("rounded-lg border p-3 text-sm", t.border, muted && "opacity-80")}>
      <p className={cn("text-xs font-semibold mb-1.5", t.textSecondary)}>{title}</p>
      {result.ok ? (
        <>
          {result.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className={t.text}>{l.label}{l.detail && <span className={cn("text-xs ml-1", t.textTertiary)}>· {l.detail}</span>}</span>
              <span className={cn("tabular-nums", t.text)}>{money(l.amount, result.currency)}</span>
            </div>
          ))}
          <div className={cn("flex justify-between pt-1 mt-1 border-t font-semibold", t.border, t.text)}>
            <span>Total</span>
            <span className="tabular-nums">{money(result.total, result.currency)}</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-red-500">{result.errors[0]?.message ?? "Can’t price this"}</p>
      )}
    </div>
  );
}
