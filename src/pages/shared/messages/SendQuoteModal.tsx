import { useState, useCallback } from 'react';
import { Modal, Button, Input, Select } from '../../../components/ui';
import { Receipt } from '../../../components/icons';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { whatsappQuoteApi, type CreateQuoteParams } from '../../../services/api/whatsappQuotes';
import { useBranchStore } from '../../../stores/branchStore';

interface SendQuoteModalProps {
	open: boolean;
	onClose: () => void;
	chatId: string;
	contactPhone: string;
	contactName?: string;
	businessPhoneNumber: string;
	/** Called after quote is created — parent sends the message via WhatsApp */
	onQuoteSent: (quoteId: string, messageText: string) => void;
}

const CATEGORIES = [
	{ value: 'Banner Printing', label: 'Banner Printing' },
	{ value: 'Business Cards', label: 'Business Cards' },
	{ value: 'Flyers & Posters', label: 'Flyers & Posters' },
	{ value: 'Stickers & Labels', label: 'Stickers & Labels' },
	{ value: 'T-Shirt Printing', label: 'T-Shirt Printing' },
	{ value: 'Large Format', label: 'Large Format' },
	{ value: 'Branding', label: 'Branding' },
	{ value: 'Signage', label: 'Signage' },
	{ value: 'Packaging', label: 'Packaging' },
	{ value: 'Other', label: 'Other' },
];

export default function SendQuoteModal({
	open,
	onClose,
	chatId,
	contactPhone,
	contactName,
	businessPhoneNumber,
	onQuoteSent,
}: SendQuoteModalProps) {
	const t = useThemeClasses();
	const { selectedBranch } = useBranchStore();

	const [category, setCategory] = useState('');
	const [customCategory, setCustomCategory] = useState('');
	const [amount, setAmount] = useState('');
	const [description, setDescription] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resetForm = useCallback(() => {
		setCategory('');
		setCustomCategory('');
		setAmount('');
		setDescription('');
		setError(null);
	}, []);

	const handleClose = useCallback(() => {
		if (!loading) {
			resetForm();
			onClose();
		}
	}, [loading, onClose, resetForm]);

	const handleSubmit = useCallback(async () => {
		const resolvedCategory = category === 'Other' ? customCategory.trim() : category;

		if (!resolvedCategory) {
			setError('Please select a category');
			return;
		}
		if (!amount || Number(amount) <= 0) {
			setError('Please enter a valid amount');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const params: CreateQuoteParams = {
				chatId,
				businessPhoneNumber,
				contactPhone,
				contactName,
				category: resolvedCategory,
				description: description.trim() || undefined,
				amount: Number(amount),
				branchId: selectedBranch?.id,
			};

			const response = await whatsappQuoteApi.createWhatsAppQuote(params);

			if (response.success) {
				onQuoteSent(response.data.quote.id, response.data.messageText);
				resetForm();
				onClose();
			}
		} catch (err: any) {
			console.error('Failed to create quote:', err);
			setError(err?.response?.data?.message || err?.message || 'Failed to create quote');
		} finally {
			setLoading(false);
		}
	}, [
		category,
		customCategory,
		amount,
		description,
		chatId,
		businessPhoneNumber,
		contactPhone,
		contactName,
		selectedBranch,
		onQuoteSent,
		resetForm,
		onClose,
	]);

	return (
		<Modal open={open} onClose={handleClose} title="Send Quote" maxWidth="md">
			<div className="p-6 space-y-4">
				{/* Header info */}
				<div className={cn('flex items-center gap-3 p-3 rounded-lg', t.isDark ? 'bg-gray-700/50' : 'bg-amber-50')}>
					<div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
						<Receipt size={20} className="text-gray-900" />
					</div>
					<div className="min-w-0">
						<p className={cn('text-sm font-medium', t.text)}>
							Sending quote to {contactName || contactPhone}
						</p>
						{selectedBranch && (
							<p className={cn('text-xs', t.textSecondary)}>
								Branch: {selectedBranch.name}
							</p>
						)}
					</div>
				</div>

				{/* Category */}
				<Select
					label="Category"
					options={CATEGORIES}
					placeholder="Select a category"
					value={category}
					onChange={(e) => {
						setCategory(e.target.value);
						setError(null);
					}}
				/>

				{category === 'Other' && (
					<Input
						label="Custom Category"
						placeholder="Enter category name"
						value={customCategory}
						onChange={(e) => {
							setCustomCategory(e.target.value);
							setError(null);
						}}
					/>
				)}

				{/* Amount */}
				<Input
					label="Price (GHS)"
					type="number"
					placeholder="0.00"
					min="0.01"
					step="0.01"
					value={amount}
					onChange={(e) => {
						setAmount(e.target.value);
						setError(null);
					}}
				/>

				{/* Description (optional) */}
				<div>
					<label className={cn('block text-sm font-medium mb-1', t.textSecondary)}>
						Description (optional)
					</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Add details about this quote..."
						rows={3}
						className={cn(
							'w-full px-4 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400',
							t.input,
						)}
					/>
				</div>

				{/* Amount preview */}
				{amount && Number(amount) > 0 && (
					<div className={cn(
						'flex items-center justify-between p-3 rounded-lg border',
						t.isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200',
					)}>
						<span className={cn('text-sm font-medium', t.textSecondary)}>Total</span>
						<span className="text-xl font-bold text-amber-500">
							GH₵{Number(amount).toFixed(2)}
						</span>
					</div>
				)}

				{/* Error */}
				{error && (
					<p className="text-sm text-red-500">{error}</p>
				)}
			</div>

			{/* Footer */}
			<div className={cn('flex justify-end gap-3 px-6 py-4 border-t', t.border)}>
				<Button variant="secondary" onClick={handleClose} disabled={loading}>
					Cancel
				</Button>
				<Button
					variant="primary"
					onClick={handleSubmit}
					loading={loading}
					icon={Receipt}
					disabled={!category || !amount || Number(amount) <= 0}
				>
					Send Quote
				</Button>
			</div>
		</Modal>
	);
}
