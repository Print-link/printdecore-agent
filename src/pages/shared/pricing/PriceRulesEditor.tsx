import { useEffect, useState } from "react";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui";
import { Plus, Trash2 } from "../../../components/icons";
import {
  inputTypeOf,
  pricingError,
  SCOPE_KINDS,
  shopPricingApi,
  type PriceRule,
  type ProductDefinition,
  type RuleKind,
  type RuleScope,
  type Tier,
} from "../../../services/api/shopPricing";
import { Block } from "./parts";
import { VisibilityEditor } from "./FieldSettings";
import type { FieldRef } from "./fieldTypes";

const SCOPES: Array<{ scope: RuleScope; label: string; body: string }> = [
  { scope: "base_adjustment", label: "Adjust the unit price", body: "e.g. × 1.5 for double-sided" },
  { scope: "quantity", label: "Per copy", body: "the main charge for the quantity ordered" },
  { scope: "item", label: "Extra per item", body: "e.g. lamination 2.00 each" },
  { scope: "area", label: "By size (area)", body: "e.g. 25 per m², at least 30" },
  { scope: "order", label: "Once per order", body: "e.g. design fee 20.00" },
];

const KIND_LABEL: Record<RuleKind, string> = {
  fixed: "Fixed amount",
  multiplier: "Multiply by",
  per_unit: "Amount per unit",
  dimension_based: "Rate per area",
  tiered: "Price brackets",
  formula: "Formula",
};

const blankParams = (kind: RuleKind, scope: RuleScope): PriceRule["params"] => {
  switch (kind) {
    case "fixed":
      return { amount: 0 };
    case "multiplier":
      return { factor: 1 };
    case "per_unit":
      return scope === "order" ? { amount: 0, basis: "field" } : { amount: 0, basis: "quantity" };
    case "dimension_based":
      return { rate: 0, areaUnit: "sqm", source: "size", minimumCharge: 0 };
    case "tiered":
      return scope === "area"
        ? { areaUnit: "sqm", source: "size", tierMode: "per_unit", tiers: [{ min: 0, max: null, unitPrice: 0 }] }
        : { tierMode: "per_unit", tiers: [{ min: 1, max: null, unitPrice: 0 }] };
    case "formula":
      return { expression: "" };
  }
};

const numOr = (v: string, fallback: number) => (v.trim() === "" || !Number.isFinite(Number(v)) ? fallback : Number(v));

/**
 * The shop's pricing rules for one of its services: multipliers, extras,
 * price brackets, area rates and formulas. Held by the service editor and
 * saved with it (the server checks every rule; nothing runs as code).
 */
