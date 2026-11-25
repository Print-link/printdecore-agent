import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Badge, Button } from "../../../components/ui";
import { Plus, Trash2 } from "../../../components/icons";
import { apiService } from "../../../services/api";
import {
  inputTypeOf,
  OPTION_INPUTS,
  pricingError,
  shopPricingApi,
  UNIT_LABEL,
  type Condition,
  type FieldConfig,
  type InputType,
  type OwnProductInput,
  type OwnProductRow,
  type PricingUnit,
  type ProductDefinition,
  type ServicePrices,
} from "../../../services/api/shopPricing";
import { Block, Notice, Preview } from "./parts";
import { SimplePrices } from "./SimplePrices";
import { FieldConfigEditor, VisibilityEditor } from "./FieldSettings";
import { FIELD_TYPES } from "./fieldTypes";
import { PriceRulesEditor } from "./PriceRulesEditor";
import { ServiceMedia } from "./ServiceMedia";

type SizeMode = ProductDefinition["sizeMode"];

interface OptionDraft {
  key?: string;
  name: string;
  description?: string;
  /** For document printing: this option prints on one or both sides of the sheet */
  sides?: 1 | 2;
}
interface ChoiceDraft {
  key?: string;
  name: string;
  inputType: InputType;
  required: boolean;
  options: OptionDraft[];
  config: FieldConfig;
  helpText: string;
  visibleWhen: Condition | null;
}
const isOptions = (type: InputType) => OPTION_INPUTS.includes(type);
interface SizeDraft {
  key?: string;
  name: string;
  widthMm: string;
  heightMm: string;
}

