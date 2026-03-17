import { useThemeClasses } from '../../../../lib/theme';
import type { ClerkOrderDetail } from '../../../../types';

interface OrdersByDateListProps {
  orders: ClerkOrderDetail[];
  selectedDate: string;
  isLoading?: boolean;
}

export function OrdersByDateList({
  orders,
  selectedDate,
  isLoading,
}: OrdersByDateListProps) {
  const t = useThemeClasses();

  if (!selectedDate) {
    return null;
  }

  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className={`p-3 rounded-md ${t.surface}`}>
        <p className={t.textSecondary}>
          Loading orders...
        </p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={`p-3 rounded-md text-center ${t.surface}`}>
        <h3 className={`text-base font-bold mb-2 m-0 ${t.text}`}>
          Orders for {formattedDate}
        </h3>
        <p className={`text-sm m-0 ${t.textSecondary}`}>
          No orders found for this date.
        </p>
      </div>
    );
  }

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
    <div>
      <div className={`p-3 rounded-md mb-2 ${t.surface}`}>
        <h3 className={`text-base font-bold m-0 ${t.text}`}>
          Orders for {formattedDate}
        </h3>
        <p className={`text-sm mt-1 m-0 ${t.textSecondary}`}>
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </p>
      </div>

      <div className={`rounded-md overflow-hidden ${t.surface}`}>
        {orders.map((order, index) => {
          const statusColor = getStatusColor(order.status);
          return (
            <div
              key={order.id}
              className={`p-2.5 transition-all cursor-pointer ${
                index < orders.length - 1
                  ? `border-b ${t.border}`
                  : ''
              } ${
                t.isDark
                  ? 'bg-gray-800 hover:bg-gray-700/50'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {/* Order Content - Horizontal Layout */}
              <div className="flex items-center justify-between gap-3">
                {/* Left Section - Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`font-bold text-xs ${t.text}`}>
                      {order.orderNumber}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{
                        background: `${statusColor}20`,
                        color: statusColor,
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mb-0.5 truncate ${t.textSecondary}`}
                    title={order.client.fullName}
                  >
                    {order.client.fullName}
                  </p>
                  {order.items && order.items.length > 0 && (
                    <p className={`text-[10px] m-0 ${t.textSecondary}`}>
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </p>
                  )}
                </div>

                {/* Right Section - Price */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm m-0 ${t.text}`}>
                    ₵{order.totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
