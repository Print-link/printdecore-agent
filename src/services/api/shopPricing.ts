import { apiClient } from "./client";

/**
 * A shop's services and their prices. Every service is the shop's own; saving
 * puts it live. Every price comes from the server's quote engine.
 * Backend: /api/shop-pricing/:branchId/…
 */

export type PricingUnit = "item" | "sqft" | "sqm" | "side" | "sheet";

export interface ProductOption {
  key: string;
  name: string;
  description?: string;
  imageUrl?: string;
  specs?: { sides?: number; widthMm?: number; heightMm?: number };
}

/** What a customer fills in for one field of a service */
export type InputType = "select" | "multi_select" | "checkbox" | "text" | "number" | "measurement" | "dimensions" | "file" | "date";
export type LengthUnit = "mm" | "cm" | "m" | "in" | "ft";
export const OPTION_INPUTS: InputType[] = ["select", "multi_select"];

export interface FieldConfig {
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  multiline?: boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  units?: LengthUnit[];
  defaultUnit?: LengthUnit;
  minMm?: number;
  maxMm?: number;
  minWidthMm?: number;
  maxWidthMm?: number;
  minHeightMm?: number;
  maxHeightMm?: number;
  maxFiles?: number;
  accept?: string[];
  minDaysAhead?: number;
  maxDaysAhead?: number;
}

/** When a field shows, or a rule applies — data the server checks, never code */
export type ConditionOp = "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "set" | "unset";
export type Condition = { all: Condition[] } | { any: Condition[] } | { not: Condition } | { field: string; op: ConditionOp; value?: unknown };

export interface ProductAttribute {
  key: string;
  name: string;
  selection: "one" | "any";
  required: boolean;
  defaultOptionKeys: string[];
  options: ProductOption[];
  inputType?: InputType;
  config?: FieldConfig;
  visibleWhen?: Condition | null;
  helpText?: string;
  defaultValue?: unknown;
  instructionImageUrl?: string;
}

export const inputTypeOf = (a: Pick<ProductAttribute, "inputType" | "selection">): InputType =>
  a.inputType ?? (a.selection === "any" ? "multi_select" : "select");

export type RuleKind = "fixed" | "per_unit" | "dimension_based" | "tiered" | "formula" | "multiplier";
export type RuleScope = "base_adjustment" | "quantity" | "item" | "area" | "order";
export interface Tier {
  min: number;
  max: number | null;
  unitPrice: number;
}
export interface PriceRule {
  label: string;
  kind: RuleKind;
  scope: RuleScope;
  appliesWhen?: Condition | null;
  params: {
    amount?: number;
    factor?: number;
    basis?: "quantity" | "pages" | "sides" | "sheets" | "field" | "area";
    field?: string;
    rate?: number;
    areaUnit?: "sqm" | "sqft";
    source?: string;
    minimumCharge?: number;
    tiers?: Tier[];
    tierMode?: "per_unit" | "flat";
    expression?: string;
  };
}

/** Which rule kinds each step of the price allows (mirrors the server) */
export const SCOPE_KINDS: Record<RuleScope, RuleKind[]> = {
  base_adjustment: ["multiplier", "fixed", "formula"],
  quantity: ["per_unit", "tiered", "formula"],
  item: ["fixed", "per_unit", "formula"],
  area: ["dimension_based", "tiered", "formula"],
  order: ["fixed", "per_unit", "formula"],
};

/** A service's published versions, and whether the draft differs from the live one */
export interface Publishing {
  liveVersionId: string | null;
  draftChanged: boolean;
  versions: Array<{ id: string; version: number; publishedAt: string; live: boolean }>;
}

export interface CatalogMedia {
  id: string;
  kind: "gallery" | "option" | "instruction";
  /** option: "field:option"; instruction: the field's key */
  targetKey: string | null;
  url: string;
  width: number;
  height: number;
  alt: string | null;
  sortOrder: number;
}

export interface ProductDefinition {
  id: string;
  name: string;
  quoteMode?: "instant" | "quote";
  description?: string;
  gallery?: Array<{ url: string; alt?: string }>;
  pricingUnit: PricingUnit;
  sizeMode: "none" | "preset" | "custom" | "both";
  usesPages: boolean;
  limits: { minWidthMm?: number; maxWidthMm?: number; minHeightMm?: number; maxHeightMm?: number; minQuantity?: number; maxQuantity?: number };
  attributes: ProductAttribute[];
}

