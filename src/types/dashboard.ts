export interface WhatsAppQuoteStats {
  totalQuotes: number;
  pendingQuotes: number;
  paidQuotes: number;
  declinedQuotes: number;
  expiredQuotes: number;
  quoteRevenue: number;
  todayQuotes: number;
  thisMonthQuotes: number;
  thisMonthQuoteRevenue: number;
  conversionRate: number;
}

export interface ClerkWhatsAppQuoteStats {
  totalQuotes: number;
  pendingQuotes: number;
  paidQuotes: number;
  thisMonthQuotes: number;
}

export interface ClerkDashboardStats {
  total: number;
  pending: number;
  quoted: number;
  paid: number;
  inProgress: number;
  completed: number;
  todayOrders: number;
  thisWeekOrders: number;
  thisMonthOrders: number;
  whatsappQuotes?: ClerkWhatsAppQuoteStats;
}

export interface ManagerOverviewStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  quotedOrders: number;
  paidOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  todayOrders: number;
  todayRevenue: number;
  thisMonthOrders: number;
  thisMonthRevenue: number;
  branchCount: number;
  activeBranchCount: number;
  whatsappQuotes?: WhatsAppQuoteStats;
}

export interface ManagerBranchStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  quotedOrders: number;
  paidOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  todayOrders: number;
  todayRevenue: number;
  thisMonthOrders: number;
  thisMonthRevenue: number;
  thisWeekOrders: number;
  thisWeekRevenue: number;
  averageRating: number;
  reviewCount: number;
  whatsappQuotes?: WhatsAppQuoteStats;
}

export interface BranchReview {
  id: string;
  branchId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  avatar?: string;
  rating: number;
  review?: string;
  createdAt: string | Date;
}

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  categoryImageUrl?: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  quotedOrders: number;
  paidOrders: number;
  inProgressOrders: number;
  totalRevenue?: number;
  paidRevenue?: number;
  pendingRevenue?: number;
  orderItemsCount: number;
  averageOrderValue?: number;
  branchBreakdown?: BranchCategoryBreakdown[];
}

export interface BranchCategoryBreakdown {
  branchId: string;
  branchName: string;
  orders: number;
  revenue: number;
}

export interface BranchPerformanceStats {
  branchId: string;
  branchName: string;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  quotedOrders: number;
  paidOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  todayOrders: number;
  todayRevenue: number;
  thisMonthOrders: number;
  thisMonthRevenue: number;
  averageRating: number;
  reviewCount: number;
}

export interface ClerkCategoryAnalytics {
  categoryId: string;
  categoryName: string;
  categoryImageUrl?: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  quotedOrders: number;
  paidOrders: number;
  inProgressOrders: number;
  orderItemsCount: number;
}

export interface WeeklyActivityItem {
  date: string;
  orders: number;
  revenue?: number;
}

export interface ClerkWeeklyActivity {
  date: string;
  orders: number;
}
