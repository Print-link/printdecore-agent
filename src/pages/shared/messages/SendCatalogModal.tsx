import { useState, useCallback } from 'react';
import { Modal, Button, Input } from '../../../components/ui';
import { ShoppingBag, Plus, X } from '../../../components/icons';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { useWhatsAppStore } from '../../../stores/whatsappStore';

interface Product {
  name: string;
  description: string;
  price: string;
}

interface SendCatalogModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

const EMPTY_PRODUCT: Product = { name: '', description: '', price: '' };

export default function SendCatalogModal({ open, onClose, chatId }: SendCatalogModalProps) {
  const t = useThemeClasses();
  const { sendMessage } = useWhatsAppStore();
  const [bodyText, setBodyText] = useState('');
  const [buttonText, setButtonText] = useState('Reply with the number to order');
  const [products, setProducts] = useState<Product[]>([{ ...EMPTY_PRODUCT }, { ...EMPTY_PRODUCT }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setBodyText('');
    setButtonText('Reply with the number to order');
    setProducts([{ ...EMPTY_PRODUCT }, { ...EMPTY_PRODUCT }]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!loading) { resetForm(); onClose(); }
  }, [loading, onClose, resetForm]);

  const addProduct = useCallback(() => {
    if (products.length < 10) setProducts(prev => [...prev, { ...EMPTY_PRODUCT }]);
  }, [products.length]);

  const removeProduct = useCallback((index: number) => {
    if (products.length > 1) setProducts(prev => prev.filter((_, i) => i !== index));
  }, [products.length]);

  const updateProduct = useCallback((index: number, field: keyof Product, value: string) => {
    setProducts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }, []);

  const handleSend = useCallback(async () => {
    const validProducts = products.filter(p => p.name.trim());
    if (!bodyText.trim()) { setError('Message text is required'); return; }
    if (validProducts.length === 0) { setError('At least 1 service/product is required'); return; }

    // Build formatted catalog text
    const lines: string[] = [];
    lines.push(`📋 *${bodyText.trim()}*`);
    lines.push('');
    validProducts.forEach((p, i) => {
      lines.push(`*${i + 1}. ${p.name.trim()}*`);
      if (p.description.trim()) lines.push(`   ${p.description.trim()}`);
      if (p.price.trim()) lines.push(`   💰 ${p.price.trim()}`);
      lines.push('');
    });
    lines.push(`_${buttonText.trim() || 'Reply with the number to order'}_`);

    setLoading(true);
    setError(null);
    try {
      // Use the store's sendMessage — handles optimistic update, SSE dedup, everything
      await sendMessage(chatId, lines.join('\n'));
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to send catalog');
    } finally {
      setLoading(false);
    }
  }, [chatId, bodyText, buttonText, products, sendMessage, onClose, resetForm]);

  const validCount = products.filter(p => p.name.trim()).length;

  return (
    <Modal open={open} onClose={handleClose} title="Send Service Catalog" maxWidth="lg">
      <div className="p-6 space-y-4">
        <div className={cn('flex items-center gap-3 p-3 rounded-lg', t.isDark ? 'bg-gray-700/50' : 'bg-purple-50')}>
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <p className={cn('text-sm', t.textSecondary)}>
            Send a browsable list of your services. The customer can tap to view options.
          </p>
        </div>

        <Input label="Header Message" placeholder="e.g., Here are our available services:" value={bodyText} onChange={e => { setBodyText(e.target.value); setError(null); }} />
        <Input label="Footer Text" placeholder="Reply with the number to order" value={buttonText} onChange={e => setButtonText(e.target.value)} />

        <div>
          <label className={cn('block text-sm font-medium mb-2', t.textSecondary)}>Services / Products ({validCount})</label>
          <div className="space-y-3">
            {products.map((product, i) => (
              <div key={i} className={cn('p-3 rounded-lg border', t.isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200')}>
                <div className="flex items-start gap-2">
                  <span className={cn('text-xs mt-2 w-5 text-center font-bold', t.textTertiary)}>{i + 1}</span>
                  <div className="flex-1 space-y-2">
                    <input value={product.name} onChange={e => { updateProduct(i, 'name', e.target.value); setError(null); }} placeholder="Service name *" className={cn('w-full px-3 py-1.5 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-amber-400', t.input)} />
                    <div className="flex gap-2">
                      <input value={product.description} onChange={e => updateProduct(i, 'description', e.target.value)} placeholder="Description (optional)" className={cn('flex-1 px-3 py-1.5 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-amber-400', t.input)} />
                      <input value={product.price} onChange={e => updateProduct(i, 'price', e.target.value)} placeholder="Price (e.g., GH₵50)" className={cn('w-32 px-3 py-1.5 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-amber-400', t.input)} />
                    </div>
                  </div>
                  {products.length > 1 && (
                    <button onClick={() => removeProduct(i)} className={cn('p-1 rounded mt-1', t.isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200')}>
                      <X size={14} className={t.textTertiary} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {products.length < 10 && (
            <button onClick={addProduct} className={cn('flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded', t.isDark ? 'text-amber-400 hover:bg-gray-700' : 'text-amber-600 hover:bg-amber-50')}>
              <Plus size={12} /> Add service
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className={cn('flex justify-end gap-3 px-6 py-4 border-t', t.border)}>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSend} loading={loading} icon={ShoppingBag} disabled={!bodyText.trim() || validCount === 0}>Send Catalog</Button>
      </div>
    </Modal>
  );
}
