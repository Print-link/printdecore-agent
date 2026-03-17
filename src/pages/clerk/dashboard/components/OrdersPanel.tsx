import { useState, useMemo } from 'react';
import { X, Search } from '../../../../components/icons';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import type { ClerkOrderDetail } from '../../../../types';

interface OrdersPanelProps {
  orders: ClerkOrderDetail[];
  selectedDate: string;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function OrdersPanel({
  orders,
  selectedDate,
  isLoading,
  isOpen,
  onClose,
}: OrdersPanelProps) {
  const t = useThemeClasses();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.client.fullName.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  if (!isOpen || !selectedDate) {
    return null;
  }

  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981';
      case 'IN_PROGRESS':
        return '#8b5cf6';
      case 'PAID':
        return '#3b82f6';
      case 'QUOTED':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  return (
		<>
			<div
				className={cn(
					'fixed right-0 top-16 h-[calc(100vh-4rem)] w-full lg:w-[340px] z-40 flex flex-col transition-transform duration-300 border-l',
					t.isDark
						? 'bg-gray-800 border-gray-700'
						: 'bg-white border-gray-200'
				)}
			>
				{/* Header */}
				<div
					className={cn('flex items-center justify-between p-4 border-b', t.border)}
				>
					<div className="flex-1 min-w-0">
						<h3
							className={cn('text-lg font-bold mb-1 truncate', t.text)}
						>
							Orders for {formattedDate}
						</h3>
						<p className={cn('text-sm', t.textSecondary)}>
							{filteredOrders.length}{" "}
							{filteredOrders.length === 1 ? "order" : "orders"}
							{searchQuery && ` (filtered from ${orders.length})`}
						</p>
					</div>
					<button
						onClick={onClose}
						className={cn(
							'ml-4 p-2 rounded-lg transition-colors',
							t.isDark
								? 'hover:bg-gray-700 text-gray-400 hover:text-gray-100'
								: 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
						)}
						aria-label="Close panel"
					>
						<X size={20} />
					</button>
				</div>

				{/* Search Bar */}
				<div className={cn('p-4 border-b', t.border)}>
					<div className="relative">
						<Search
							size={18}
							className={cn('absolute left-3 top-1/2 transform -translate-y-1/2', t.textSecondary)}
						/>
						<input
							type="text"
							placeholder="Search by order number, client name, or status..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={cn(
								'w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400',
								t.input
							)}
						/>
					</div>
				</div>

				{/* Orders List */}
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="p-8 text-center">
							<p className={t.textSecondary}>
								Loading orders...
							</p>
						</div>
					) : filteredOrders.length === 0 ? (
						<div className="p-8 text-center">
							<p className={cn('text-sm', t.textSecondary)}>
								{searchQuery
									? "No orders match your search."
									: "No orders found for this date."}
							</p>
						</div>
					) : (
						<div className={cn('divide-y', t.isDark ? 'divide-gray-700' : 'divide-gray-200')}>
							{filteredOrders.map((order) => {
								const statusColor = getStatusColor(order.status);
								return (
									<div
										key={order.id}
										className={cn(
											'p-4 transition-colors',
											t.isDark
												? 'hover:bg-gray-700/50'
												: 'hover:bg-gray-50'
										)}
									>
										{/* Order Content */}
										<div className="space-y-2">
											<div className="flex items-center justify-between gap-2">
												<span className={cn('font-bold text-sm', t.text)}>
													{order.orderNumber}
												</span>
												<span
													className="px-2 py-1 rounded-md text-xs font-semibold"
													style={{
														background: `${statusColor}20`,
														color: statusColor,
													}}
												>
													{order.status}
												</span>
											</div>
											<p
												className={cn('text-sm truncate', t.textSecondary)}
												title={order.client.fullName}
											>
												{order.client.fullName}
											</p>
											{order.items && order.items.length > 0 && (
												<p className={cn('text-xs', t.textTertiary)}>
													{order.itemCount}{" "}
													{order.itemCount === 1 ? "item" : "items"}
												</p>
											)}
											<div className="flex items-center justify-between pt-1">
												<p className={cn('font-bold text-base', t.text)}>
													₵{order.totalPrice.toLocaleString()}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
