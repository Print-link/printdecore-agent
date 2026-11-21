import { useState } from 'react';
import { FileText, Receipt, Send, XCircle } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import type { OrderStatus, QuoteRequest } from '../../../types';
import { Button, Card } from '../../ui';

interface QuoteRequestCardProps {
	request: QuoteRequest;
	status: OrderStatus;
	isSending: boolean;
	onSendQuote: (amount: number) => void;
	onDecline?: () => void;
}

/** Statuses where the price can still be set or changed — before the customer pays */
const QUOTABLE: OrderStatus[] = ['PENDING', 'QUOTED'];

/**
 * A job the customer described (usually with the print assistant) instead of
 * picking a listed product: read what they need, then send a price — or
 * decline it. The customer pays the price you send from their order.
 */
export function QuoteRequestCard({ request, status, isSending, onSendQuote, onDecline }: QuoteRequestCardProps) {
	const t = useThemeClasses();
	const sent = request.quotation?.status === 'SENT' || status === 'QUOTED';
	// You type your own price; the customer pays it plus Printdecore's commission
	const [amount, setAmount] = useState(() => (sent && request.quotation?.shopPrice ? String(request.quotation.shopPrice) : ''));
	const value = Number(amount);
	const valid = Number.isFinite(value) && value > 0;
	const rate = request.commissionRate ?? 0;
	const commission = valid ? Math.round(value * rate) / 100 : 0;
	const customerPays = valid ? Math.round((value + commission) * 100) / 100 : 0;
	const ghs = (n: number) => `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const canQuote = request.canQuote && !!request.quotation && QUOTABLE.includes(status);
	const lines = (request.details ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

	return (
		<Card padding="sm" className="p-3 sm:p-4">
			<p className={`text-xs font-semibold uppercase tracking-wide ${t.textSecondary}`}>Quote request · {request.requestNumber}</p>
			<h3 className={`mt-1 text-lg font-bold ${t.text}`}>
				{request.quantity ? `${request.quantity.toLocaleString()} × ` : ''}
				{request.title}
			</h3>

			{lines.length > 0 && (
				<ul className={`mt-2 space-y-1 text-sm list-disc pl-5 ${t.text}`}>
					{lines.map((line, i) => (
						<li key={i}>{line}</li>
					))}
				</ul>
			)}

			{request.attachments.length > 0 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{request.attachments.map((f) => (
						<a
							key={f.url}
							href={f.url}
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium max-w-[16rem] ${
								t.isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
							} ${t.text}`}
						>
							<FileText size={14} />
							<span className="truncate">{f.name || 'File'}</span>
						</a>
					))}
				</div>
			)}

			{canQuote ? (
				<div className={`mt-4 p-3 rounded-lg ${t.isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
					<label htmlFor={`quote-${request.id}`} className={`block text-sm font-semibold ${t.text}`}>
						{sent ? 'Your price (sent — you can change it until they pay)' : 'Your price for the whole job'}
					</label>
					<div className="mt-2 flex items-center gap-2">
						<span className={`text-sm font-semibold ${t.textSecondary}`}>GHS</span>
						<input
							id={`quote-${request.id}`}
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							className={`flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm ${
								t.isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
							} focus:outline-none focus:ring-2 focus:ring-amber-400`}
						/>
					</div>
					{valid && (
						<div className={`mt-3 rounded-lg px-3 py-2 text-sm space-y-0.5 ${t.isDark ? 'bg-gray-900/60' : 'bg-white'}`}>
							<div className={`flex justify-between ${t.textSecondary}`}>
								<span>You're paid</span>
								<span className="tabular-nums">{ghs(value)}</span>
							</div>
							{rate > 0 && (
								<div className={`flex justify-between ${t.textSecondary}`}>
									<span>Platform service fee ({rate}%)</span>
									<span className="tabular-nums">+ {ghs(commission)}</span>
								</div>
							)}
							<div className={`flex justify-between font-semibold ${t.text}`}>
								<span>Customer pays</span>
								<span className="tabular-nums">{ghs(customerPays)}</span>
							</div>
						</div>
					)}
					<p className={`mt-2 text-xs ${t.textSecondary}`}>
						The customer gets it straight away and pays from their order. Include design, delivery and anything else in your price.
					</p>
					<div className="mt-3 flex gap-2">
						{onDecline && (
							<Button variant="secondary" onClick={onDecline} disabled={isSending} icon={XCircle}>
								Decline
							</Button>
						)}
						<Button
							onClick={() => valid && onSendQuote(Math.round(value * 100) / 100)}
							disabled={!valid || isSending}
							icon={Send}
							className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
						>
							{isSending ? 'Sending…' : sent ? 'Update price' : 'Send price'}
						</Button>
					</div>
				</div>
			) : (
				request.quotation?.amount !== undefined && (
					<p className={`mt-3 flex items-center gap-1.5 text-sm ${t.text}`}>
						<Receipt size={16} />
						{request.quotation.shopPrice !== undefined
								? `Your price ${ghs(request.quotation.shopPrice)} · customer pays ${ghs(request.quotation.amount)}`
								: `Price sent: ${ghs(request.quotation.amount)}`}
					</p>
				)
			)}
			{!request.canQuote && QUOTABLE.includes(status) && (
				<p className={`mt-3 text-xs ${t.textSecondary}`}>Printdecore is preparing the price for this request.</p>
			)}
		</Card>
	);
}
