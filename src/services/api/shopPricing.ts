import { apiClient } from "./client";

/**
 * Pricing v2 for a shop: Printdecore's products the shop sells, which options
 * it offers, and how it prices them (same as Printdecore, ±%, or its own
 * price list). Every price comes from the server's quote engine.
 * Backend: /api/shop-pricing/:branchId/…
 */

export type Strategy = "same" | "adjust" | "own";
export type PricingUnit = "item" | "sqft" | "sqm" | "side" | "sheet";

export interface ShopSetup {
  strategy: Strategy;
  adjustmentPct: number;
  disabledOptionKeys: string[];
}

export interface ShopPriceListSummary {
  id: string;
  name: string;
  currency: string;
  liveVersionId: string | null;
  draftVersionId: string | null;
  draftVersion: number | null;
}

export interface ShopProductRow {
  id: string;
  name: string;
  category: string;
  pricingUnit: PricingUnit | null;
  platformPriced: boolean;
  setup: ShopSetup | null;
  hasOldService: boolean;
}

export interface ProductOption {
  key: string;
  name: string;
  specs?: { sides?: number; widthMm?: number; heightMm?: number };
}

export interface ProductAttribute {
  key: string;
  name: string;
  selection: "one" | "any";
  required: boolean;
  defaultOptionKeys: string[];
  options: ProductOption[];
}

export interface ProductDefinition {
  id: string;
  name: string;
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

export interface PreviewInput {
  productId: string;
  strategy: Strategy;
  adjustmentPct?: number;
  disabledOptionKeys?: string[];
  /** Price from this version of the shop's own list (e.g. its draft) */
  versionId?: string | null;
  quantity: number;
  choices: Record<string, string | string[]>;
  size?: { widthMm: number; heightMm: number };
  pages?: number;
}

type Ok<T> = { success: boolean; data: T };
const base = (branchId: string) => `/shop-pricing/${branchId}`;

/** A failed call's message — and every problem the server listed */
export const pricingError = (e: unknown): { message: string; problems: string[] } => {
  const data = (e as { response?: { data?: { message?: string; problems?: string[] } } })?.response?.data;
  return { message: data?.message || "Something went wrong", problems: data?.problems ?? [] };
};

export const shopPricingApi = {
  products: async (branchId: string) =>
    (await apiClient.get<Ok<{ priceList: ShopPriceListSummary | null; products: ShopProductRow[] }>>(`${base(branchId)}/products`)).data.data,
  product: async (branchId: string, productId: string) =>
    (await apiClient.get<Ok<{ product: ProductDefinition; setup: ShopSetup | null; priceList: ShopPriceListSummary | null }>>(
      `${base(branchId)}/products/${productId}`,
    )).data.data,
  save: async (branchId: string, productId: string, setup: { strategy: Strategy; adjustmentPct?: number; disabledOptionKeys: string[] }) =>
    (await apiClient.put(`${base(branchId)}/products/${productId}`, setup)).data.data,
  leave: async (branchId: string, productId: string) => (await apiClient.delete(`${base(branchId)}/products/${productId}`)).data,
  bulkAdjust: async (branchId: string, pct: number, productIds?: string[]) =>
    (await apiClient.post<Ok<{ adjusted: number; ownInDraft: number; draftVersionId: string | null }>>(`${base(branchId)}/bulk-adjust`, { pct, productIds })).data.data,

  openDraft: async (branchId: string) => (await apiClient.post<Ok<{ id: string; version: number }>>(`${base(branchId)}/price-list/draft`)).data.data,
  updateVersion: async (branchId: string, versionId: string, patch: { roundingStep?: number | null; notes?: string | null }) =>
    (await apiClient.patch(`${base(branchId)}/versions/${versionId}`, patch)).data.data,
  publish: async (branchId: string, versionId: string, effectiveFrom?: string) =>
    (await apiClient.post(`${base(branchId)}/versions/${versionId}/publish`, { effectiveFrom })).data.data,
  discard: async (branchId: string, versionId: string) => (await apiClient.delete(`${base(branchId)}/versions/${versionId}`)).data,
  prices: async (branchId: string, versionId: string, productId: string) =>
    (await apiClient.get<Ok<{ version: { id: string; status: string; version: number }; entries: PriceEntry[]; modifiers: PriceModifier[] }>>(
      `${base(branchId)}/versions/${versionId}/products/${productId}`,
    )).data.data,
  savePrices: async (branchId: string, versionId: string, productId: string, prices: { entries: PriceEntry[]; modifiers: PriceModifier[] }) =>
    (await apiClient.put(`${base(branchId)}/versions/${versionId}/products/${productId}`, prices)).data.data,

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
