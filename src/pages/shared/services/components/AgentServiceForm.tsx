import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import { apiService } from '../../../../services/api';
import type {
  AgentService,
  ServiceTemplate,
  CreateAgentServiceData,
  UpdateAgentServiceData,
} from '../../../../types';

interface AgentServiceFormProps {
  isOpen: boolean;
  branchId: string;
  template?: ServiceTemplate;
  editingService?: AgentService | null;
  subCategory?: { name: string; pricingType?: string };
  onClose: () => void;
  onSuccess: () => void;
}

export function AgentServiceForm({
  isOpen,
  branchId,
  template,
  editingService,
  subCategory,
  onClose,
  onSuccess,
}: AgentServiceFormProps) {
  const t = useThemeClasses();
  const [formData, setFormData] = useState<CreateAgentServiceData>({
    branchId,
    serviceTemplateId: template?.id || editingService?.serviceTemplateId || '',
    pricePerUnit: editingService?.pricePerUnit || 0,
    constant: null,
    colorPriceModifier: editingService?.colorPriceModifier ?? null,
    isActive: true,
    supportsPrintCut: template?.supportsPrintCut || false,
    supportsColor: template?.supportsColor || false,
    supportsFrontBack: template?.supportsFrontBack || false,
    supportsFrontOnly: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBondPaper = useMemo(() => {
    return (
      subCategory?.name?.toLowerCase().includes('bond paper') ||
      template?.pricingFormulaId?.toLowerCase().includes('page_based') ||
      editingService?.subCategory?.name?.toLowerCase().includes('bond paper') ||
      false
    );
  }, [subCategory?.name, template?.pricingFormulaId, editingService?.subCategory?.name]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        branchId: branchId,
        serviceTemplateId: '',
        pricePerUnit: 0,
        constant: null,
        colorPriceModifier: null,
        isActive: true,
        supportsPrintCut: false,
        supportsColor: false,
        supportsFrontBack: false,
        supportsFrontOnly: false,
      });
      setError(null);
      return;
    }

    if (editingService) {
      setFormData({
        branchId: editingService.branchId,
        serviceTemplateId: editingService.serviceTemplateId,
        pricePerUnit: editingService.pricePerUnit,
        constant: editingService.constant ?? null,
        colorPriceModifier: editingService.colorPriceModifier ?? null,
        isActive: editingService.isActive,
        supportsPrintCut: editingService.supportsPrintCut,
        supportsColor: editingService.supportsColor,
        supportsFrontBack: editingService.supportsFrontBack,
        supportsFrontOnly: editingService.supportsFrontOnly ?? false,
      });
    } else if (template) {
      setFormData({
        branchId: branchId,
        serviceTemplateId: template.id,
        pricePerUnit: 0,
        constant: null,
        colorPriceModifier: null,
        isActive: true,
        supportsPrintCut: template.supportsPrintCut || false,
        supportsColor: template.supportsColor || false,
        supportsFrontBack: template.supportsFrontBack || false,
        supportsFrontOnly: false,
      });
    }
  }, [isOpen, editingService, template, branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const templateId =
      formData.serviceTemplateId || template?.id || editingService?.serviceTemplateId;
    if (!templateId || templateId.trim() === '') {
      setError('Service template is required. Please select a template first.');
      return;
    }

    const branchIdToUse = formData.branchId || branchId;
    if (!branchIdToUse || branchIdToUse.trim() === '') {
      setError('Branch ID is required');
      return;
    }

    if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
      setError('Price per unit is required and must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingService) {
        const updateData: UpdateAgentServiceData = {
          pricePerUnit: formData.pricePerUnit,
          constant: formData.constant ?? null,
          colorPriceModifier: formData.colorPriceModifier ?? null,
          isActive: formData.isActive,
          supportsPrintCut: formData.supportsPrintCut,
          supportsColor: formData.supportsColor,
          supportsFrontBack: formData.supportsFrontBack,
          supportsFrontOnly: formData.supportsFrontOnly,
        };
        await apiService.updateAgentService(editingService.id, updateData);
      } else {
        const createData: CreateAgentServiceData = {
          branchId: branchIdToUse,
          serviceTemplateId: templateId,
          pricePerUnit: formData.pricePerUnit,
          constant: formData.constant ?? null,
          colorPriceModifier: formData.colorPriceModifier ?? null,
          isActive: formData.isActive !== undefined ? formData.isActive : true,
          supportsPrintCut: formData.supportsPrintCut,
          supportsColor: formData.supportsColor,
          supportsFrontBack: formData.supportsFrontBack,
          supportsFrontOnly: formData.supportsFrontOnly ?? false,
        };
        await apiService.createAgentService(createData);
      }
      onSuccess();
      setFormData({
        branchId: branchId,
        serviceTemplateId: '',
        pricePerUnit: 0,
        constant: null,
        colorPriceModifier: null,
        isActive: true,
        supportsPrintCut: false,
        supportsColor: false,
        supportsFrontBack: false,
        supportsFrontOnly: false,
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save service';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={editingService ? 'Edit Service' : 'Create Service'}
      maxWidth="md"
    >
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-500 text-sm mb-5">
          {error}
        </div>
      )}

      {!editingService && template && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500 text-blue-500 text-sm mb-5">
          <strong>Configure Branch Pricing:</strong> Set pricing and options for{' '}
          <strong>{template.name}</strong> at your branch. The service template is platform-owned
          and cannot be modified.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {template && (
          <div>
            <label className={cn('block text-sm font-medium mb-2', t.textSecondary)}>
              Service Template{' '}
              <span className={cn('text-xs font-normal', t.textTertiary)}>
                (Platform-owned, read-only)
              </span>
            </label>
            <div className={cn('p-3 rounded-lg border', t.input)}>
              <div className="font-semibold mb-1">{template.name}</div>
              {template.description && (
                <div className={cn('text-xs mt-1', t.textTertiary)}>
                  {template.description}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={cn('text-[11px]', t.textTertiary)}>
                  Unit: {template.measurementUnit}
                </span>
                {template.allowsCustomSize && (
                  <span className={cn('text-[11px]', t.textTertiary)}>
                    • Custom Size
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <Input
          label={isBondPaper ? 'Price per Page *' : 'Price per Unit *'}
          type="number"
          step="0.01"
          value={formData.pricePerUnit || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              pricePerUnit: parseFloat(e.target.value) || 0,
            })
          }
          placeholder="0.00"
          required
        />
        {isBondPaper && (
          <div className={cn('-mt-3 text-xs', t.textTertiary)}>
            Base price per page (black & white)
          </div>
        )}

        {!isBondPaper && (
          <div>
            <label className={cn('block text-sm font-medium mb-2', t.textSecondary)}>
              Constant (for inch to sqft conversion)
              <span className={cn('text-xs font-normal ml-2', t.textTertiary)}>
                Optional - defaults to null
              </span>
            </label>
            <Input
              type="number"
              value={formData.constant ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({
                  ...formData,
                  constant: value === '' ? null : parseFloat(value) || null,
                });
              }}
              placeholder="Leave empty for null (default)"
            />
          </div>
        )}

        {isBondPaper && template?.supportsColor && (
          <div>
            <label className={cn('block text-sm font-medium mb-2', t.textSecondary)}>
              Color Price Modifier (per page)
              <span className={cn('text-xs font-normal ml-2', t.textTertiary)}>
                Optional - fixed amount added per page when color is selected
              </span>
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.colorPriceModifier ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({
                  ...formData,
                  colorPriceModifier: value === '' ? null : parseFloat(value) || null,
                });
              }}
              placeholder="e.g., 0.25 (additional amount per page for color)"
            />
            <div className={cn(
              'mt-1.5 p-2 rounded-md text-xs',
              t.isDark ? 'bg-blue-500/10 text-gray-400' : 'bg-blue-50 text-gray-600'
            )}>
              <strong>Bond Paper Pricing:</strong> This is a fixed amount added to the unit price per page when color printing is selected. Example: If unit price is 0.50 and modifier is 0.25, color printing costs 0.75 per page.
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="cursor-pointer w-[18px] h-[18px]"
            />
            <span className={cn('text-sm', t.textSecondary)}>
              Active
            </span>
          </label>
          {template?.supportsColor && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.supportsColor}
                onChange={(e) => setFormData({ ...formData, supportsColor: e.target.checked })}
                className="cursor-pointer w-[18px] h-[18px]"
              />
              <span className={cn('text-sm', t.textSecondary)}>
                Supports Color
              </span>
            </label>
          )}
          {template?.supportsFrontBack && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.supportsFrontBack}
                onChange={(e) =>
                  setFormData({ ...formData, supportsFrontBack: e.target.checked })
                }
                className="cursor-pointer w-[18px] h-[18px]"
              />
              <span className={cn('text-sm', t.textSecondary)}>
                Supports Front/Back
              </span>
            </label>
          )}
          {template?.supportsPrintCut && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.supportsPrintCut}
                onChange={(e) => setFormData({ ...formData, supportsPrintCut: e.target.checked })}
                className="cursor-pointer w-[18px] h-[18px]"
              />
              <span className={cn('text-sm', t.textSecondary)}>
                Supports Print & Cut
              </span>
            </label>
          )}
          {template?.supportsFrontBack && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.supportsFrontOnly}
                onChange={(e) =>
                  setFormData({ ...formData, supportsFrontOnly: e.target.checked })
                }
                className="cursor-pointer w-[18px] h-[18px]"
              />
              <span className={cn('text-sm', t.textSecondary)}>
                Supports Front Only
              </span>
            </label>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" type="button" onClick={onClose} size="lg">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} size="lg">
            {isSubmitting ? 'Saving...' : editingService ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
