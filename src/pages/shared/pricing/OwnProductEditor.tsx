import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Badge, Button } from "../../../components/ui";
import { Plus, Trash2 } from "../../../components/icons";
import { apiService } from "../../../services/api";
import {
  pricingError,
  shopPricingApi,
  UNIT_LABEL,
  type OwnProductInput,
  type OwnProductRow,
  type PricingUnit,
  type ProductDefinition,
} from "../../../services/api/shopPricing";
import { Block, Notice, OwnPrices, Preview } from "./ShopProductEditor";

type SizeMode = ProductDefinition["sizeMode"];

interface OptionDraft {
  key?: string;
  name: string;
}
interface ChoiceDraft {
  key?: string;
  name: string;
  selection: "one" | "any";
  required: boolean;
  options: OptionDraft[];
}
interface SizeDraft {
  key?: string;
  name: string;
  widthMm: string;
  heightMm: string;
}

const SIZE_KEY = "size";
const AREA = (u: PricingUnit) => u === "sqft" || u === "sqm";

/** "Gloss finish" → "gloss_finish", unique among `taken` */
const keyFrom = (name: string, taken: Set<string>) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "option";
  const start = /^[a-z0-9]/.test(base) ? base : `o_${base}`;
  let key = start;
  for (let i = 2; taken.has(key); i++) key = `${start}_${i}`;
  taken.add(key);
  return key;
};

const SIZE_MODES: Array<{ mode: SizeMode; title: string; body: string }> = [
  { mode: "none", title: "No sizes", body: "One size, or size doesn’t change the price." },
  { mode: "preset", title: "Sizes you list", body: "Customers pick from your sizes." },
  { mode: "custom", title: "Customer’s size", body: "Customers type width and height." },
  { mode: "both", title: "Both", body: "Your sizes, or their own." },
];

/**
 * Make or change one of the shop's own products: its name, where it's listed,
 * how it's priced, its sizes and choices — then its prices, from the shop's
 * own price list.
 */
