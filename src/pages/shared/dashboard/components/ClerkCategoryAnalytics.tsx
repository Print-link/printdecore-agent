import { PieChart } from '../../../../components/icons';
import { useThemeClasses } from '../../../../lib/theme';
import type { ClerkCategoryAnalytics } from '../../../../types';

interface ClerkCategoryAnalyticsProps {
  categoryAnalytics: ClerkCategoryAnalytics[];
  isLoading?: boolean;
}

export function ClerkCategoryAnalytics({
  categoryAnalytics,
  isLoading,
}: ClerkCategoryAnalyticsProps) {
  const t = useThemeClasses();

  if (isLoading && (!categoryAnalytics || categoryAnalytics.length === 0)) {
    return (
      <div className={`p-3 rounded-md text-center ${t.surface}`}>
        <p className={t.textSecondary}>
          Loading category analytics...
        </p>
      </div>
    );
  }

  if (!categoryAnalytics || categoryAnalytics.length === 0) {
    return (
      <div className={`p-3 rounded-md text-center ${t.surface}`}>
        <p className={t.textSecondary}>
          No category data available
        </p>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-md ${t.surface}`}>
      <div className="flex items-center gap-1 mb-3">
        <PieChart size={20} className="text-amber-400" />
        <h3 className={`text-sm font-semibold m-0 ${t.text}`}>
          Category Performance
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {categoryAnalytics.map((cat) => (
          <div
            key={cat.categoryId}
            className={`p-2 rounded border ${
              t.isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}
          >
            {cat.categoryImageUrl && (
              <img
                src={cat.categoryImageUrl}
                alt={cat.categoryName}
                className="w-full h-16 sm:h-20 object-cover rounded mb-1"
              />
            )}
            <div className={`font-semibold mb-1 text-sm sm:text-base truncate ${t.text}`}>
              {cat.categoryName}
            </div>
            <div className={`text-[10px] sm:text-xs ${t.textSecondary}`}>
              <div>Total Orders: {cat.totalOrders}</div>
              <div>Completed: {cat.completedOrders}</div>
              <div>Pending: {cat.pendingOrders}</div>
              <div>Quoted: {cat.quotedOrders}</div>
              <div>Paid: {cat.paidOrders}</div>
              <div>In Progress: {cat.inProgressOrders}</div>
              <div className="mt-1 font-semibold text-amber-400">
                Order Items: {cat.orderItemsCount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
