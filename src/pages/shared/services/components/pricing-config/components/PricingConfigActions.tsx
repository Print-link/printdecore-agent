import { Save, CheckCircle } from '../../../../../../components/icons';

interface PricingConfigActionsProps {
  theme: 'dark' | 'light';
  isSubmitting: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onSaveAndActivate: () => void;
}

export function PricingConfigActions({
  theme,
  isSubmitting,
  onClose,
  onSaveDraft,
  onSaveAndActivate,
}: PricingConfigActionsProps) {
  return (
    <div
      className={`flex items-center justify-between px-6 py-3 border-t shrink-0 ${
        theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        className={`text-xs font-bold transition-colors ${
          theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
        }`}
      >
        Discard
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            isSubmitting
              ? 'opacity-50 cursor-not-allowed'
              : theme === 'dark'
              ? 'border-gray-800 text-gray-400 hover:bg-gray-800'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Save size={14} />
          <span>Save Draft</span>
        </button>
        <button
          type="button"
          onClick={onSaveAndActivate}
          disabled={isSubmitting}
          className={`flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-black transition-all ${
            isSubmitting
              ? 'bg-amber-500/50 cursor-not-allowed'
              : theme === 'dark'
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20 active:scale-95'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 active:scale-95'
          }`}
        >
          <CheckCircle size={14} />
          <span>Activate Service</span>
        </button>
      </div>
    </div>
  );
}