export function OwnProductEditor({
  branchId,
  row,
  canEdit,
  onClose,
}: {
  branchId: string;
  /** null = a new product */
  row: OwnProductRow | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const [productId, setProductId] = useState<string | null>(row?.id ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["shopPricing", branchId, "ownProduct", productId],
    queryFn: () => shopPricingApi.ownProduct(branchId, productId!),
    enabled: !!productId,
  });
  const { data: list } = useQuery({
    queryKey: ["shopPricing", branchId, "products"],
    queryFn: () => shopPricingApi.products(branchId),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["serviceCategories", branchId],
    queryFn: () => apiService.getServiceCategories(branchId),
    staleTime: 300000,
  });

  const [name, setName] = useState(row?.name ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState(row?.subCategoryId ?? "");
  const [unit, setUnit] = useState<PricingUnit>(row?.pricingUnit ?? "item");
  const [sizeMode, setSizeMode] = useState<SizeMode>("none");
  const [sizes, setSizes] = useState<SizeDraft[]>([]);
  const [choices, setChoices] = useState<ChoiceDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const { data: subCategories = [] } = useQuery({
    queryKey: ["serviceSubCategories", categoryId, branchId],
    queryFn: () => apiService.getServiceSubCategories(categoryId, branchId),
    enabled: !!categoryId,
    staleTime: 300000,
  });

  // What was last saved, to tell unsaved edits apart
  const [baseline, setBaseline] = useState<string | null>(null);
  const takeBaseline = useRef(false);

  // Fill the form from the saved product
  useEffect(() => {
    if (!data) return;
    takeBaseline.current = true;
    const p = data.product;
    setName(p.name);
    setSubCategoryId(data.subCategoryId);
    setUnit(p.pricingUnit);
    setSizeMode(p.sizeMode);
    const sizeAttr = p.attributes.find((a) => a.key === SIZE_KEY && a.options.some((o) => o.specs?.widthMm));
    setSizes(
      (sizeAttr?.options ?? []).map((o) => ({ key: o.key, name: o.name, widthMm: String(o.specs?.widthMm ?? ""), heightMm: String(o.specs?.heightMm ?? "") })),
    );
    setChoices(
      p.attributes
        .filter((a) => a !== sizeAttr)
        .map((a) => ({ key: a.key, name: a.name, selection: a.selection, required: a.required, options: a.options.map((o) => ({ key: o.key, name: o.name })) })),
    );
  }, [data]);

  useEffect(() => {
    if (!takeBaseline.current) return;
    takeBaseline.current = false;
    setBaseline(JSON.stringify(input()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, choices, sizes, unit, sizeMode, subCategoryId]);

  // Find the saved listing's category once the categories are in
  useEffect(() => {
    if (!subCategoryId || categoryId || !categories.length) return;
    let cancelled = false;
    (async () => {
      for (const c of categories) {
        const subs = await qc.fetchQuery({
          queryKey: ["serviceSubCategories", c.id, branchId],
          queryFn: () => apiService.getServiceSubCategories(c.id, branchId),
          staleTime: 300000,
        });
        if (cancelled) return;
        if (subs.some((s) => s.id === subCategoryId)) return setCategoryId(c.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subCategoryId, categoryId, categories, branchId, qc]);

  // Area pricing needs sizes
  useEffect(() => {
    if (AREA(unit) && sizeMode === "none") setSizeMode("custom");
  }, [unit, sizeMode]);

  const takesPresets = sizeMode === "preset" || sizeMode === "both";

  /** The definition to send, with keys kept for saved choices and made for new ones */
  const input = (): OwnProductInput => {
    const attrKeys = new Set(choices.map((c) => c.key).filter(Boolean) as string[]);
    if (takesPresets) attrKeys.add(SIZE_KEY);
    const attributes: OwnProductInput["definition"]["attributes"] = [];
    if (takesPresets) {
      const taken = new Set(sizes.map((s) => s.key).filter(Boolean) as string[]);
      attributes.push({
        key: SIZE_KEY,
        name: "Size",
        selection: "one",
        required: sizeMode === "preset",
        options: sizes.map((s) => ({
          key: s.key ?? keyFrom(s.name, taken),
          name: s.name,
          specs: { widthMm: Number(s.widthMm) || undefined, heightMm: Number(s.heightMm) || undefined },
        })),
      });
    }
    for (const c of choices) {
      const taken = new Set(c.options.map((o) => o.key).filter(Boolean) as string[]);
      attributes.push({
        key: c.key ?? keyFrom(c.name, attrKeys),
        name: c.name,
        selection: c.selection,
        required: c.selection === "one" && c.required,
        options: c.options.map((o) => ({ key: o.key ?? keyFrom(o.name, taken), name: o.name })),
      });
    }
    return { name, subCategoryId, definition: { pricingUnit: unit, sizeMode, attributes } };
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["shopPricing", branchId] });

  const save = async () => {
    setProblems([]);
    if (!name.trim()) return setProblems(["Give the product a name"]);
    if (!subCategoryId) return setProblems(["Choose where the product is listed"]);
    setSaving(true);
    try {
      if (productId) {
        await shopPricingApi.updateOwnProduct(branchId, productId, input());
        success("Saved");
      } else {
        const made = await shopPricingApi.createOwnProduct(branchId, input());
        setProductId(made.product.id);
        success(`${made.product.name} created — now set its prices`);
      }
      refresh();
    } catch (e) {
      const err = pricingError(e);
      setProblems(err.problems.length ? err.problems : [err.message]);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!productId || !window.confirm(`Stop selling ${name}? Past orders keep it; customers can't order it any more.`)) return;
    try {
      await shopPricingApi.removeOwnProduct(branchId, productId);
      success("Product removed");
      refresh();
      close();
    } catch (e) {
      showError(pricingError(e).message);
    }
  };

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

  const field = cn("w-full px-3 py-2 rounded-lg border text-sm", t.input);
  const small = cn("px-2 py-1.5 rounded-md border text-sm", t.input);
  const product = data?.product;
  const draftVersionId = list?.priceList?.draftVersionId ?? null;
  const liveVersionId = list?.priceList?.liveVersionId ?? null;
  const dirty = baseline !== JSON.stringify(input());

  const setChoice = (i: number, c: ChoiceDraft) => setChoices(choices.map((x, j) => (j === i ? c : x)));

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/50 z-50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} onClick={close} />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[640px] flex flex-col shadow-2xl transition-transform duration-200",
          t.isDark ? "bg-gray-900" : "bg-white",
          shown ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label={productId ? `Edit ${name}` : "New product"}
      >
        <div className={cn("px-6 py-4 border-b flex items-center gap-3", t.border)}>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold truncate", t.text)}>{productId ? name || "Your product" : "New product"}</h3>
            <p className={cn("text-xs", t.textSecondary)}>Your own product, priced from your price list</p>
          </div>
          {row && <Badge color={row.onSale ? "green" : "amber"}>{row.onSale ? "On sale" : "Not on sale yet"}</Badge>}
          <button type="button" onClick={close} className={cn("text-sm", t.textSecondary)} aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {productId && isLoading ? (
            <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
          ) : (
            <>
              <Block title="Product">
                <div className="space-y-3">
                  <label className="block text-xs">
                    <span className={t.textSecondary}>Name</span>
                    <input className={cn(field, "mt-1")} value={name} disabled={!canEdit} maxLength={120} placeholder="e.g. Branded tote bag" onChange={(e) => setName(e.target.value)} />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs">
                      <span className={t.textSecondary}>Category</span>
                      <select className={cn(field, "mt-1")} value={categoryId} disabled={!canEdit} onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(""); }}>
                        <option value="">Choose…</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className={t.textSecondary}>Listed under</span>
                      <select className={cn(field, "mt-1")} value={subCategoryId} disabled={!canEdit || !categoryId} onChange={(e) => setSubCategoryId(e.target.value)}>
                        <option value="">{categoryId ? "Choose…" : "Pick a category first"}</option>
                        {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="block text-xs">
                    <span className={t.textSecondary}>One price is for</span>
                    <select className={cn(field, "mt-1")} value={unit} disabled={!canEdit} onChange={(e) => setUnit(e.target.value as PricingUnit)}>
                      {(Object.keys(UNIT_LABEL) as PricingUnit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u].replace("per ", "each ")}</option>)}
                    </select>
                  </label>
                </div>
              </Block>

              <Block title="Sizes" subtitle={AREA(unit) ? "Priced by area, so every order needs a size." : undefined}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SIZE_MODES.filter((m) => !(AREA(unit) && m.mode === "none")).map((m) => (
                    <button
                      key={m.mode}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setSizeMode(m.mode)}
                      className={cn("text-left rounded-lg border px-3 py-2", sizeMode === m.mode ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : t.border)}
                    >
                      <p className={cn("text-sm font-medium", t.text)}>{m.title}</p>
                      <p className={cn("text-[11px] mt-0.5", t.textSecondary)}>{m.body}</p>
                    </button>
                  ))}
                </div>
                {takesPresets && (
                  <div className="mt-3 space-y-2">
                    {sizes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input className={cn(small, "flex-1")} placeholder="Name, e.g. A5" value={s.name} disabled={!canEdit}
                          onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <input className={cn(small, "w-20")} type="number" min="1" placeholder="W mm" value={s.widthMm} disabled={!canEdit}
                          onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, widthMm: e.target.value } : x)))} />
                        <span className={t.textTertiary}>×</span>
                        <input className={cn(small, "w-20")} type="number" min="1" placeholder="H mm" value={s.heightMm} disabled={!canEdit}
                          onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, heightMm: e.target.value } : x)))} />
                        {canEdit && (
                          <button type="button" aria-label="Remove size" onClick={() => setSizes(sizes.filter((_, j) => j !== i))} className={t.textTertiary}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <Button size="sm" variant="ghost" icon={Plus} onClick={() => setSizes([...sizes, { name: "", widthMm: "", heightMm: "" }])}>Add a size</Button>
                    )}
                  </div>
                )}
              </Block>

              <Block
                title="Choices"
                subtitle="What customers choose, like colour, finish or paper. You price each option in your price table."
                actions={canEdit ? (
                  <Button size="sm" variant="secondary" icon={Plus}
                    onClick={() => setChoices([...choices, { name: "", selection: "one", required: true, options: [{ name: "" }] }])}>
                    Add a choice
                  </Button>
                ) : undefined}
              >
                {choices.length === 0 && <p className={cn("text-sm", t.textSecondary)}>No choices — customers just pick a quantity.</p>}
                <div className="space-y-3">
                  {choices.map((c, i) => (
                    <div key={i} className={cn("rounded-lg border p-3 space-y-2", t.border)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <input className={cn(small, "flex-1 min-w-[140px]")} placeholder="Choice, e.g. Finish" value={c.name} disabled={!canEdit}
                          onChange={(e) => setChoice(i, { ...c, name: e.target.value })} />
                        <select className={small} value={c.selection} disabled={!canEdit} onChange={(e) => setChoice(i, { ...c, selection: e.target.value as "one" | "any" })}>
                          <option value="one">Pick one</option>
                          <option value="any">Pick any</option>
                        </select>
                        {c.selection === "one" && (
                          <label className={cn("text-xs flex items-center gap-1", t.textSecondary)}>
                            <input type="checkbox" checked={c.required} disabled={!canEdit} onChange={(e) => setChoice(i, { ...c, required: e.target.checked })} />
                            Must choose
                          </label>
                        )}
                        {canEdit && (
                          <button type="button" aria-label="Remove choice" onClick={() => setChoices(choices.filter((_, j) => j !== i))} className={t.textTertiary}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.options.map((o, k) => (
                          <span key={k} className="inline-flex items-center gap-1">
                            <input className={cn(small, "w-36")} placeholder="Option, e.g. Gloss" value={o.name} disabled={!canEdit}
                              onChange={(e) => setChoice(i, { ...c, options: c.options.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })} />
                            {canEdit && c.options.length > 1 && (
                              <button type="button" aria-label="Remove option" className={t.textTertiary}
                                onClick={() => setChoice(i, { ...c, options: c.options.filter((_, j) => j !== k) })}>✕</button>
                            )}
                          </span>
                        ))}
                        {canEdit && (
                          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setChoice(i, { ...c, options: [...c.options, { name: "" }] })}>Option</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Block>

              {product && dirty && canEdit && (
                <Notice>Save your changes before pricing — new choices and sizes appear in the price table once saved.</Notice>
              )}

              {product && (
                <>
                  <OwnPrices branchId={branchId} product={product} draftVersionId={draftVersionId} liveVersionId={liveVersionId} canEdit={canEdit} onChanged={refresh} />
                  {!row?.priced && (
                    <p className={cn("text-xs", t.textSecondary)}>
                      Customers can order it once you publish your prices from the Pricing page.
                    </p>
                  )}
                  <Preview branchId={branchId} product={product} strategy="own" pct={0} disabled={[]} versionId={draftVersionId} ownProduct />
                </>
              )}
            </>
          )}
        </div>

        {canEdit && (
          <div className={cn("px-6 py-3 border-t flex items-center gap-3", t.border)}>
            <div className="flex-1 text-xs text-red-500 space-y-0.5">
              {problems.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {productId && <Button variant="ghost" onClick={remove}>Remove product</Button>}
            <Button onClick={save} loading={saving}>{productId ? "Save" : "Create product"}</Button>
          </div>
        )}
      </aside>
    </>
  );
}
