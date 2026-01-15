import { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { apiService } from '../../../../services/api';
import type { ServiceTemplate, CreateServiceTemplateData, UpdateServiceTemplateData, PricingConfig, BaseConfiguration, PricingOption, CustomSpecification } from '../../../../types';
import { BaseConfigurationsSection } from './pricing-config/components/BaseConfigurationsSection';
import { OptionsSection } from './pricing-config/components/OptionsSection';
import { CustomSpecificationsSection } from './pricing-config/components/CustomSpecificationsSection';
import { AddBaseConfigDialog, AddOptionDialog, AddCustomSpecDialog } from './pricing-config/dialogs';

interface ServiceTemplateFormProps {
  isOpen: boolean;
  branchId: string;
  subCategoryId: string;
  editingTemplate?: ServiceTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper to get default pricing config for area-based templates
const getDefaultTemplatePricingConfig = (): PricingConfig => ({
  baseConfigurations: [
    { id: 'standard', name: 'Standard Size', type: 'PRESET' as const, unitPrice: 0 },
    { id: 'custom', name: 'Custom Size', type: 'CUSTOM' as const, unitPrice: 0 },
  ],
  options: [
    {
      id: 'black_white',
      name: 'Black & White',
      enabled: true,
      default: true,
      priceModifier: 0,
    },
    {
      id: 'color',
      name: 'Color',
      enabled: true,
      default: false,
      priceModifier: 0,
    },
  ],
  customSpecifications: [],
});

export function ServiceTemplateForm({
  isOpen,
  branchId,
  subCategoryId,
  editingTemplate,
  onClose,
  onSuccess,
}: ServiceTemplateFormProps) {
  const { theme } = useTheme();
  const [pricingFormulas, setPricingFormulas] = useState<any[]>([]);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
  
  const [formData, setFormData] = useState<CreateServiceTemplateData>({
    subCategoryId,
    branchId,
    name: '',
    measurementUnit: 'FEET',
    allowsCustomSize: false,
    supportsFrontBack: false,
    supportsColor: false,
    supportsPrintCut: false,
    pricingFormulaId: '',
  });

  // Pricing config state
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(getDefaultTemplatePricingConfig());
  
  // Section expansion states
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [isCustomSpecsExpanded, setIsCustomSpecsExpanded] = useState(false);
  
  // Dialog states
  const [showAddBaseConfig, setShowAddBaseConfig] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [showAddCustomSpec, setShowAddCustomSpec] = useState(false);
  const [checkedBaseConfigs, setCheckedBaseConfigs] = useState<Set<number>>(new Set());
  const [editingOption, setEditingOption] = useState<number | null>(null);
  const [editingCustomSpec, setEditingCustomSpec] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if selected formula is area-based
  const selectedFormula = useMemo(() => {
    return pricingFormulas.find(f => f.id === formData.pricingFormulaId);
  }, [pricingFormulas, formData.pricingFormulaId]);

  const isAreaBased = useMemo(() => {
    if (!selectedFormula) return false;
    const formulaType = selectedFormula.formulaType || selectedFormula.formula_type || '';
    return ['AREA_FEET', 'AREA_INCH', 'AREA_OR_UNIT'].includes(formulaType);
  }, [selectedFormula]);

  useEffect(() => {
    const fetchFormulas = async () => {
      setIsLoadingFormulas(true);
      try {
        const formulas = await apiService.getPricingFormulas();
        setPricingFormulas(formulas);
        if (formulas.length > 0 && !formData.pricingFormulaId) {
          setFormData(prev => ({ ...prev, pricingFormulaId: formulas[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch pricing formulas:', err);
      } finally {
        setIsLoadingFormulas(false);
      }
    };

    if (isOpen) {
      fetchFormulas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        subCategoryId: editingTemplate.subCategoryId,
        branchId: editingTemplate.branchId || branchId,
        name: editingTemplate.name,
        measurementUnit: editingTemplate.measurementUnit,
        allowsCustomSize: editingTemplate.allowsCustomSize,
        supportsFrontBack: editingTemplate.supportsFrontBack,
        supportsColor: editingTemplate.supportsColor,
        supportsPrintCut: editingTemplate.supportsPrintCut,
        pricingFormulaId: editingTemplate.pricingFormulaId || '',
      });
      
      // Load pricing config if exists
      if (editingTemplate.pricingConfig) {
        setPricingConfig({
          baseConfigurations: editingTemplate.pricingConfig.baseConfigurations || [],
          options: editingTemplate.pricingConfig.options || [],
          customSpecifications: editingTemplate.pricingConfig.customSpecifications || [],
        });
      } else {
        setPricingConfig(getDefaultTemplatePricingConfig());
      }
    } else {
      setFormData({
        subCategoryId,
        branchId,
        name: '',
        measurementUnit: 'FEET',
        allowsCustomSize: false,
        supportsFrontBack: false,
        supportsColor: false,
        supportsPrintCut: false,
        pricingFormulaId: pricingFormulas.length > 0 ? pricingFormulas[0].id : '',
      });
      setPricingConfig(getDefaultTemplatePricingConfig());
    }
    setError(null);
  }, [editingTemplate, isOpen, subCategoryId, branchId, pricingFormulas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const submitData: CreateServiceTemplateData | UpdateServiceTemplateData = {
        ...formData,
        // Only include pricing config if area-based
        ...(isAreaBased ? { pricingConfig } : {}),
      };

      if (editingTemplate) {
        await apiService.updateServiceTemplate(editingTemplate.id, submitData as UpdateServiceTemplateData);
      } else {
        await apiService.createServiceTemplate(submitData as CreateServiceTemplateData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pricing config handlers
  const addBaseConfiguration = (config: BaseConfiguration) => {
    setPricingConfig({
      ...pricingConfig,
      baseConfigurations: [...(pricingConfig.baseConfigurations || []), config],
    });
  };

  const updateBaseConfiguration = (index: number, updates: Partial<BaseConfiguration>) => {
    const updated = [...(pricingConfig.baseConfigurations || [])];
    updated[index] = { ...updated[index], ...updates };
    setPricingConfig({ ...pricingConfig, baseConfigurations: updated });
  };

  const removeBaseConfiguration = (index: number) => {
    setPricingConfig({
      ...pricingConfig,
      baseConfigurations: (pricingConfig.baseConfigurations || []).filter((_, i) => i !== index),
    });
  };

  const addOption = (option: PricingOption) => {
    const updated = [...(pricingConfig.options || []), option];
    if (option.default) {
      updated.forEach((opt, i) => {
        if (i !== updated.length - 1) opt.default = false;
      });
    }
    setPricingConfig({ ...pricingConfig, options: updated });
  };

  const updateOption = (index: number, updates: Partial<PricingOption>) => {
    const updated = [...(pricingConfig.options || [])];
    updated[index] = { ...updated[index], ...updates };
    if (updates.default === true) {
      updated.forEach((opt, i) => {
        if (i !== index) opt.default = false;
      });
    }
    setPricingConfig({ ...pricingConfig, options: updated });
    setEditingOption(null);
  };

  const removeOption = (index: number) => {
    setPricingConfig({
      ...pricingConfig,
      options: (pricingConfig.options || []).filter((_, i) => i !== index),
    });
  };

  const addCustomSpecification = (spec: CustomSpecification) => {
    setPricingConfig({
      ...pricingConfig,
      customSpecifications: [...(pricingConfig.customSpecifications || []), spec],
    });
  };

  const updateCustomSpecification = (index: number, updates: Partial<CustomSpecification>) => {
    const updated = [...(pricingConfig.customSpecifications || [])];
    updated[index] = { ...updated[index], ...updates };
    setPricingConfig({ ...pricingConfig, customSpecifications: updated });
    setEditingCustomSpec(null);
  };

  const removeCustomSpecification = (index: number) => {
    setPricingConfig({
      ...pricingConfig,
      customSpecifications: (pricingConfig.customSpecifications || []).filter((_, i) => i !== index),
    });
  };

  const handleToggleBaseConfig = (index: number, checked: boolean) => {
    const newChecked = new Set(checkedBaseConfigs);
    if (checked) {
      newChecked.add(index);
    } else {
      newChecked.delete(index);
    }
    setCheckedBaseConfigs(newChecked);
  };

  const SectionHeader = ({ title, isExpanded, onToggle, count, description }: { 
    title: string; 
    isExpanded: boolean; 
    onToggle: () => void; 
    count?: number; 
    description?: string;
  }) => (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between py-4 border-b ${
        theme === 'dark' ? 'border-gray-800 text-gray-400 hover:text-gray-300' : 'border-gray-100 text-gray-500 hover:text-gray-700'
      } transition-colors group`}
    >
      <div className="flex items-center gap-3">
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            theme === 'dark' ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
          }`}>
            {count}
          </span>
        )}
        {description && (
          <span className="text-[12px] text-gray-500" title={description}>{description}</span>
        )}
      </div>
    </button>
  );

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex flex-col transition-all duration-300 animate-in fade-in zoom-in-95 ${
          theme === "dark" ? "bg-gray-900 font-sans" : "bg-gray-50 font-sans"
        }`}
      >
        <div className="flex flex-col h-full max-w-[1400px] mx-auto w-full">
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold m-0 ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {editingTemplate ? 'Edit Custom Template' : 'Create Custom Template'}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto px-6 py-8">
              <div className="max-w-3xl mx-auto">
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-xs mb-6 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-bold">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                  {/* Basic Template Information */}
                  <div className="space-y-4">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Basic Information
                    </h3>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Template Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="e.g. Special A4 Glossy"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Measurement Unit *
                      </label>
                      <select
                        value={formData.measurementUnit}
                        onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value as any })}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="FEET">Square Feet</option>
                        <option value="INCH">Square Inch</option>
                        <option value="UNIT">Per Unit / Page</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Pricing Formula *
                      </label>
                      <select
                        value={formData.pricingFormulaId}
                        onChange={(e) => setFormData({ ...formData, pricingFormulaId: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        disabled={isLoadingFormulas}
                        required
                      >
                        {pricingFormulas.map(formula => (
                          <option key={formula.id} value={formula.id}>
                            {formula.code} - {formula.description}
                          </option>
                        ))}
                      </select>
                      {isAreaBased && (
                        <p className={`mt-1.5 text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Area-based formula selected. Pricing configuration will be available below.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.allowsCustomSize}
                          onChange={(e) => setFormData({ ...formData, allowsCustomSize: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium">Custom Size</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.supportsFrontBack}
                          onChange={(e) => setFormData({ ...formData, supportsFrontBack: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium">Front & Back</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.supportsColor}
                          onChange={(e) => setFormData({ ...formData, supportsColor: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium">Supports Color</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.supportsPrintCut}
                          onChange={(e) => setFormData({ ...formData, supportsPrintCut: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium">Print & Cut</span>
                      </label>
                    </div>
                  </div>

                  {/* Pricing Configuration - Only for Area-based formulas */}
                  {isAreaBased && (
                    <>
                      {/* Base Pricing Section - Always Expanded */}
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <BaseConfigurationsSection
                          baseConfigurations={pricingConfig.baseConfigurations || []}
                          checkedIndices={checkedBaseConfigs}
                          theme={theme}
                          onAdd={() => setShowAddBaseConfig(true)}
                          onToggle={handleToggleBaseConfig}
                          onUpdate={updateBaseConfiguration}
                          onDelete={removeBaseConfiguration}
                        />
                      </div>

                      {/* Standard Options Section */}
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
                        <SectionHeader
                          title="Standard Options"
                          description="Configure standard options with price modifiers i.e. paper size, paper type, paper color, etc."
                          isExpanded={isOptionsExpanded}
                          onToggle={() => setIsOptionsExpanded(!isOptionsExpanded)}
                          count={pricingConfig.options?.length}
                        />
                        {isOptionsExpanded && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <OptionsSection
                              options={pricingConfig.options || []}
                              editingIndex={editingOption}
                              theme={theme}
                              onAdd={() => setShowAddOption(true)}
                              onEdit={setEditingOption}
                              onUpdate={updateOption}
                              onCancelEdit={() => setEditingOption(null)}
                              onDelete={removeOption}
                            />
                          </div>
                        )}
                      </div>

                      {/* Custom Specifications Section */}
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-300">
                        <SectionHeader
                          title="Custom Specifications"
                          description="Configure extra Add-on with price modifiers i.e. Brown envelope, Lamination, etc."
                          isExpanded={isCustomSpecsExpanded}
                          onToggle={() => setIsCustomSpecsExpanded(!isCustomSpecsExpanded)}
                          count={pricingConfig.customSpecifications?.length}
                        />
                        {isCustomSpecsExpanded && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <CustomSpecificationsSection
                              customSpecifications={pricingConfig.customSpecifications || []}
                              editingIndex={editingCustomSpec}
                              theme={theme}
                              onAdd={() => setShowAddCustomSpec(true)}
                              onEdit={setEditingCustomSpec}
                              onUpdate={updateCustomSpecification}
                              onCancelEdit={() => setEditingCustomSpec(null)}
                              onDelete={removeCustomSpecification}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className={`flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors ${
                        theme === 'dark'
                          ? 'border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300'
                          : 'border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </form>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddBaseConfigDialog
        isOpen={showAddBaseConfig}
        onClose={() => setShowAddBaseConfig(false)}
        onAdd={addBaseConfiguration}
        theme={theme}
      />
      <AddOptionDialog
        isOpen={showAddOption}
        onClose={() => setShowAddOption(false)}
        onAdd={addOption}
        theme={theme}
      />
      <AddCustomSpecDialog
        isOpen={showAddCustomSpec}
        onClose={() => setShowAddCustomSpec(false)}
        onAdd={addCustomSpecification}
        theme={theme}
      />
    </>
  );
}
