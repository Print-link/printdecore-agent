import { useState, useCallback } from 'react';
import { Modal, Button, Input } from '../../../components/ui';
import { BarChart3, Plus, X } from '../../../components/icons';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { whatsappFeaturesApi } from '../../../services/api/whatsappFeatures';
import { whatsappService } from '../../../services/whatsappService';

interface SendPollModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

export default function SendPollModal({ open, onClose, chatId }: SendPollModalProps) {
  const t = useThemeClasses();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setQuestion('');
    setOptions(['', '']);
    setMultiSelect(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!loading) { resetForm(); onClose(); }
  }, [loading, onClose, resetForm]);

  const addOption = useCallback(() => {
    if (options.length < 12) setOptions(prev => [...prev, '']);
  }, [options.length]);

  const removeOption = useCallback((index: number) => {
    if (options.length > 2) setOptions(prev => prev.filter((_, i) => i !== index));
  }, [options.length]);

  const updateOption = useCallback((index: number, value: string) => {
    setOptions(prev => prev.map((o, i) => i === index ? value : o));
  }, []);

  const validOptions = options.filter(o => o.trim());

  const handleSend = useCallback(async () => {
    if (!question.trim()) { setError('Question is required'); return; }
    if (validOptions.length < 2) { setError('At least 2 options required'); return; }

    setLoading(true);
    setError(null);
    try {
      // Call the native poll API (sends real WhatsApp poll, not text)
      const result = await whatsappFeaturesApi.sendPoll(
        chatId,
        question.trim(),
        validOptions.map(o => o.trim()),
        multiSelect ? validOptions.length : 1,
      );

      // Add the returned sentMessage to the local message cache so it appears in chat
      if (result.sentMessage) {
        const msg = result.sentMessage;
        if (!msg.status) msg.status = 'sent';
        const messages = whatsappService.getMessagesForChat(chatId) || [];
        // Avoid duplicate
        if (!messages.some(m => m.id === msg.id)) {
          messages.push(msg);
          (whatsappService as any).messages.set(chatId, [...messages]);
        }
        whatsappService.emit('messages_updated', chatId);
      }

      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send poll');
    } finally {
      setLoading(false);
    }
  }, [chatId, question, validOptions, multiSelect, onClose, resetForm]);

  return (
    <Modal open={open} onClose={handleClose} title="Send Poll" maxWidth="md">
      <div className="p-6 space-y-4">
        <div className={cn('flex items-center gap-3 p-3 rounded-lg', t.isDark ? 'bg-gray-700/50' : 'bg-blue-50')}>
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 size={20} className="text-white" />
          </div>
          <p className={cn('text-sm', t.textSecondary)}>
            Send a native WhatsApp poll to collect responses
          </p>
        </div>

        <Input
          label="Question"
          placeholder="e.g., Which paper size do you prefer?"
          value={question}
          onChange={e => { setQuestion(e.target.value); setError(null); }}
        />

        <div>
          <label className={cn('block text-sm font-medium mb-2', t.textSecondary)}>
            Options ({validOptions.length}/12)
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn('text-xs w-5 text-center font-medium', t.textTertiary)}>{i + 1}</span>
                <input
                  value={opt}
                  onChange={e => { updateOption(i, e.target.value); setError(null); }}
                  placeholder={`Option ${i + 1}`}
                  className={cn('flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400', t.input)}
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className={cn('p-1 rounded', t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}>
                    <X size={14} className={t.textTertiary} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 12 && (
            <button onClick={addOption} className={cn('flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded', t.isDark ? 'text-amber-400 hover:bg-gray-700' : 'text-amber-600 hover:bg-amber-50')}>
              <Plus size={12} /> Add option
            </button>
          )}
        </div>

        {/* Multi-select toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={multiSelect}
            onChange={e => setMultiSelect(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
          />
          <span className={cn('text-sm', t.textSecondary)}>Allow multiple selections</span>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className={cn('flex justify-end gap-3 px-6 py-4 border-t', t.border)}>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSend}
          loading={loading}
          icon={BarChart3}
          disabled={!question.trim() || validOptions.length < 2}
        >
          Send Poll
        </Button>
      </div>
    </Modal>
  );
}
