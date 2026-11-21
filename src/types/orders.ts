export type OrderStatus =
  | 'PENDING'
  | 'QUOTED'
  | 'CONFIRMING_AVAILABILITY'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'PRINTING'
  | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ClerkOrderClient {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatar?: string;
}

export interface ClerkOrderFile {
  url: string;
  publicId: string;
  name: string;
  size: number;
  type: string;
}

export interface ClerkOrderItemOptions {
  frontBack: boolean;
  color: boolean;
  printCut: boolean;
  frontOnly?: boolean;
  files: ClerkOrderFile[];
  selectedBaseConfigId?: string;
  selectedOptions?: string[];
  selectedCustomSpecs?: string[];
}

export interface SelectedConfigDetails {
  baseConfig?: { id: string; name: string };
  options?: Array<{ id: string; name: string; priceModifier?: number }>;
  customSpecs?: Array<{ id: string; name: string; priceModifier?: number }>;
}

export interface ClerkOrderItemCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface ClerkOrderItemSubCategory {
  id: string;
  name: string;
  imageUrl?: string;
  pricingType: string;
}

export interface ClerkOrderItem {
  id: string;
  serviceName: string;
  category: ClerkOrderItemCategory;
  subCategory: ClerkOrderItemSubCategory;
  width: number;
  height: number;
  measurementUnit: string;
  formulaType?: string;
  quantity: number;
  options: ClerkOrderItemOptions;
  selectedConfigDetails?: SelectedConfigDetails;
  calculatedPrice: number;
  createdAt: string | Date;
}

export interface ClerkOrder {
	id: string;
	orderNumber: string;
	status: OrderStatus;
	totalPrice: number;
	client: ClerkOrderClient;
	itemCount: number;
	estimatedCompletionTime?: string | Date;
	comment?: string;
	/** marketplace: the customer chose your shop — you accept or decline it. managed: Printdecore sent it to you. */
	channel?: 'managed' | 'marketplace';
	fulfilmentType?: 'delivery' | 'pickup';
	deliveryAddress?: string;
	recipientPhone?: string;
	declineReason?: string;
	/** In lists: cancelled because your shop declined it */
	declined?: boolean;
	/** In lists: the customer declined your price and is waiting for a new one */
	priceDeclined?: boolean;
	/** After you decline: how the customer's refund went (none if they hadn't paid) */
	refundStatus?: 'pending' | 'processed' | 'failed';
	createdAt: string | Date;
	updatedAt: string | Date;
}

/** What the customer asked for, on an order that waits for a quote */
export interface QuoteRequest {
  id: string;
  requestNumber: string;
  title: string;
  quantity?: number;
  /** The customer's specs and notes, one per line */
  details?: string;
  attachments: { url: string; name?: string; type?: string; size?: number }[];
  /** amount: what the customer pays. shopPrice: what you asked (commission goes on top) */
  quotation?: { id: string; status: string; amount?: number; shopPrice?: number };
  /** The customer turned your last price down: when, and why if they said */
  priceDeclined?: { at: string | Date; reason?: string };
  /** Your shop can price it */
  canQuote: boolean;
  /** Printdecore's commission (%), added on top of your price */
  commissionRate?: number;
}

export interface ClerkOrderDetail extends ClerkOrder {
  items: ClerkOrderItem[];
  printRequest?: QuoteRequest;
}

export interface ClerkOrdersResponse {
  data: ClerkOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ClerkOrdersFilters {
  status?: OrderStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest' | 'status' | 'totalPrice' | 'clientName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
