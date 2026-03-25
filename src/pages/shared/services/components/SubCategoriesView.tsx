import { useState, useRef } from 'react';
import { ArrowLeft, Plus, X, Tag, ChevronRight, Camera } from '../../../../components/icons';
import { Card, Badge, Button } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import type { ServiceSubCategory } from '../../../../types';

const PRICING_TYPES = ['AREA_BASED', 'UNIT_ONLY', 'AREA_FEET', 'AREA_INCH', 'MIXED', 'CUSTOM_QUOTE'] as const;

interface SubCategoriesViewProps {
  subCategories: ServiceSubCategory[];
  onSubCategorySelect: (subCategory: ServiceSubCategory) => void;
  onBack: () => void;
  isLoading: boolean;
  onCreateSubCategory?: (data: { name: string; pricingType: string; description?: string; image?: File }) => Promise<void>;
}

export function SubCategoriesView({
  subCategories,
  onSubCategorySelect,
  onBack,
  isLoading,
  onCreateSubCategory,
}: SubCategoriesViewProps) {
  const t = useThemeClasses();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pricingType, setPricingType] = useState<string>('UNIT_ONLY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setPricingType('UNIT_ONLY');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onCreateSubCategory) return;
    setIsSubmitting(true);
    try {
      await onCreateSubCategory({
        name: name.trim(),
        pricingType,
        description: description.trim() || undefined,
        image: imageFile || undefined,
      });
      resetForm();
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = cn('w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all',
    t.isDark
      ? 'bg-gray-700/50 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
      : 'bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
  );

  return (
    <Card padding="lg" className="!rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} className="!p-1.5 !rounded-lg">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h2 className={cn('text-base font-semibold m-0', t.text)}>SubCategories</h2>
            <p className={cn('text-xs m-0', t.textTertiary)}>Select a subcategory to view templates</p>
          </div>
        </div>
        {onCreateSubCategory && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Plus size={14} />
            New
          </button>
        )}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <p className={cn('text-sm', t.textTertiary)}>Loading...</p>
      ) : subCategories.length === 0 ? (
        <div className={cn('text-center py-10', t.textTertiary)}>
          <Tag size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm m-0">No subcategories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {subCategories.map((subCategory) => (
            <button
              key={subCategory.id}
              onClick={() => onSubCategorySelect(subCategory)}
              className={cn(
                'group relative rounded-xl border text-left transition-all duration-200 overflow-hidden',
                t.isDark
                  ? 'bg-gray-800 border-gray-700/60 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/5'
                  : 'bg-white border-gray-100 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/10'
              )}
            >
              <div className={cn('w-full aspect-[4/3] relative overflow-hidden', t.isDark ? 'bg-gray-700/50' : 'bg-gray-50')}>
                {subCategory.imageUrl ? (
                  <img
                    src={subCategory.imageUrl}
                    alt={subCategory.name}
                    className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={`${subCategory.imageUrl ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', t.isDark ? 'bg-gray-600/50' : 'bg-gray-100')}>
                    <Tag size={20} className="text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className={cn('text-xs font-semibold m-0 truncate flex-1', t.text)}>{subCategory.name}</h3>
                  <ChevronRight size={12} className={cn('flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity', t.isDark ? 'text-amber-400' : 'text-amber-500')} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge color="amber" className="!text-[9px] !px-1.5 !py-0 !rounded">{subCategory.pricingType.replace(/_/g, ' ')}</Badge>
                  {subCategory.branchId && (
                    <span className="px-1.5 py-0 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400">Custom</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Premium Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <form
            onSubmit={handleSubmit}
            className={cn('relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden', t.isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200')}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between px-6 py-4 border-b', t.isDark ? 'border-gray-700' : 'border-gray-100')}>
              <div>
                <h3 className={cn('text-sm font-bold m-0', t.text)}>Create SubCategory</h3>
                <p className={cn('text-[11px] m-0 mt-0.5', t.textTertiary)}>Add a new subcategory for your branch</p>
              </div>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className={cn('p-1.5 rounded-lg transition-colors', t.isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400')}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Image Upload */}
              <div>
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wide mb-2', t.isDark ? 'text-gray-400' : 'text-gray-500')}>Cover Image</label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-2 right-2 flex gap-1.5">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 rounded-lg bg-white/90 text-[11px] font-semibold text-gray-700 hover:bg-white transition-colors shadow-sm">Change</button>
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="px-2.5 py-1 rounded-lg bg-red-500/90 text-[11px] font-semibold text-white hover:bg-red-500 transition-colors shadow-sm">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn('w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors',
                      t.isDark ? 'border-gray-600 hover:border-amber-500/50 bg-gray-700/30' : 'border-gray-200 hover:border-amber-400/50 bg-gray-50/50'
                    )}
                  >
                    <Camera size={22} className={t.isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <span className={cn('text-[11px] font-medium', t.isDark ? 'text-gray-400' : 'text-gray-500')}>Click to upload</span>
                    <span className={cn('text-[10px]', t.isDark ? 'text-gray-600' : 'text-gray-400')}>PNG, JPG up to 5MB</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </div>

              {/* Name */}
              <div>
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wide mb-1.5', t.isDark ? 'text-gray-400' : 'text-gray-500')}>Name <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. Vinyl Banners" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
              </div>

              {/* Description */}
              <div>
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wide mb-1.5', t.isDark ? 'text-gray-400' : 'text-gray-500')}>Description</label>
                <textarea placeholder="Brief description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cn(inputClass, 'resize-none')} />
              </div>

              {/* Pricing Type */}
              <div>
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wide mb-1.5', t.isDark ? 'text-gray-400' : 'text-gray-500')}>Pricing Type <span className="text-red-400">*</span></label>
                <select value={pricingType} onChange={(e) => setPricingType(e.target.value)} className={inputClass}>
                  {PRICING_TYPES.map((pt) => (
                    <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className={cn('flex items-center justify-end gap-2.5 px-6 py-4 border-t', t.isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50')}>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className={cn('px-4 py-2 rounded-xl text-xs font-semibold transition-colors', t.isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className={cn(
                  'px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm',
                  isSubmitting || !name.trim() ? 'bg-amber-400/60 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 hover:shadow-md'
                )}
              >
                {isSubmitting ? 'Creating...' : 'Create SubCategory'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}
