import { useState } from 'react';
import type { BaseConfiguration } from "../../../../../../types";
import { Modal, Input, Select, Button } from '../../../../../../components/ui';
import { useThemeClasses } from '../../../../../../lib/theme';

interface AddBaseConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: BaseConfiguration) => void;
}

export function AddBaseConfigDialog({ isOpen, onClose, onAdd }: AddBaseConfigDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [unitPrice, setUnitPrice] = useState<number | string>('');
  const [customValue, setCustomValue] = useState('');
  const t = useThemeClasses();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Ensure unitPrice is a number for validation and submission
    const finalUnitPrice = typeof unitPrice === 'string' ? parseFloat(unitPrice) || 0 : unitPrice;
    if (finalUnitPrice < 0) return;

    onAdd({
      id: `config_${Date.now()}`,
      name: name.trim(),
      type,
      unitPrice: finalUnitPrice,
      customValue: type === 'CUSTOM' ? customValue.trim() || null : null,
    });

    // Reset form
    setName('');
    setType('PRESET');
    setUnitPrice('');
    setCustomValue('');
    onClose();
  };

  const handlePriceChange = (value: string) => {
    if (value === '' || value === '-') {
      setUnitPrice(value);
      return;
    }
    const parsed = parseFloat(value);
    setUnitPrice(isNaN(parsed) ? value : value);
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Add Base Configuration">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., A4"
          required
        />
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as 'PRESET' | 'CUSTOM')}
          options={[
            { value: 'PRESET', label: 'Preset' },
            { value: 'CUSTOM', label: 'Custom' },
          ]}
        />
        <Input
          label="Unit Price"
          type="number"
          step="0.01"
          value={unitPrice}
          onChange={(e) => handlePriceChange(e.target.value)}
          required
        />
        {type === 'CUSTOM' && (
          <Input
            label="Custom Value (Optional)"
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="e.g., 8.5x11"
          />
        )}
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
