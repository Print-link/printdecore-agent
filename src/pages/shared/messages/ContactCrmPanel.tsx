import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappFeaturesApi, type CrmContact } from '../../../services/api/whatsappFeatures';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { User, Mail, Building, FileText, DollarSign, ShoppingBag, Edit, Save, X } from '../../../components/icons';

interface ContactCrmPanelProps {
	chatId: string;
	contactPhone: string;
	contactName?: string;
}

export default function ContactCrmPanel({ chatId, contactPhone, contactName }: ContactCrmPanelProps) {
	const t = useThemeClasses();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({ name: '', email: '', company: '', notes: '' });

	const { data: contact, isLoading } = useQuery<CrmContact | null>({
		queryKey: ['whatsapp', 'contact', chatId],
		queryFn: () => whatsappFeaturesApi.getContactByChatId(chatId),
		staleTime: 30000,
	});

	const upsertMutation = useMutation({
		mutationFn: (data: Parameters<typeof whatsappFeaturesApi.upsertContact>[0]) =>
			whatsappFeaturesApi.upsertContact(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['whatsapp', 'contact', chatId] });
			setEditing(false);
		},
	});

	const startEdit = useCallback(() => {
		setForm({
			name: contact?.name || contactName || '',
			email: contact?.email || '',
			company: contact?.company || '',
			notes: contact?.notes || '',
		});
		setEditing(true);
	}, [contact, contactName]);

	const handleSave = useCallback(() => {
		upsertMutation.mutate({
			chatId,
			phone: contactPhone,
			name: form.name || undefined,
			email: form.email || undefined,
			company: form.company || undefined,
			notes: form.notes || undefined,
		});
	}, [chatId, contactPhone, form, upsertMutation]);

	if (isLoading) {
		return (
			<div className={cn('p-3 border-b animate-pulse', t.border)}>
				<div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
				<div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
			</div>
		);
	}

	// No contact yet and not editing — show create prompt
	if (!contact && !editing) {
		return (
			<div className={cn('px-4 py-2 border-b', t.border)}>
				<button
					onClick={() => {
						setForm({ name: contactName || '', email: '', company: '', notes: '' });
						setEditing(true);
					}}
					className={cn(
						'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-dashed transition-colors',
						t.isDark ? 'border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-400' : 'border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-600',
					)}
				>
					<User size={14} />
					Save as CRM contact
				</button>
			</div>
		);
	}

	// Edit mode
	if (editing) {
		return (
			<div className={cn('px-4 py-3 border-b space-y-2', t.border)}>
				<div className="flex items-center justify-between">
					<span className={cn('text-xs font-semibold uppercase tracking-wider', t.textTertiary)}>Contact Details</span>
					<div className="flex gap-1">
						<button onClick={handleSave} disabled={upsertMutation.isPending} className="p-1 rounded text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
							<Save size={14} />
						</button>
						<button onClick={() => setEditing(false)} className={cn('p-1 rounded', t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}>
							<X size={14} className={t.textTertiary} />
						</button>
					</div>
				</div>
				{[
					{ key: 'name', icon: User, placeholder: 'Name', type: 'text' },
					{ key: 'email', icon: Mail, placeholder: 'Email', type: 'email' },
					{ key: 'company', icon: Building, placeholder: 'Company', type: 'text' },
				].map(({ key, icon: Icon, placeholder, type }) => (
					<div key={key} className="flex items-center gap-2">
						<Icon size={12} className={t.textTertiary} />
						<input
							type={type}
							value={form[key as keyof typeof form]}
							onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
							placeholder={placeholder}
							className={cn('flex-1 text-xs px-2 py-1 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400', t.border, t.text)}
						/>
					</div>
				))}
				<div className="flex items-start gap-2">
					<FileText size={12} className={cn('mt-1', t.textTertiary)} />
					<textarea
						value={form.notes}
						onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
						placeholder="Notes..."
						rows={2}
						className={cn('flex-1 text-xs px-2 py-1 rounded border bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-amber-400', t.border, t.text)}
					/>
				</div>
			</div>
		);
	}

	// Display mode — contact exists
	return (
		<div className={cn('px-4 py-2 border-b', t.border)}>
			<div className="flex items-center justify-between mb-1.5">
				<span className={cn('text-[10px] font-semibold uppercase tracking-wider', t.textTertiary)}>CRM Contact</span>
				<button onClick={startEdit} className={cn('p-1 rounded', t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}>
					<Edit size={12} className={t.textTertiary} />
				</button>
			</div>
			<div className="space-y-1">
				{contact.email && (
					<div className="flex items-center gap-1.5 text-[11px]">
						<Mail size={10} className={t.textTertiary} />
						<span className={t.textSecondary}>{contact.email}</span>
					</div>
				)}
				{contact.company && (
					<div className="flex items-center gap-1.5 text-[11px]">
						<Building size={10} className={t.textTertiary} />
						<span className={t.textSecondary}>{contact.company}</span>
					</div>
				)}
				{(contact.totalOrders > 0 || contact.lifetimeValue > 0) && (
					<div className="flex items-center gap-3 text-[11px] mt-1">
						<span className="flex items-center gap-1">
							<ShoppingBag size={10} className="text-amber-500" />
							<span className={t.text}>{contact.totalOrders} orders</span>
						</span>
						<span className="flex items-center gap-1">
							<DollarSign size={10} className="text-green-500" />
							<span className={t.text}>GH₵{contact.lifetimeValue.toFixed(2)}</span>
						</span>
					</div>
				)}
				{contact.notes && (
					<p className={cn('text-[10px] italic mt-1', t.textTertiary)}>
						{contact.notes}
					</p>
				)}
			</div>
		</div>
	);
}