export function PriceRulesEditor({
  branchId,
  product,
  rules,
  onChange,
  canEdit,
}: {
  branchId: string;
  product: ProductDefinition;
  rules: PriceRule[];
  onChange: (rules: PriceRule[]) => void;
  canEdit: boolean;
}) {
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const [problems, setProblems] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const setRules = onChange;

  const editable = canEdit;
  const small = cn("px-2 py-1.5 rounded-md border text-sm", t.input);
  const fields: FieldRef[] = product.attributes.map((a) => ({ key: a.key, name: a.name, type: inputTypeOf(a), options: a.options }));
  const numberFields = product.attributes.filter((a) => inputTypeOf(a) === "number" || inputTypeOf(a) === "measurement");
  const sizeFields = product.attributes.filter((a) => inputTypeOf(a) === "dimensions");
  const sizeSources = [...(product.sizeMode !== "none" ? [{ key: "size", name: "The service's size" }] : []), ...sizeFields.map((a) => ({ key: a.key, name: a.name }))];

  const setRule = (i: number, r: PriceRule) => setRules(rules.map((x, j) => (j === i ? r : x)));

  const check = async () => {
    if (!product.id) return showError("Save the service first, then check its rules");
    try {
      const r = await shopPricingApi.checkRules(branchId, product.id, rules);
      setProblems(r.problems);
      setVariables(r.variables);
      if (!r.problems.length) success("These rules look right");
    } catch (e) {
      showError(pricingError(e).message);
    }
  };

  // Formula variables: fetched once so the formula box can list them
  useEffect(() => {
    if (!product.id || !rules.some((r) => r.kind === "formula") || variables.length) return;
    shopPricingApi
      .checkRules(branchId, product.id, [])
      .then((r) => setVariables(r.variables))
      .catch(() => undefined);
  }, [rules, variables.length, branchId, product.id]);

  const tierEditor = (r: PriceRule, i: number) => {
    const tiers = r.params.tiers ?? [];
    const area = r.scope === "area";
    const setTiers = (next: Tier[]) => setRule(i, { ...r, params: { ...r.params, tiers: next } });
    return (
      <div className="space-y-1.5">
        <div className={cn("grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px]", t.textSecondary)}>
          <span>From {area ? `(${r.params.areaUnit === "sqft" ? "sq ft" : "m²"})` : "(copies)"}</span>
          <span>To (blank = no limit)</span>
          <span>{r.params.tierMode === "flat" ? "Price for the bracket" : "Price each"}</span>
          <span />
        </div>
        {tiers.map((tier, k) => (
          <div key={k} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <input className={small} type="number" disabled={!editable} value={tier.min}
              onChange={(e) => setTiers(tiers.map((x, j) => (j === k ? { ...x, min: numOr(e.target.value, 0) } : x)))} />
            <input className={small} type="number" disabled={!editable} value={tier.max ?? ""} placeholder="—"
              onChange={(e) => setTiers(tiers.map((x, j) => (j === k ? { ...x, max: e.target.value.trim() === "" ? null : numOr(e.target.value, 0) } : x)))} />
            <input className={small} type="number" step="0.01" disabled={!editable} value={tier.unitPrice}
              onChange={(e) => setTiers(tiers.map((x, j) => (j === k ? { ...x, unitPrice: numOr(e.target.value, 0) } : x)))} />
            {editable && tiers.length > 1 ? (
              <button type="button" aria-label="Remove bracket" className={t.textTertiary} onClick={() => setTiers(tiers.filter((_, j) => j !== k))}>
                <Trash2 size={14} />
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        {editable && (
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => {
            const last = tiers[tiers.length - 1];
            // Close the open bracket and start the next one where it ends
            const end = last ? (last.max ?? last.min + (area ? 1 : 49)) : area ? 0 : 1;
            const closed = last ? tiers.map((x, j) => (j === tiers.length - 1 ? { ...x, max: end } : x)) : tiers;
            setTiers([...closed, { min: area ? end : end + 1, max: null, unitPrice: last?.unitPrice ?? 0 }]);
          }}>Bracket</Button>
        )}
      </div>
    );
  };

  const paramsEditor = (r: PriceRule, i: number) => {
    const p = r.params;
    const setP = (patch: Partial<PriceRule["params"]>) => setRule(i, { ...r, params: { ...p, ...patch } });
    const money = (label: string, key: "amount" | "rate" | "minimumCharge" | "factor", step = "0.01") => (
      <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
        {label}
        <input className={cn(small, "w-28")} type="number" step={step} disabled={!editable} value={p[key] ?? ""} onChange={(e) => setP({ [key]: numOr(e.target.value, 0) })} />
      </label>
    );
    const areaUnit = (
      <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
        Area in
        <select className={small} disabled={!editable} value={p.areaUnit ?? "sqm"} onChange={(e) => setP({ areaUnit: e.target.value as "sqm" | "sqft" })}>
          <option value="sqm">m²</option>
          <option value="sqft">sq ft</option>
        </select>
      </label>
    );
    const source = (
      <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
        Size from
        <select className={small} disabled={!editable} value={p.source ?? "size"} onChange={(e) => setP({ source: e.target.value })}>
          {sizeSources.length === 0 && <option value="size">Add a size or width × height field first</option>}
          {sizeSources.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>
      </label>
    );
    switch (r.kind) {
      case "fixed":
        return <div className="flex flex-wrap gap-3">{money("Amount (GHS)", "amount")}</div>;
      case "multiplier":
        return <div className="flex flex-wrap gap-3">{money("Multiply the unit price by", "factor", "0.05")}</div>;
      case "per_unit":
        return (
          <div className="flex flex-wrap gap-3">
            {money("Amount (GHS)", "amount")}
            <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
              For each
              <select className={small} disabled={!editable} value={p.basis ?? "quantity"} onChange={(e) => setP({ basis: e.target.value as PriceRule["params"]["basis"], field: e.target.value === "field" ? p.field ?? numberFields[0]?.key : undefined })}>
                {r.scope !== "order" && (
                  <>
                    <option value="quantity">copy ordered</option>
                    <option value="pages">page (× copies)</option>
                    <option value="sides">printed side (× copies)</option>
                    <option value="sheets">sheet (× copies)</option>
                  </>
                )}
                {numberFields.length > 0 && <option value="field">number a customer enters</option>}
              </select>
            </label>
            {p.basis === "field" && (
              <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
                Field
                <select className={small} disabled={!editable} value={p.field ?? ""} onChange={(e) => setP({ field: e.target.value })}>
                  {numberFields.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
                </select>
              </label>
            )}
          </div>
        );
      case "dimension_based":
        return (
          <div className="flex flex-wrap gap-3">
            {money("Rate (GHS)", "rate")}
            {areaUnit}
            {source}
            {money("At least (GHS)", "minimumCharge")}
          </div>
        );
      case "tiered":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
                Bracket price is
                <select className={small} disabled={!editable} value={p.tierMode ?? "per_unit"} onChange={(e) => setP({ tierMode: e.target.value as "per_unit" | "flat" })}>
                  <option value="per_unit">per {r.scope === "area" ? "area unit" : "copy"}</option>
                  <option value="flat">one price for the bracket</option>
                </select>
              </label>
              {r.scope === "area" && areaUnit}
              {r.scope === "area" && source}
            </div>
            {tierEditor(r, i)}
          </div>
        );
      case "formula":
        return (
          <div className="space-y-1.5">
            <textarea
              className={cn(small, "w-full font-mono")}
              rows={2}
              maxLength={500}
              disabled={!editable}
              placeholder="e.g. max(30, area_sqm * 25)"
              value={p.expression ?? ""}
              onChange={(e) => setP({ expression: e.target.value })}
            />
            <p className={cn("text-[11px]", t.textSecondary)}>
              Use + − × ÷ (as * /), min, max, ceil, floor, round, abs, if(condition, a, b)
              {variables.length > 0 && <> and: {variables.join(", ")}</>}
            </p>
          </div>
        );
    }
  };

  return (
    <Block
      title="Rules"
      subtitle="Quantity discounts, extras, minimums, area rates and formulas, on top of your prices. They apply in the order of the steps below."
      actions={
        editable ? (
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setRules([...rules, { label: "", scope: "item", kind: "fixed", params: blankParams("fixed", "item") }])}>
            Add a rule
          </Button>
        ) : undefined
      }
    >
      {(
        <div className="space-y-3">
          {rules.length === 0 && <p className={cn("text-sm", t.textSecondary)}>No rules — the price table sets the price.</p>}
          {rules.map((r, i) => (
            <div key={i} className={cn("rounded-lg border p-3 space-y-2", t.border)}>
              <div className="flex flex-wrap items-center gap-2">
                <input className={cn(small, "flex-1 min-w-[140px]")} placeholder="Name on the quote, e.g. Lamination" maxLength={80} value={r.label} disabled={!editable}
                  onChange={(e) => setRule(i, { ...r, label: e.target.value })} />
                <select className={small} disabled={!editable} value={r.scope} title={SCOPES.find((s) => s.scope === r.scope)?.body}
                  onChange={(e) => {
                    const scope = e.target.value as RuleScope;
                    const kind = SCOPE_KINDS[scope].includes(r.kind) ? r.kind : SCOPE_KINDS[scope][0];
                    setRule(i, { ...r, scope, kind, params: kind === r.kind && kind !== "tiered" && kind !== "per_unit" ? r.params : blankParams(kind, scope) });
                  }}>
                  {SCOPES.map((s) => <option key={s.scope} value={s.scope}>{s.label}</option>)}
                </select>
                <select className={small} disabled={!editable} value={r.kind}
                  onChange={(e) => {
                    const kind = e.target.value as RuleKind;
                    setRule(i, { ...r, kind, params: blankParams(kind, r.scope) });
                  }}>
                  {SCOPE_KINDS[r.scope].map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
                {editable && (
                  <button type="button" aria-label="Remove rule" className={t.textTertiary} onClick={() => setRules(rules.filter((_, j) => j !== i))}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {paramsEditor(r, i)}
              <VisibilityEditor label="Only when" value={r.appliesWhen} earlier={fields} disabled={!editable}
                onChange={(c) => setRule(i, { ...r, appliesWhen: c })} />
            </div>
          ))}
          {problems.length > 0 && (
            <div className="text-xs text-red-500 space-y-0.5">
              {problems.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          {editable && rules.length > 0 && (
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={check}>Check rules</Button>
            </div>
          )}
        </div>
      )}
    </Block>
  );
}
