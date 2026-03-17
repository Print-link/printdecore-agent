// ─── Order Statuses ──────────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  QUOTED: 'QUOTED',
  PAID: 'PAID',
  RECEIVED: 'RECEIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  QUOTED: 'Quoted',
  PAID: 'Paid',
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

// ─── User Roles ──────────────────────────────────────────────────────
export const USER_ROLES = {
  MANAGER: 'manager',
  CLERK: 'clerk',
} as const;

// ─── Branch Statuses ─────────────────────────────────────────────────
export const BRANCH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TEMPORARILY_CLOSED: 'temporarily_closed',
} as const;

// ─── Measurement Units ──────────────────────────────────────────────
export const MEASUREMENT_UNITS = {
  FEET: 'FEET',
  INCH: 'INCH',
  UNIT: 'UNIT',
} as const;

// ─── Pricing Types ──────────────────────────────────────────────────
export const PRICING_TYPES = {
  AREA_BASED: 'AREA_BASED',
  UNIT_ONLY: 'UNIT_ONLY',
  AREA_FEET: 'AREA_FEET',
  AREA_INCH: 'AREA_INCH',
  MIXED: 'MIXED',
  CUSTOM_QUOTE: 'CUSTOM_QUOTE',
} as const;

// ─── Media Types ─────────────────────────────────────────────────────
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  STICKER: 'sticker',
} as const;

// ─── Invitation Statuses ─────────────────────────────────────────────
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

// ─── Days of Week ────────────────────────────────────────────────────
export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;

// ─── Cache / Polling Intervals ───────────────────────────────────────
export const STALE_TIME = {
  SHORT: 30_000,    // 30 seconds
  MEDIUM: 60_000,   // 1 minute
  LONG: 120_000,    // 2 minutes
} as const;

export const REFETCH_INTERVAL = {
  FAST: 30_000,     // 30 seconds
  NORMAL: 60_000,   // 1 minute
  SLOW: 120_000,    // 2 minutes
} as const;
