import { useState } from 'react';
import type { PricingOption } from "../../../../../../types";
import { Modal, Input, Button } from '../../../../../../components/ui';
import { useThemeClasses } from '../../../../../../lib/theme';

interface AddOptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (option: PricingOption) => void;
}

export function AddOptionDialog({ isOpen, onClose, onAdd }: AddOptionDialogProps) {
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [priceModifier, setPriceModifier] = useState<number | string>('');
  const t = useThemeClasses();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: `option_${Date.now()}`,
      name: name.trim(),
      enabled,
      default: isDefault,
      priceModifier: typeof priceModifier === 'string' ? parseFloat(priceModifier) || 0 : priceModifier,
    });

    // Reset form
    setName('');
    setEnabled(true);
    setIsDefault(false);
    setPriceModifier('');
    onClose();
  };

  const handlePriceChange = (value: string) => {
    if (value === '' || value === '-') {
      setPriceModifier(value);
      return;
    }
    const parsed = parseFloat(value);
    setPriceModifier(isNaN(parsed) ? value : value);
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Add Option">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Color"
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="cursor-pointer"
          />
          <label
            htmlFor="enabled"
            className={`text-sm ${t.textSecondary}`}
          >
            Enabled
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="default"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="cursor-pointer"
          />
          <label
            htmlFor="default"
            className={`text-sm ${t.textSecondary}`}
          >
            Default (pre-selected for customers)
          </label>
        </div>
        <Input
          label="Price Modifier"
          type="number"
          step="0.01"
          value={priceModifier}
          onChange={(e) => handlePriceChange(e.target.value)}
          required
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
