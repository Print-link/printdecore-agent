import { apiClient } from "./client";

export type HomePeriod = "today" | "7d" | "30d";
export type PipelineStage = "new" | "quoted" | "paid" | "production" | "ready";

export interface Compared {
  current: number;
  previous: number;
}

export interface SetupItem {
  key: string;
  label: string;
  done: boolean;
  /** "ops" items are switched by Printdecore, not the shop */
  owner: "ops" | "vendor";
  hint: string;
  link: string | null;
}

export interface VendorHome {
  period: HomePeriod;
  branchId: string | null;
  branchCount: number;
  attention: { toQuote: number; awaitingPayment: number; toStart: number; dueToday: number; overdue: number };
  metrics: { sales: Compared; orders: Compared; averageOrder: Compared; rating: { average: number; count: number } };
  pipeline: { stage: PipelineStage; label: string; count: number }[];
  series: { label: string; date: string; sales: number; orders: number }[];
  recentOrders: {
    id: string;
    status: string;
    stage: PipelineStage | null;
    total: number;
    createdAt: string;
    dueAt: string | null;
    customerName: string | null;
    product: string | null;
    items: number;
    branchId: string;
    branchName: string;
  }[];
  topProducts: { name: string; orders: number; sales: number }[];
  branches: { id: string; name: string; sales: number; orders: number; openOrders: number; rating: number }[];
  setup: { live: boolean; items: SetupItem[] } | null;
}

/** One branch, or every branch the user can see when branchId is omitted */
export async function getVendorHome(branchId: string | null, period: HomePeriod): Promise<VendorHome> {
  const response = await apiClient.get("/vendor-home", { params: { period, ...(branchId && { branchId }) } });
  return response.data.data;
}
