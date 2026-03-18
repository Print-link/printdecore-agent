export interface RevenueByStatus {
	status: string;
	orderCount: number;
	revenue: number;
}

export interface CategoryPerformance {
	categoryName: string;
	serviceName: string;
	orderCount: number;
	itemCount: number;
	revenue: number;
}

export interface DailyRevenueTrend {
	date: string;
	orderCount: number;
	revenue: number;
}

export interface OrderItemDetail {
	serviceName: string;
	categoryName: string;
	quantity: number;
	width?: number;
	height?: number;
	measurementUnit: string;
	calculatedPrice: number;
}

export interface OrderDetail {
	orderId: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	status: string;
	totalPrice: number;
	createdAt: string;
	items: OrderItemDetail[];
}

export interface BranchRevenueReport {
	branch: {
		name: string;
		address: string;
		phone: string;
		email: string;
	};
	period: {
		startDate: string;
		endDate: string;
	};
	summary: {
		totalRevenue: number;
		totalOrders: number;
		averageOrderValue: number;
		paidRevenue: number;
		pendingRevenue: number;
	};
	revenueByStatus: RevenueByStatus[];
	categoryPerformance: CategoryPerformance[];
	dailyTrend: DailyRevenueTrend[];
	orders: OrderDetail[];
	generatedAt: string;
}
