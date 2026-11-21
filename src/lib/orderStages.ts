import type { OrderStatus } from "../types";
import type { PipelineStage } from "../services/api/vendorHome";

/** Open orders by stage, as the Home pipeline groups them (matches the API) */
export const STAGE_STATUSES: Record<PipelineStage, OrderStatus[]> = {
  new: ["PENDING"],
  quoted: ["QUOTED", "AWAITING_PAYMENT", "CONFIRMING_AVAILABILITY"],
  paid: ["PAID"],
  // RECEIVED: older orders accepted before that step was dropped
  production: ["RECEIVED", "IN_PROGRESS", "PRINTING", "QUALITY_CHECK"],
  ready: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"],
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New — to quote",
  quoted: "Quoted — awaiting payment",
  paid: "Paid — to start",
  production: "In production",
  ready: "Ready",
};

const CLOSED: OrderStatus[] = ["DELIVERED", "COMPLETED", "CANCELLED"];
export const isOpenStatus = (status: OrderStatus) => !CLOSED.includes(status);
