import { useState, useEffect, useCallback } from 'react';
import { Receipt, CheckCircle, Clock, AlertCircle, X, ChevronDown, ChevronUp, RefreshCw } from '../../../components/icons';
import { Badge } from '../../../components/ui';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { whatsappQuoteApi, type WhatsAppQuote } from '../../../services/api/whatsappQuotes';

interface QuoteTrackerProps {
	chatId: string;
}

const STATUS_CONFIG: Record<string, { color: 'amber' | 'green' | 'red' | 'blue' | 'gray' | 'purple'; label: string }> = {
	pending: { color: 'amber', label: 'Pending' },
	viewed: { color: 'blue', label: 'Viewed' },
	accepted: { color: 'purple', label: 'Accepted' },
	paid: { color: 'green', label: 'Paid' },
	expired: { color: 'gray', label: 'Expired' },
	cancelled: { color: 'red', label: 'Cancelled' },
	declined: { color: 'red', label: 'Declined' },
};

function formatCurrency(amount: number, currency: string = 'GHS') {
	const symbols: Record<string, string> = { GHS: 'GH₵', NGN: '₦', USD: '$' };
	return `${symbols[currency] || currency}${amount.toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export default function QuoteTracker({ chatId }: QuoteTrackerProps) {
	const t = useThemeClasses();
	const [quotes, setQuotes] = useState<WhatsAppQuote[]>([]);
	const [loading, setLoading] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const fetchQuotes = useCallback(async () => {
		setLoading(true);
		try {
			const data = await whatsappQuoteApi.getQuotesForChat(chatId);
			setQuotes(data);
			setLoaded(true);
		} catch {
			// Silently fail
		} finally {
			setLoading(false);
		}
	}, [chatId]);

	// Load quotes when expanded for the first time
	useEffect(() => {
		if (expanded && !loaded) {
			fetchQuotes();
		}
	}, [expanded, loaded, fetchQuotes]);

	// Reset when chat changes
	useEffect(() => {
		setQuotes([]);
		setLoaded(false);
		setExpanded(false);
	}, [chatId]);

	const activeQuotes = quotes.filter(q => ['pending', 'viewed', 'accepted'].includes(q.status));
	const paidQuotes = quotes.filter(q => q.status === 'paid');

	return (
		<div className={cn('border-b', t.border)}>
			{/* Toggle bar */}
			<button
				onClick={() => setExpanded(!expanded)}
				className={cn(
					'w-full flex items-center justify-between px-6 py-2 text-xs transition-colors',
					t.isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50',
				)}
			>
				<div className="flex items-center gap-2">
					<Receipt size={12} className="text-amber-500" />
					<span className={cn('font-medium', t.textSecondary)}>
						Quotes
					</span>
					{loaded && activeQuotes.length > 0 && (
						<span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold">
							{activeQuotes.length} active
						</span>
					)}
					{loaded && paidQuotes.length > 0 && (
						<span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] font-bold">
							{paidQuotes.length} paid
						</span>
					)}
				</div>
				{expanded ? <ChevronUp size={12} className={t.textSecondary} /> : <ChevronDown size={12} className={t.textSecondary} />}
			</button>

			{/* Expanded panel */}
			{expanded && (
				<div className={cn('px-6 pb-3')}>
					{loading && !loaded ? (
						<div className="flex items-center justify-center py-4">
							<div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
						</div>
					) : quotes.length === 0 ? (
						<p className={cn('text-xs text-center py-3', t.textTertiary)}>
							No quotes sent in this conversation yet
						</p>
					) : (
						<div className="space-y-2">
							{/* Refresh */}
							<div className="flex justify-end">
								<button
									onClick={fetchQuotes}
									disabled={loading}
									className={cn('p-1 rounded transition-colors', t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
									title="Refresh quotes"
								>
									<RefreshCw size={12} className={cn(loading && 'animate-spin', t.textTertiary)} />
								</button>
							</div>

							{quotes.map((quote) => {
								const cfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.pending;
								return (
									<div
										key={quote.id}
										className={cn(
											'flex items-center gap-3 p-2.5 rounded-lg border text-xs',
											t.isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200',
										)}
									>
										{/* Status icon */}
										<div className="flex-shrink-0">
											{quote.status === 'paid' ? (
												<CheckCircle size={16} className="text-green-500" />
											) : quote.status === 'pending' || quote.status === 'viewed' ? (
												<Clock size={16} className="text-amber-500" />
											) : (
												<AlertCircle size={16} className="text-gray-400" />
											)}
										</div>

										{/* Details */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className={cn('font-medium truncate', t.text)}>
													{quote.category}
												</span>
												<Badge color={cfg.color}>{cfg.label}</Badge>
											</div>
											{quote.description && (
												<p className={cn('truncate mt-0.5', t.textTertiary)}>
													{quote.description}
												</p>
											)}
										</div>

										{/* Amount + time */}
										<div className="text-right flex-shrink-0">
											<p className={cn('font-bold', quote.status === 'paid' ? 'text-green-500' : t.text)}>
												{formatCurrency(quote.amount, quote.currency)}
											</p>
											<p className={cn('mt-0.5', t.textTertiary)}>
												{timeAgo(quote.createdAt)}
											</p>
										</div>
									</div>
								);
							})}

							{/* Summary */}
							{quotes.length > 0 && (
								<div className={cn('flex items-center justify-between pt-2 border-t text-[10px]', t.border, t.textTertiary)}>
									<span>{quotes.length} total quote{quotes.length !== 1 ? 's' : ''}</span>
									<span>
										{formatCurrency(
											paidQuotes.reduce((sum, q) => sum + q.amount, 0),
											'GHS'
										)}{' '}
										collected
									</span>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
