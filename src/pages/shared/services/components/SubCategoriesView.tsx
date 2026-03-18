import { ArrowLeft } from '../../../../components/icons';
import { Card, Badge, Button } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import type { ServiceSubCategory } from '../../../../types';

interface SubCategoriesViewProps {
  subCategories: ServiceSubCategory[];
  onSubCategorySelect: (subCategory: ServiceSubCategory) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function SubCategoriesView({
  subCategories,
  onSubCategorySelect,
  onBack,
  isLoading,
}: SubCategoriesViewProps) {
  const t = useThemeClasses();

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="secondary" onClick={onBack} className="p-2">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className={cn('text-lg font-semibold m-0', t.text)}>
              Select a SubCategory
            </h2>
            <Badge color="gray" className="text-[11px] uppercase">
              Read-Only
            </Badge>
          </div>
          <p className={cn('text-xs m-0', t.textTertiary)}>
            SubCategories are platform-owned
          </p>
        </div>
      </div>
      {isLoading ? (
        <p className={t.textTertiary}>
          Loading subcategories...
        </p>
      ) : subCategories.length === 0 ? (
        <p className={t.textTertiary}>
          No subcategories available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {subCategories.map((subCategory) => (
            <button
              key={subCategory.id}
              onClick={() => onSubCategorySelect(subCategory)}
              className={cn(
                'p-0 rounded-lg border text-left transition-all duration-200 flex flex-col overflow-hidden',
                t.isDark
                  ? 'bg-gray-800 border-gray-600 hover:border-amber-400 hover:bg-gray-700/50'
                  : 'bg-white border-gray-200 hover:border-amber-400 hover:bg-amber-50/50'
              )}
            >
              {subCategory.imageUrl && (
                <div className={cn('w-full h-[180px] flex-shrink-0 relative overflow-hidden', t.isDark ? 'bg-gray-700' : 'bg-gray-100')}>
                  <img
                    src={subCategory.imageUrl}
                    alt={subCategory.name}
                    className="w-full h-full object-cover block"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="p-5 flex flex-col gap-2">
                <h3 className={cn('text-base font-semibold m-0', t.text)}>
                  {subCategory.name}
                </h3>
                {subCategory.description && (
                  <p className={cn('text-sm m-0', t.textTertiary)}>
                    {subCategory.description}
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <Badge color="amber">
                    {subCategory.pricingType}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