const SIZE_KEY = "size";
const AREA = (u: PricingUnit) => u === "sqft" || u === "sqm";
/** Priced by the customer's document: they give its pages, the price counts sides or sheets */
const PAGED = (u: PricingUnit) => u === "side" || u === "sheet";

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
  const [quoteMode, setQuoteMode] = useState<"instant" | "quote">("instant");
  const [description, setDescription] = useState("");
  const [prices, setPrices] = useState<ServicePrices>({ entries: [], modifiers: [], rules: [] });
  /** Bumped when prices are reloaded, so the price inputs start fresh */
  const [pricesLoaded, setPricesLoaded] = useState(0);
  const [onSale, setOnSale] = useState(!!row?.onSale);
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
        .map((a) => ({
          key: a.key,
          name: a.name,
          inputType: inputTypeOf(a),
          required: a.required,
          options: a.options.map((o) => ({
            key: o.key,
            name: o.name,
            ...(o.description && { description: o.description }),
            ...((o.specs?.sides === 1 || o.specs?.sides === 2) && { sides: o.specs.sides as 1 | 2 }),
          })),
          config: a.config ?? {},
          helpText: a.helpText ?? "",
          visibleWhen: a.visibleWhen ?? null,
        })),
    );
    setQuoteMode(p.quoteMode ?? "instant");
    setDescription(p.description ?? "");
    setPrices({ entries: data.prices?.entries ?? [], modifiers: data.prices?.modifiers ?? [], rules: data.prices?.rules ?? [] });
    setPricesLoaded((n) => n + 1);
  }, [data]);

  useEffect(() => {
    if (!takeBaseline.current) return;
    takeBaseline.current = false;
    setBaseline(JSON.stringify({ ...input(), prices }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, choices, sizes, unit, sizeMode, subCategoryId, quoteMode, description, prices]);

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
      const options = isOptions(c.inputType);
      attributes.push({
        key: c.key ?? keyFrom(c.name, attrKeys),
        name: c.name,
        inputType: c.inputType,
        selection: c.inputType === "multi_select" ? "any" : "one",
        required: c.inputType !== "multi_select" && c.inputType !== "checkbox" && c.required,
        options: options
          ? c.options.map((o) => ({
              key: o.key ?? keyFrom(o.name, taken),
              name: o.name,
              ...(o.description?.trim() && { description: o.description.trim() }),
              ...(o.sides && c.inputType === "select" && { specs: { sides: o.sides } }),
            }))
          : [],
        ...(!options && Object.keys(c.config).length && { config: c.config }),
        helpText: c.helpText.trim() || null,
        visibleWhen: c.visibleWhen,
      });
    }
    return { name, subCategoryId, definition: { pricingUnit: unit, sizeMode, quoteMode, description: description.trim() || null, attributes } };
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["shopPricing", branchId] });

  /** The one Save: details and prices go live together */
  const save = async () => {
    setProblems([]);
    if (!name.trim()) return setProblems(["Give the service a name"]);
    if (!subCategoryId) return setProblems(["Choose where the service is listed"]);
    setSaving(true);
    try {
      let id = productId;
      if (!id) {
        const made = await shopPricingApi.createOwnProduct(branchId, input());
        id = made.product.id;
        setProductId(id);
      }
      await shopPricingApi.saveService(branchId, id, { ...input(), prices });
      setOnSale(true);
      success(`${name.trim()} is saved and live`);
      refresh();
    } catch (e) {
      const err = pricingError(e);
      setProblems(err.problems.length ? err.problems : [err.message]);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!productId || !window.confirm(`Stop selling ${name}? Past orders keep it; customers can't order it any more.`)) return;
    try {
      await shopPricingApi.removeOwnProduct(branchId, productId);
      success("Service removed");
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
  const current = input();
  const dirty = baseline !== JSON.stringify({ ...current, prices });
  /** Fields changed since the last save: the preview prices the saved service */
  const fieldsChanged = !!baseline && JSON.stringify(JSON.parse(baseline).definition) !== JSON.stringify(current.definition);
  // The price table follows the fields on screen, so new options can be priced before saving
  const formProduct: ProductDefinition = {
    id: productId ?? "",
    name,
    quoteMode,
    pricingUnit: unit,
    sizeMode,
    usesPages: PAGED(unit),
    limits: product?.limits ?? {},
    attributes: current.definition.attributes.map((a) => ({
      key: a.key,
      name: a.name,
      selection: a.selection ?? (a.inputType === "multi_select" ? "any" : "one"),
      required: a.required,
      defaultOptionKeys: [],
      inputType: a.inputType,
      config: a.config,
      visibleWhen: a.visibleWhen,
      options: a.options.filter((o) => o.name.trim()).map((o) => ({ key: o.key, name: o.name, specs: o.specs })),
    })),
  };

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
        aria-label={productId ? `Edit ${name}` : "New service"}
      >
        <div className={cn("px-6 py-4 border-b flex items-center gap-3", t.border)}>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold truncate", t.text)}>{productId ? name || "Your product" : "New service"}</h3>
            <p className={cn("text-xs", t.textSecondary)}>What customers can order from you, and its price</p>
          </div>
          {productId && <Badge color={onSale ? "green" : "amber"}>{onSale ? "On sale" : "Not on sale yet"}</Badge>}
          <button type="button" onClick={close} className={cn("text-sm", t.textSecondary)} aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {productId && isLoading ? (
            <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
          ) : (
            <>
              <Block title="Service">
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
                    <span className={t.textSecondary}>Description customers see (optional)</span>
                    <textarea className={cn(field, "mt-1")} rows={2} maxLength={2000} value={description} disabled={!canEdit}
                      placeholder="What it is, turnaround, what to send" onChange={(e) => setDescription(e.target.value)} />
                  </label>
                  <div className="text-xs">
                    <span className={t.textSecondary}>How customers get a price</span>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {([
                        ["instant", "Instant price", "Priced from your price table and rules."],
                        ["quote", "Quote on request", "Customers send their answers; you reply with a quote."],
                      ] as const).map(([mode, title, body]) => (
                        <button key={mode} type="button" disabled={!canEdit} onClick={() => setQuoteMode(mode)} aria-pressed={quoteMode === mode}
                          className={cn("text-left rounded-lg border px-3 py-2", quoteMode === mode ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : t.border)}>
                          <p className={cn("text-sm font-medium", t.text)}>{title}</p>
                          <p className={cn("text-[11px] mt-0.5", t.textSecondary)}>{body}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block text-xs">
                    <span className={t.textSecondary}>One price is for</span>
                    <select className={cn(field, "mt-1")} value={unit} disabled={!canEdit} onChange={(e) => setUnit(e.target.value as PricingUnit)}>
                      {(Object.keys(UNIT_LABEL) as PricingUnit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u].replace("per ", "each ")}</option>)}
                    </select>
                  </label>
                  {PAGED(unit) && (
                    <div className={cn("rounded-lg border px-3 py-2 text-xs space-y-1", t.border, t.textSecondary)}>
                      <p className={cn("font-medium", t.text)}>Priced by the customer's document</p>
                      <p>
                        Customers enter their document's pages (or add the PDF and we count them) and how many copies they want.
                        {unit === "side"
                          ? " Your price is charged for every printed page: pages × copies."
                          : " Your price is charged for every sheet of paper: pages ÷ 2 (rounded up) on options that print both sides, then × copies."}
                      </p>
                      <p>
                        Example: 120 pages, 3 copies, double-sided → {unit === "side" ? "360 printed pages" : "180 sheets"}. Mark each option under “What customers fill in” as printing on one side or both.
                      </p>
                    </div>
                  )}
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
                title="What customers fill in"
                subtitle="Choices like finish or paper (priced in your price table), and fields like text, sizes, files or dates. A field can show only when an earlier answer matches."
                actions={canEdit ? (
                  <Button size="sm" variant="secondary" icon={Plus}
                    onClick={() => setChoices([...choices, { name: "", inputType: "select", required: true, options: [{ name: "" }], config: {}, helpText: "", visibleWhen: null }])}>
                    Add a field
                  </Button>
                ) : undefined}
              >
                {choices.length === 0 && <p className={cn("text-sm", t.textSecondary)}>Nothing yet — customers just pick a quantity.</p>}
                <div className="space-y-3">
                  {choices.map((c, i) => (
                    <div key={i} className={cn("rounded-lg border p-3 space-y-2", t.border)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <input className={cn(small, "flex-1 min-w-[140px]")} placeholder="Name, e.g. Finish" value={c.name} disabled={!canEdit}
                          onChange={(e) => setChoice(i, { ...c, name: e.target.value })} />
                        <select className={small} value={c.inputType} disabled={!canEdit} aria-label="Field type"
                          onChange={(e) => {
                            const inputType = e.target.value as InputType;
                            // Options belong to choices; settings to fields — switching drops what no longer fits
                            setChoice(i, {
                              ...c,
                              inputType,
                              options: isOptions(inputType) ? (c.options.length ? c.options : [{ name: "" }]) : [],
                              config: inputType === c.inputType ? c.config : {},
                            });
                          }}>
                          {FIELD_TYPES.map((f) => <option key={f.type} value={f.type}>{f.label}</option>)}
                        </select>
                        {c.inputType !== "multi_select" && c.inputType !== "checkbox" && (
                          <label className={cn("text-xs flex items-center gap-1", t.textSecondary)}>
                            <input type="checkbox" checked={c.required} disabled={!canEdit} onChange={(e) => setChoice(i, { ...c, required: e.target.checked })} />
                            Must answer
                          </label>
                        )}
                        {canEdit && (
                          <button type="button" aria-label="Remove choice" onClick={() => setChoices(choices.filter((_, j) => j !== i))} className={t.textTertiary}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {isOptions(c.inputType) ? (
                        <div className="flex flex-wrap gap-2">
                          {c.options.map((o, k) => (
                            <span key={k} className="inline-flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1">
                                <input className={cn(small, "w-36")} placeholder="Option, e.g. Gloss" value={o.name} disabled={!canEdit}
                                  onChange={(e) => setChoice(i, { ...c, options: c.options.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })} />
                                {canEdit && c.options.length > 1 && (
                                  <button type="button" aria-label="Remove option" className={t.textTertiary}
                                    onClick={() => setChoice(i, { ...c, options: c.options.filter((_, j) => j !== k) })}>✕</button>
                                )}
                              </span>
                              <input className={cn(small, "w-36 text-xs py-1")} placeholder="Short note (optional)" maxLength={500} value={o.description ?? ""} disabled={!canEdit}
                                onChange={(e) => setChoice(i, { ...c, options: c.options.map((x, j) => (j === k ? { ...x, description: e.target.value } : x)) })} />
                              {PAGED(unit) && c.inputType === "select" && (
                                <select className={cn(small, "w-36 text-xs py-1")} disabled={!canEdit} aria-label={`${o.name || "Option"} prints on`}
                                  value={o.sides ?? ""}
                                  onChange={(e) => setChoice(i, { ...c, options: c.options.map((x, j) => (j === k ? { ...x, sides: e.target.value ? (Number(e.target.value) as 1 | 2) : undefined } : x)) })}>
                                  <option value="">Sides: not set</option>
                                  <option value="1">Prints one side</option>
                                  <option value="2">Prints both sides</option>
                                </select>
                              )}
                            </span>
                          ))}
                          {canEdit && (
                            <Button size="sm" variant="ghost" icon={Plus} onClick={() => setChoice(i, { ...c, options: [...c.options, { name: "" }] })}>Option</Button>
                          )}
                        </div>
                      ) : (
                        <FieldConfigEditor type={c.inputType} config={c.config} disabled={!canEdit} onChange={(config) => setChoice(i, { ...c, config })} />
                      )}
                      <input className={cn(small, "w-full text-xs")} placeholder={c.inputType === "checkbox" ? "What ticking it means, e.g. Yes, laminate it" : "Help for customers (optional)"}
                        maxLength={500} value={c.helpText} disabled={!canEdit} onChange={(e) => setChoice(i, { ...c, helpText: e.target.value })} />
                      <VisibilityEditor
                        value={c.visibleWhen}
                        disabled={!canEdit}
                        onChange={(visibleWhen) => setChoice(i, { ...c, visibleWhen })}
                        earlier={[
                          ...(takesPresets ? [{ key: SIZE_KEY, name: "Size", type: "select" as InputType, options: sizes.filter((s) => s.key).map((s) => ({ key: s.key, name: s.name })) }] : []),
                          ...choices.slice(0, i).map((x) => ({ key: x.key, name: x.name, type: x.inputType, options: x.options })),
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </Block>

              {quoteMode === "quote" ? (
                <Block title="Price" subtitle="Quote on request: customers send their answers through the Printdecore assistant and you reply with a price. No price table needed." >
                  <span />
                </Block>
              ) : (
                <SimplePrices
                  key={pricesLoaded}
                  product={formProduct}
                  entries={prices.entries}
                  modifiers={prices.modifiers}
                  canEdit={canEdit}
                  onChange={(next) => setPrices({ ...prices, ...next })}
                  more={<PriceRulesEditor branchId={branchId} product={formProduct} rules={prices.rules} onChange={(rules) => setPrices({ ...prices, rules })} canEdit={canEdit} />}
                />
              )}

              {product && quoteMode !== "quote" && (fieldsChanged ? (
                <Notice>Save to try orders with the fields you just changed.</Notice>
              ) : (
                <Preview branchId={branchId} product={product} prices={prices} />
              ))}
              {product && <ServiceMedia branchId={branchId} product={product} canEdit={canEdit} />}
            </>
          )}
        </div>

        {canEdit && (
          <div className={cn("px-6 py-3 border-t flex items-center gap-3", t.border)}>
            <div className="flex-1 text-xs space-y-0.5">
              {problems.length ? (
                problems.map((p, i) => <p key={i} className="text-red-500">{p}</p>)
              ) : (
                <p className={t.textSecondary}>{dirty ? "Unsaved changes — saving puts them live straight away." : "Saving puts changes live straight away."}</p>
              )}
            </div>
            {productId && <Button variant="ghost" onClick={remove}>Remove</Button>}
            <Button onClick={save} loading={saving} disabled={!!productId && !dirty}>Save</Button>
          </div>
        )}
      </aside>
    </>
  );
}
