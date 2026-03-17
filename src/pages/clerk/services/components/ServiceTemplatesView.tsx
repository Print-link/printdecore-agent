import { Plus } from '../../../../components/icons';
import { Button, Badge } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import type { ServiceTemplate } from '../../../../types';

interface ServiceTemplatesViewProps {
  templates: ServiceTemplate[];
  onTemplateSelect: (template: ServiceTemplate) => void;
  onBack: () => void;
  onViewAgentServices: (template: ServiceTemplate) => void;
  isLoading?: boolean;
  onAddCustomTemplate: () => void;
  onEditTemplate: (template: ServiceTemplate) => void;
  onDeleteTemplate: (template: ServiceTemplate) => void;
}

export function ServiceTemplatesView({
  templates,
  onTemplateSelect,
  onBack,
  // onViewAgentServices,
  isLoading,
  onAddCustomTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: ServiceTemplatesViewProps) {
  const t = useThemeClasses();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className={cn(
              'text-sm font-medium mb-2 hover:underline transition-colors',
              t.isDark ? 'text-amber-400' : 'text-amber-600'
            )}
          >
            &larr; Back to Sub-Categories
          </button>
          <h2 className={cn('text-2xl font-bold m-0', t.text)}>
            Service Templates
          </h2>
          <p className={cn('text-sm mt-1', t.textSecondary)}>
            Select a template to configure pricing for your branch
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            icon={Plus}
            onClick={onAddCustomTemplate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            Create Custom Template
          </Button>
          <Button
            variant="secondary"
            onClick={onBack}
          >
            Cancel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className={t.textSecondary}>
          Loading templates...
        </p>
      ) : templates.length === 0 ? (
        <p className={t.textSecondary}>
          No service templates available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={cn(
                'p-5 rounded-lg border text-left transition-all duration-200 flex flex-col gap-3 relative group',
                t.isDark
                  ? 'bg-gray-800 border-gray-600 hover:border-amber-400'
                  : 'bg-white border-gray-200 hover:border-amber-400'
              )}
            >
              <div className="flex justify-between items-start">
                <h3 className={cn('text-base font-semibold m-0 mb-2', t.text)}>
                  {template.name}
                </h3>
                {template.branchId ? (
                  <Badge color="blue" className="text-[10px] font-bold uppercase border border-blue-200 dark:border-blue-800">
                    Custom
                  </Badge>
                ) : (
                  <Badge color="gray" className="text-[10px] font-bold uppercase border border-gray-200 dark:border-gray-600">
                    Platform
                  </Badge>
                )}
              </div>
              {template.description && (
                <p className={cn('text-sm m-0 mb-2', t.textSecondary)}>
                  {template.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge color="amber" className="text-xs">
                  {template.measurementUnit}
                </Badge>
                {template.supportsColor && (
                  <Badge color="amber" className="text-xs">
                    Color
                  </Badge>
                )}
                {template.supportsFrontBack && (
                  <Badge color="amber" className="text-xs">
                    Front/Back
                  </Badge>
                )}
                {template.supportsPrintCut && (
                  <Badge color="amber" className="text-xs">
                    Print & Cut
                  </Badge>
                )}
              </div>

              <div className="mt-auto flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => onTemplateSelect(template)}
                >
                  Add Pricing
                </Button>
                {template.branchId && (
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditTemplate(template)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={t.isDark
                        ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                      }
                      onClick={() => onDeleteTemplate(template)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
