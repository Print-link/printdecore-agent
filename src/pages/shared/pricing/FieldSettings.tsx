import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import type { Condition, ConditionOp, FieldConfig, InputType, LengthUnit } from "../../../services/api/shopPricing";
import type { FieldRef } from "./fieldTypes";

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];


const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
const text = (n: number | undefined) => (n === undefined ? "" : String(n));

/** Settings that depend on the field's type (limits, units, file types…) */
export function FieldConfigEditor({
  type,
  config,
  onChange,
  disabled,
}: {
  type: InputType;
  config: FieldConfig;
  onChange: (c: FieldConfig) => void;
  disabled?: boolean;
}) {
  const t = useThemeClasses();
  const small = cn("px-2 py-1.5 rounded-md border text-sm", t.input);
  const set = (patch: Partial<FieldConfig>) => {
    const next = { ...config, ...patch };
    for (const k of Object.keys(next) as (keyof FieldConfig)[]) if (next[k] === undefined || (Array.isArray(next[k]) && !(next[k] as unknown[]).length)) delete next[k];
    onChange(next);
  };
  const numberInput = (label: string, key: keyof FieldConfig, placeholder?: string) => (
    <label className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
      {label}
      <input
        className={cn(small, "w-28")}
        type="number"
        disabled={disabled}
        placeholder={placeholder}
        value={text(config[key] as number | undefined)}
        onChange={(e) => set({ [key]: num(e.target.value) } as Partial<FieldConfig>)}
      />
    </label>
  );
  const check = (label: string, key: "multiline" | "integer") => (
    <label className={cn("text-xs flex items-center gap-1 self-end pb-2", t.textSecondary)}>
      <input type="checkbox" disabled={disabled} checked={!!config[key]} onChange={(e) => set({ [key]: e.target.checked || undefined })} />
      {label}
    </label>
  );
  const units = (
    <div className={cn("text-xs flex flex-col gap-1", t.textSecondary)}>
      Units customers can use
      <div className="flex gap-1">
        {LENGTH_UNITS.map((u) => {
          const on = (config.units ?? ["mm", "cm", "m", "in"]).includes(u);
          return (
            <button
              key={u}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => {
                const current = config.units ?? ["mm", "cm", "m", "in"];
                const next = on ? current.filter((x) => x !== u) : [...current, u];
                if (next.length) set({ units: next, defaultUnit: next.includes(config.defaultUnit as LengthUnit) ? config.defaultUnit : undefined });
              }}
              className={cn("px-2 py-1 rounded-md border text-xs", on ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : t.border)}
            >
              {u}
            </button>
          );
        })}
      </div>
    </div>
  );

  switch (type) {
    case "text":
      return (
        <div className="flex flex-wrap gap-3">
          <label className={cn("text-xs flex flex-col gap-1 flex-1 min-w-[160px]", t.textSecondary)}>
            Placeholder
            <input className={small} disabled={disabled} maxLength={120} value={config.placeholder ?? ""} onChange={(e) => set({ placeholder: e.target.value || undefined })} />
          </label>
          {numberInput("Max characters", "maxLength", "500")}
          {check("Several lines", "multiline")}
        </div>
      );
    case "number":
      return (
        <div className="flex flex-wrap gap-3">
          {numberInput("Lowest", "min")}
          {numberInput("Highest", "max")}
          {numberInput("Steps of", "step")}
          {check("Whole numbers", "integer")}
        </div>
      );
    case "measurement":
      return (
        <div className="flex flex-wrap gap-3">
          {units}
          {numberInput("Shortest (mm)", "minMm")}
          {numberInput("Longest (mm)", "maxMm")}
        </div>
      );
    case "dimensions":
      return (
        <div className="flex flex-wrap gap-3">
          {units}
          {numberInput("Min width (mm)", "minWidthMm")}
          {numberInput("Max width (mm)", "maxWidthMm")}
          {numberInput("Min height (mm)", "minHeightMm")}
          {numberInput("Max height (mm)", "maxHeightMm")}
        </div>
      );
    case "file":
      return (
        <div className="flex flex-wrap gap-3">
          {numberInput("Files allowed", "maxFiles", "5")}
          <label className={cn("text-xs flex flex-col gap-1 flex-1 min-w-[160px]", t.textSecondary)}>
            File types (blank = any print file)
            <input
              className={small}
              disabled={disabled}
              placeholder="pdf, png, ai"
              value={(config.accept ?? []).join(", ")}
              onChange={(e) =>
                set({
                  accept: e.target.value
                    .split(/[,\s]+/)
                    .map((x) => x.replace(/^\./, "").toLowerCase())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      );
    case "date":
      return (
        <div className="flex flex-wrap gap-3">
          {numberInput("Earliest (days from today)", "minDaysAhead", "0")}
          {numberInput("Latest (days from today)", "maxDaysAhead")}
        </div>
      );
    default:
      return null;
  }
}

type SimpleOp = "eq" | "neq" | "set" | "unset" | "gt" | "lt";
const OPS: Array<{ op: SimpleOp; label: string; needs: "option" | "number" | "none" }> = [
  { op: "eq", label: "is", needs: "option" },
  { op: "neq", label: "is not", needs: "option" },
  { op: "set", label: "is filled in / ticked", needs: "none" },
  { op: "unset", label: "is empty / not ticked", needs: "none" },
  { op: "gt", label: "is more than", needs: "number" },
  { op: "lt", label: "is less than", needs: "number" },
];
const opsFor = (type: InputType) =>
  OPS.filter((o) =>
    type === "select" || type === "multi_select"
      ? o.needs !== "number"
      : type === "number" || type === "measurement"
        ? o.needs !== "option"
        : o.needs === "none",
  );

/** A condition this editor can show: one comparison on one field */
const simple = (c: Condition | null | undefined): { field: string; op: ConditionOp; value?: unknown } | null =>
  c && "field" in c && OPS.some((o) => o.op === c.op) ? c : null;

/** Describe a condition in words (for ones made elsewhere this editor can't change) */
function describeCondition(c: Condition, fields: FieldRef[]): string {
  if ("all" in c) return c.all.map((x) => describeCondition(x, fields)).join(" and ");
  if ("any" in c) return c.any.map((x) => describeCondition(x, fields)).join(" or ");
  if ("not" in c) return `not (${describeCondition(c.not, fields)})`;
  const f = fields.find((x) => x.key === c.field);
  const opLabel = OPS.find((o) => o.op === c.op)?.label ?? c.op;
  const value = f?.options.find((o) => o.key === c.value)?.name ?? (c.value === undefined ? "" : String(c.value));
  return `${f?.name || c.field} ${opLabel} ${value}`.trim();
}

/**
 * "Show only when…": one comparison on an earlier, saved field. Fields
 * shown conditionally aren't asked for (or priced) when hidden.
 */
export function VisibilityEditor({
  value,
  onChange,
  earlier,
  disabled,
  label = "Show only when",
}: {
  value: Condition | null | undefined;
  onChange: (c: Condition | null) => void;
  /** Fields above this one that are saved (they have keys) */
  earlier: FieldRef[];
  disabled?: boolean;
  label?: string;
}) {
  const t = useThemeClasses();
  const small = cn("px-2 py-1.5 rounded-md border text-sm", t.input);
  const usable = earlier.filter((f) => f.key && f.type !== "file" && f.type !== "date" && f.type !== "dimensions" && f.type !== "text");
  const current = simple(value);

  if (value && !current) {
    return (
      <p className={cn("text-xs", t.textSecondary)}>
        {label}: {describeCondition(value, earlier)}{" "}
        {!disabled && (
          <button type="button" className="underline" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </p>
    );
  }
  if (!current) {
    return usable.length && !disabled ? (
      <button
        type="button"
        className={cn("text-xs underline", t.textSecondary)}
        onClick={() => {
          const f = usable[usable.length - 1];
          const ops = opsFor(f.type);
          onChange({ field: f.key!, op: ops[0].op, ...(ops[0].needs === "option" && { value: f.options[0]?.key }) });
        }}
      >
        Only show this sometimes…
      </button>
    ) : null;
  }

  const field = usable.find((f) => f.key === current.field);
  const ops = field ? opsFor(field.type) : OPS;
  const needs = OPS.find((o) => o.op === current.op)?.needs ?? "none";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={t.textSecondary}>{label}</span>
      <select
        className={small}
        disabled={disabled}
        value={current.field}
        onChange={(e) => {
          const f = usable.find((x) => x.key === e.target.value)!;
          const op = opsFor(f.type)[0];
          onChange({ field: f.key!, op: op.op, ...(op.needs === "option" && { value: f.options[0]?.key }) });
        }}
      >
        {!field && <option value={current.field}>{current.field}</option>}
        {usable.map((f) => (
          <option key={f.key} value={f.key}>
            {f.name || f.key}
          </option>
        ))}
      </select>
      <select
        className={small}
        disabled={disabled}
        value={current.op}
        onChange={(e) => {
          const op = OPS.find((o) => o.op === e.target.value)!;
          onChange({
            field: current.field,
            op: op.op,
            ...(op.needs === "option" && { value: field?.options[0]?.key }),
            ...(op.needs === "number" && { value: 0 }),
          });
        }}
      >
        {ops.map((o) => (
          <option key={o.op} value={o.op}>
            {o.label}
          </option>
        ))}
      </select>
      {needs === "option" && field && (
        <select className={small} disabled={disabled} value={String(current.value ?? "")} onChange={(e) => onChange({ ...current, value: e.target.value })}>
          {field.options
            .filter((o) => o.key)
            .map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
        </select>
      )}
      {needs === "number" && (
        <>
          <input
            className={cn(small, "w-24")}
            type="number"
            disabled={disabled}
            value={String(current.value ?? "")}
            onChange={(e) => onChange({ ...current, value: Number(e.target.value) || 0 })}
          />
          {field?.type === "measurement" && <span className={t.textSecondary}>mm</span>}
        </>
      )}
      {!disabled && (
        <button type="button" className={cn("underline", t.textSecondary)} onClick={() => onChange(null)}>
          Always show
        </button>
      )}
    </div>
  );
}
