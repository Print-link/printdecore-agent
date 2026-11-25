import { useState } from "react";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui";
import { AlertTriangle } from "../../../components/icons";
import { money, pricingError, shopPricingApi, type ProductDefinition, type QuoteResult, type ServicePrices } from "../../../services/api/shopPricing";

export function Block({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
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

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-gray-800 dark:text-amber-100">
      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/**
 * "Try an order": prices a job with the prices on screen, saved or not, so
 * the shop sees what customers will pay before saving.
 */
export function Preview({ branchId, product, prices }: { branchId: string; product: ProductDefinition; prices: ServicePrices }) {
  const t = useThemeClasses();
  const defaults = () => {
    const c: Record<string, string | string[]> = {};
    for (const a of product.attributes) {
      if (!a.options.length) continue;
      if (a.selection === "one") {
        const k = a.defaultOptionKeys[0] ?? (a.required ? a.options[0]?.key : undefined);
        if (k) c[a.key] = k;
      } else if (a.defaultOptionKeys.length) c[a.key] = a.defaultOptionKeys;
    }
    return c;
  };
  const [choices, setChoices] = useState<Record<string, string | string[]>>(defaults);
  const [quantity, setQuantity] = useState(product.limits.minQuantity ?? 100);
  const [width, setWidth] = useState(914);
  const [height, setHeight] = useState(1829);
  const [pages, setPages] = useState(10);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const takesSize = product.sizeMode === "custom" || product.sizeMode === "both";

  const run = async () => {
    setBusy(true);
    try {
      const r = await shopPricingApi.preview(branchId, {
        productId: product.id,
        strategy: "own",
        prices,
        quantity,
        choices,
        ...(takesSize && { size: { widthMm: width, heightMm: height } }),
        ...(product.usesPages && { pages }),
      });
      setResult(r.shop);
    } catch (e) {
      const err = pricingError(e);
      setResult({ ok: false, errors: [{ code: "error", message: err.problems[0] ?? err.message }] });
    } finally {
      setBusy(false);
    }
  };

  const field = cn("px-2 py-1 rounded-md border text-sm", t.input);
  return (
    <Block title="Try an order" subtitle="See what a customer would pay with the prices above — before you save.">
      <div className="flex flex-wrap items-end gap-2">
        {product.attributes
          .filter((a) => a.options.length)
          .map((a) => (
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
        <div className="mt-3">
          <QuoteCard title="Your customer pays" result={result} />
        </div>
      )}
    </Block>
  );
}

function QuoteCard({ title, result }: { title: string; result: QuoteResult }) {
  const t = useThemeClasses();
  return (
    <div className={cn("rounded-lg border p-3 text-sm", t.border)}>
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
