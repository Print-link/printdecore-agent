import { useState } from "react";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui";
import { ChevronDown, Plus, Trash2 } from "../../../components/icons";
import { Tooltip } from "../../../components/shared/Tooltip";
import { UNIT_LABEL, type PriceEntry, type PriceModifier, type ProductDefinition } from "../../../services/api/shopPricing";
import { Block } from "./parts";

const blankEntry = (match: Record<string, string> = {}): PriceEntry => ({ match, unitPrice: 0, breaks: [], breakBasis: "quantity", setupFee: 0, minimumCharge: 0 });
const isBase = (e: PriceEntry) => Object.keys(e.match ?? {}).length === 0;
const breaksText = (e: PriceEntry) => e.breaks.map((b) => `${b.min}:${b.unitPrice}`).join("; ");
const parseBreaks = (s: string) => {
  if (!s.trim()) return [];
  const out = [];
  for (const part of s.split(/[;,]/).map((p) => p.trim()).filter(Boolean)) {
    const [min, price] = part.split(":").map((x) => Number(x.trim()));
    if (!(min > 0) || !(price > 0)) return null;
    out.push({ min, unitPrice: price });
  }
  return out.sort((a, b) => a.min - b.min);
};

const EXTRA_KINDS: Array<{ kind: PriceModifier["kind"]; label: string; paged?: boolean }> = [
  { kind: "per_item", label: "each copy" },
  { kind: "per_order", label: "once per order" },
  { kind: "percent", label: "% of the price" },
  { kind: "per_side", label: "each printed side", paged: true },
];

const TIPS = {
  bulk: (
    <>
      A lower price for bigger orders. Write <b>from:price</b> pairs separated by “;”. For example, <b>100:0.85; 250:0.70</b> charges 0.85 each
      from 100 and 0.70 each from 250.
    </>
  ),
  setup: <>A one-off fee added once per order, however many copies — for file prep or machine setup.</>,
  minimum: <>The least an order can cost. A smaller order is raised to this amount.</>,
};

/**
 * A service's prices, kept simple: one price per unit, and — only if some
 * options cost differently — a small table of those. Bulk prices, setup fees,
 * minimums, option extras and rules wait under "More pricing options".
 */