export interface QuantityBreak {
  min: number;
  unitPrice: number;
}

export interface PriceEntry {
  match: Record<string, string>;
  unitPrice: number;
  breaks: QuantityBreak[];
  breakBasis: "quantity" | "measure";
  setupFee: number;
  minimumCharge: number;
}

export interface PriceModifier {
  optionKey: string;
  kind: "per_item" | "per_measure" | "per_side" | "per_order" | "percent";
  amount: number;
  label?: string;
}

export interface QuoteLine {
  kind: string;
  label: string;
  detail?: string;
  amount: number;
}

export type QuoteResult =
  | { ok: true; currency: string; lines: QuoteLine[]; subtotal: number; vat: { ratePct: number; amount: number } | null; total: number; unitPrice: number }
  | { ok: false; errors: Array<{ code: string; message: string }> };

/** A service's prices: the price table (base price and combinations), option extras and rules */
export interface ServicePrices {
  entries: PriceEntry[];
  modifiers: PriceModifier[];
  rules: PriceRule[];
}

export interface OwnServiceDetail {
  product: ProductDefinition;
  subCategoryId: string;
  publishing?: Publishing;
  /** What customers are charged now */
  prices: ServicePrices;
}

export interface PreviewInput {
  productId: string;
  strategy: "own";
  /** Prices typed in the editor but not saved yet */
  prices?: ServicePrices;
  quantity: number;
  choices: Record<string, string | string[]>;
  size?: { widthMm: number; heightMm: number };
  pages?: number;
}

/** A product the shop made itself — priced only from its own list */
export interface OwnProductRow {
  id: string;
  name: string;
  category: string;
  subCategoryId: string;
  subCategory: string | null;
  pricingUnit: PricingUnit | null;
  /** Its prices are published */
  priced: boolean;
  /** Customers can order it */
  onSale: boolean;
}

/** What the shop sends to make or change its own product */
export interface OwnProductInput {
  name: string;
  subCategoryId: string;
  definition: {
    pricingUnit: PricingUnit;
    sizeMode: ProductDefinition["sizeMode"];
    quoteMode?: "instant" | "quote";
    description?: string | null;
    attributes: Array<{
      key: string;
      name: string;
      selection: "one" | "any";
      required: boolean;
      defaultOptionKeys?: string[];
      inputType?: InputType;
      config?: FieldConfig;
      visibleWhen?: Condition | null;
      helpText?: string | null;
      options: Array<{ key: string; name: string; description?: string; specs?: { widthMm?: number; heightMm?: number; sides?: 1 | 2 } }>;
    }>;
  };
}

type Ok<T> = { success: boolean; data: T };
const base = (branchId: string) => `/shop-pricing/${branchId}`;

/** A failed call's message — and every problem the server listed */
export const pricingError = (e: unknown): { message: string; problems: string[] } => {
  const data = (e as { response?: { data?: { message?: string; problems?: string[] } } })?.response?.data;
  return { message: data?.message || "Something went wrong", problems: data?.problems ?? [] };
};

