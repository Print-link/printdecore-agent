export type OrderStatus =
  | 'PENDING'
  | 'QUOTED'
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
	createdAt: string | Date;
	updatedAt: string | Date;
}

export interface ClerkOrderDetail extends ClerkOrder {
  items: ClerkOrderItem[];
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