export function SimplePrices({
  product,
  entries,
  modifiers,
  onChange,
  canEdit,
  more,
}: {
  product: ProductDefinition;
  entries: PriceEntry[];
  modifiers: PriceModifier[];
  onChange: (next: { entries: PriceEntry[]; modifiers: PriceModifier[] }) => void;
  canEdit: boolean;
  /** Extra settings shown inside "More pricing options" (the rules editor) */
  more?: React.ReactNode;
}) {
  const t = useThemeClasses();
  const cell = cn("px-2 py-1.5 rounded-md border text-sm w-full", t.input);
  const unit = UNIT_LABEL[product.pricingUnit];
  const matchable = product.attributes.filter((a) => a.selection === "one" && a.options.length);
  const optionLabels = product.attributes.flatMap((a) => a.options.map((o) => ({ key: `${a.key}:${o.key}`, label: `${a.name}: ${o.name}` })));
  const paged = product.pricingUnit === "side" || product.pricingUnit === "sheet";

  const baseIndex = entries.findIndex(isBase);
  const combos = entries.map((e, i) => ({ e, i })).filter(({ e }) => !isBase(e));
  const [showTable, setShowTable] = useState(combos.length > 0);
  const hasMore = entries.some((e) => e.breaks.length || e.setupFee || e.minimumCharge) || modifiers.length > 0;
  const [showMore, setShowMore] = useState(hasMore);
  /** Bulk prices as typed, per row, until they parse */
  const [breakDrafts, setBreakDrafts] = useState<Record<number, string>>({});

  const setEntries = (next: PriceEntry[]) => onChange({ entries: next, modifiers });
  const setEntry = (i: number, e: PriceEntry) => setEntries(entries.map((x, j) => (j === i ? e : x)));
  const setModifiers = (next: PriceModifier[]) => onChange({ entries, modifiers: next });
  const removeEntry = (i: number) => {
    setEntries(entries.filter((_, j) => j !== i));
    setBreakDrafts({});
  };

  const setBase = (price: number) => {
    if (baseIndex >= 0) setEntry(baseIndex, { ...entries[baseIndex], unitPrice: price });
    else setEntries([{ ...blankEntry(), unitPrice: price }, ...entries]);
  };

  const moreFields = (e: PriceEntry, i: number) =>
    showMore && (
      <div className="flex flex-wrap gap-2 mt-2">
        <label className="text-xs flex-1 min-w-[180px]">
          <span className={cn(t.textSecondary, "inline-flex items-center gap-1")}>
            Cheaper in bulk (from:price) <Tooltip label="About bulk prices" content={TIPS.bulk} />
          </span>
          {(() => {
            const text = breakDrafts[i] ?? breaksText(e);
            const bad = parseBreaks(text) === null;
            return (
              <input
                className={cn(cell, "mt-0.5", bad && "border-red-400")}
                disabled={!canEdit}
                placeholder="e.g. 100:0.85; 250:0.70"
                value={text}
                onChange={(ev) => {
                  setBreakDrafts({ ...breakDrafts, [i]: ev.target.value });
                  const parsed = parseBreaks(ev.target.value);
                  if (parsed) setEntry(i, { ...e, breaks: parsed });
                }}
              />
            );
          })()}
        </label>
        <label className="text-xs w-24">
          <span className={cn(t.textSecondary, "inline-flex items-center gap-1")}>
            Setup fee <Tooltip label="About setup" content={TIPS.setup} />
          </span>
          <input type="number" min="0" step="0.01" className={cn(cell, "mt-0.5")} disabled={!canEdit} value={e.setupFee || ""} placeholder="0"
            onChange={(ev) => setEntry(i, { ...e, setupFee: Number(ev.target.value) || 0 })} />
        </label>
        <label className="text-xs w-24">
          <span className={cn(t.textSecondary, "inline-flex items-center gap-1")}>
            Minimum <Tooltip label="About the minimum" content={TIPS.minimum} />
          </span>
          <input type="number" min="0" step="0.01" className={cn(cell, "mt-0.5")} disabled={!canEdit} value={e.minimumCharge || ""} placeholder="0"
            onChange={(ev) => setEntry(i, { ...e, minimumCharge: Number(ev.target.value) || 0 })} />
        </label>
      </div>
    );

  return (
    <Block title="Price">
      <div className="space-y-4">
        <div className={cn("rounded-lg border p-3", t.border)}>
          <label className="text-xs block max-w-[220px]">
            <span className={t.textSecondary}>{combos.length ? `Price ${unit} (everything else)` : `Price ${unit}`}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={cn(cell, "mt-0.5 text-base")}
              disabled={!canEdit}
              placeholder="e.g. 0.50"
              value={baseIndex >= 0 ? entries[baseIndex].unitPrice || "" : ""}
              onChange={(ev) => setBase(Number(ev.target.value) || 0)}
            />
          </label>
          {baseIndex >= 0 && moreFields(entries[baseIndex], baseIndex)}
          {baseIndex >= 0 && combos.length > 0 && canEdit && (
            <button type="button" className={cn("text-xs underline mt-2", t.textSecondary)} onClick={() => removeEntry(baseIndex)}>
              Remove this price
            </button>
          )}
        </div>

        {matchable.length > 0 && (
          <div>
            {!showTable ? (
              canEdit && (
                <button type="button" className={cn("text-sm underline", t.textSecondary)} onClick={() => setShowTable(true)}>
                  Some options cost differently…
                </button>
              )
            ) : (
              <div className="space-y-2">
                <p className={cn("text-xs font-medium", t.text)}>Prices for some options</p>
                {combos.map(({ e, i }) => (
                  <div key={i} className={cn("rounded-lg border p-2.5", t.border)}>
                    <div className="flex flex-wrap items-end gap-2">
                      {matchable.map((a) => (
                        <label key={a.key} className="text-xs">
                          <span className={t.textSecondary}>{a.name}</span>
                          <select
                            className={cn(cell, "mt-0.5 w-auto")}
                            disabled={!canEdit}
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
                        <input type="number" min="0" step="0.01" className={cn(cell, "mt-0.5")} disabled={!canEdit} value={e.unitPrice || ""}
                          onChange={(ev) => setEntry(i, { ...e, unitPrice: Number(ev.target.value) || 0 })} />
                      </label>
                      {canEdit && (
                        <button type="button" className="p-1.5 text-red-500" aria-label="Remove price" onClick={() => removeEntry(i)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {moreFields(e, i)}
                  </div>
                ))}
                {canEdit && (
                  <Button size="sm" variant="ghost" icon={Plus}
                    onClick={() => setEntries([...entries, blankEntry({ [matchable[0].key]: matchable[0].options[0].key })])}>
                    Add a price
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className={cn("border-t pt-3", t.border)}>
          <button type="button" className={cn("text-sm font-medium inline-flex items-center gap-1", t.text)} onClick={() => setShowMore(!showMore)} aria-expanded={showMore}>
            <ChevronDown size={16} className={cn("transition-transform", !showMore && "-rotate-90")} />
            More pricing options
          </button>
          {!showMore ? (
            <p className={cn("text-xs mt-1", t.textSecondary)}>Bulk prices, setup fee, minimum, extras.</p>
          ) : (
            <div className="space-y-5 mt-3">
              {optionLabels.length > 0 && (
                <div className="space-y-2">
                  <p className={cn("text-xs font-medium", t.text)}>Extras for options</p>
                  {modifiers.map((m, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <select className={cn(cell, "w-auto flex-1 min-w-[160px]")} disabled={!canEdit} value={m.optionKey}
                        onChange={(ev) => setModifiers(modifiers.map((x, j) => (j === i ? { ...x, optionKey: ev.target.value } : x)))}>
                        {!optionLabels.some((o) => o.key === m.optionKey) && <option value={m.optionKey}>{m.optionKey}</option>}
                        {optionLabels.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                      <input type="number" step="0.01" className={cn(cell, "w-24")} disabled={!canEdit} value={m.amount}
                        onChange={(ev) => setModifiers(modifiers.map((x, j) => (j === i ? { ...x, amount: Number(ev.target.value) || 0 } : x)))} />
                      <select className={cn(cell, "w-auto")} disabled={!canEdit} value={m.kind}
                        onChange={(ev) => setModifiers(modifiers.map((x, j) => (j === i ? { ...x, kind: ev.target.value as PriceModifier["kind"] } : x)))}>
                        {EXTRA_KINDS.filter((k) => !k.paged || paged || k.kind === m.kind).map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
                        {m.kind === "per_measure" && <option value="per_measure">{unit}</option>}
                      </select>
                      {canEdit && (
                        <button type="button" className="p-1.5 text-red-500" aria-label="Remove extra" onClick={() => setModifiers(modifiers.filter((_, j) => j !== i))}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {canEdit && (
                    <Button size="sm" variant="ghost" icon={Plus} onClick={() => setModifiers([...modifiers, { optionKey: optionLabels[0].key, kind: "per_item", amount: 0 }])}>
                      Add an extra
                    </Button>
                  )}
                </div>
              )}
              {more}
            </div>
          )}
        </div>
      </div>
    </Block>
  );
}