export const shopPricingApi = {
  ownProducts: async (branchId: string) => (await apiClient.get<Ok<OwnProductRow[]>>(`${base(branchId)}/own-products`)).data.data,
  ownProduct: async (branchId: string, productId: string) =>
    (await apiClient.get<Ok<OwnServiceDetail>>(`${base(branchId)}/own-products/${productId}`)).data.data,
  /** The one Save: details and prices go live together */
  saveService: async (branchId: string, productId: string, input: Partial<OwnProductInput> & { prices: ServicePrices }) =>
    (await apiClient.put<Ok<OwnServiceDetail>>(`${base(branchId)}/own-products/${productId}/service`, input)).data.data,
  /** Check rules without saving; also lists the variables a formula may use */
  checkRules: async (branchId: string, productId: string, rules: PriceRule[]) =>
    (await apiClient.post<Ok<{ problems: string[]; variables: string[] }>>(`${base(branchId)}/own-products/${productId}/check-rules`, { rules })).data.data,
  media: async (branchId: string, productId: string) =>
    (await apiClient.get<Ok<CatalogMedia[]>>(`${base(branchId)}/own-products/${productId}/media`)).data.data,
  addMedia: async (branchId: string, productId: string, file: File, meta: { kind: CatalogMedia["kind"]; targetKey?: string; alt?: string }) => {
    const form = new FormData();
    form.append("kind", meta.kind);
    if (meta.targetKey) form.append("targetKey", meta.targetKey);
    if (meta.alt) form.append("alt", meta.alt);
    form.append("file", file);
    return (await apiClient.post<Ok<CatalogMedia>>(`${base(branchId)}/own-products/${productId}/media`, form, { headers: { "Content-Type": "multipart/form-data" } })).data.data;
  },
  updateMedia: async (branchId: string, productId: string, mediaId: string, patch: { alt?: string; sortOrder?: number }) =>
    (await apiClient.patch<Ok<CatalogMedia>>(`${base(branchId)}/own-products/${productId}/media/${mediaId}`, patch)).data.data,
  removeMedia: async (branchId: string, productId: string, mediaId: string) =>
    (await apiClient.delete(`${base(branchId)}/own-products/${productId}/media/${mediaId}`)).data,
  createOwnProduct: async (branchId: string, input: OwnProductInput) =>
    (await apiClient.post<Ok<{ product: ProductDefinition; subCategoryId: string }>>(`${base(branchId)}/own-products`, input)).data.data,
  updateOwnProduct: async (branchId: string, productId: string, input: Partial<OwnProductInput>) =>
    (await apiClient.put<Ok<{ product: ProductDefinition; subCategoryId: string }>>(`${base(branchId)}/own-products/${productId}`, input)).data.data,
  removeOwnProduct: async (branchId: string, productId: string) => (await apiClient.delete(`${base(branchId)}/own-products/${productId}`)).data,

  preview: async (branchId: string, input: PreviewInput) =>
    (await apiClient.post<Ok<{ shop: QuoteResult; platform: QuoteResult }>>(`${base(branchId)}/preview`, input)).data.data,
};

export const money = (n: number, currency = "GHS") =>
  `${currency} ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const UNIT_LABEL: Record<PricingUnit, string> = {
  item: "per item",
  sqft: "per sq ft",
  sqm: "per m²",
  side: "per printed side",
  sheet: "per sheet",
};

// ── Pricing assistant ──────────────────────────────────────────────────────

/** A spreadsheet read into rows by the server (nothing is stored) */
export interface ReadSheet {
  fileName: string;
  sheets: Array<{ name: string; rows: string[][]; cutRows: number }>;
}

export interface DraftChoice {
  name: string;
  required?: boolean;
  multiple?: boolean;
  options: string[];
}
export interface DraftPrice {
  when: Record<string, string>;
  price: number;
  breaks?: Array<{ fromQty: number; price: number }>;
  setupFee?: number;
  minimumCharge?: number;
}
export interface DraftExtra {
  choice: string;
  option: string;
  charge: "per_item" | "per_order" | "percent" | "per_measure" | "per_side";
  amount: number;
  label?: string;
}
export interface DraftProduct {
  ref: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  pricingUnit: PricingUnit;
  customSize?: boolean;
  choices: DraftChoice[];
  prices: DraftPrice[];
  extras?: DraftExtra[];
  notes?: string[];
  problems?: string[];
  updatesExisting?: boolean;
}
export interface CatalogDraft {
  summary: string;
  categories: Array<{ name: string; description?: string }>;
  products: DraftProduct[];
  suggestions: string[];
  questions: string[];
}
export interface AssistantMessage {
  role: "user" | "assistant";
  text: string;
}
export interface ApplyResult {
  saved: Array<{ name: string; productId: string; updated: boolean }>;
  failed: Array<{ name: string; problem: string }>;
  categoriesCreated: string[];
  published: boolean;
  draftVersionId?: string;
}

export const pricingAssistantApi = {
  readSheet: async (branchId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await apiClient.post<Ok<ReadSheet>>(`${base(branchId)}/assistant/sheet`, form, { headers: { "Content-Type": "multipart/form-data" } })).data.data;
  },
  chat: async (branchId: string, body: { messages: AssistantMessage[]; sheet?: ReadSheet | null; draft?: CatalogDraft | null }) =>
    (await apiClient.post<Ok<{ reply: string; draft: CatalogDraft | null }>>(`${base(branchId)}/assistant/chat`, body, { timeout: 180000 })).data.data,
  apply: async (branchId: string, draft: CatalogDraft, publish: boolean) =>
    (await apiClient.post<Ok<ApplyResult>>(`${base(branchId)}/assistant/apply`, { draft, publish }, { timeout: 120000 })).data.data,
};
