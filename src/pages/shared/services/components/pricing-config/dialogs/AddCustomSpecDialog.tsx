import { useState } from 'react';
import type { CustomSpecification } from '../../../../../../types';
import { Modal, Input, Button } from '../../../../../../components/ui';

interface AddCustomSpecDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (spec: CustomSpecification) => void;
}

export function AddCustomSpecDialog({ isOpen, onClose, onAdd }: AddCustomSpecDialogProps) {
  const [name, setName] = useState('');
  const [priceModifier, setPriceModifier] = useState<number | string>('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: `spec_${Date.now()}`,
      name: name.trim(),
      priceModifier: typeof priceModifier === 'string' ? parseFloat(priceModifier) || 0 : priceModifier,
    });

    // Reset form
    setName('');
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
    <Modal open={isOpen} onClose={onClose} title="Add Extra Add Ons">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Lamination"
          required
        />
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
