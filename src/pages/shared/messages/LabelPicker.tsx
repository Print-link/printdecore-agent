import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappFeaturesApi, type WhatsAppLabel, type ChatLabel } from '../../../services/api/whatsappFeatures';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { Plus, Check, X } from '../../../components/icons';

interface LabelPickerProps {
	chatId: string;
	compact?: boolean; // inline badge row vs dropdown
}

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6'];

export default function LabelPicker({ chatId, compact }: LabelPickerProps) {
	const t = useThemeClasses();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [newName, setNewName] = useState('');
	const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
	const [creating, setCreating] = useState(false);

	// Fetch all labels
	const { data: labels = [] } = useQuery<WhatsAppLabel[]>({
		queryKey: ['whatsapp', 'labels'],
		queryFn: () => whatsappFeaturesApi.getLabels(),
		staleTime: 60000,
	});

	// Fetch labels for this chat
	const { data: chatLabels = [] } = useQuery<ChatLabel[]>({
		queryKey: ['whatsapp', 'chatLabels', chatId],
		queryFn: () => whatsappFeaturesApi.getChatLabels(chatId),
		staleTime: 30000,
	});

	const assignedIds = new Set(chatLabels.map(cl => cl.labelId));

	const toggleLabel = useCallback(async (labelId: string) => {
		try {
			if (assignedIds.has(labelId)) {
				await whatsappFeaturesApi.removeLabelFromChat(chatId, labelId);
			} else {
				await whatsappFeaturesApi.assignLabel(chatId, labelId);
			}
			queryClient.invalidateQueries({ queryKey: ['whatsapp', 'chatLabels', chatId] });
			queryClient.invalidateQueries({ queryKey: ['whatsapp', 'labels'] });
		} catch {
			// Silently fail — plan guard will return 403 which UI should handle
		}
	}, [chatId, assignedIds, queryClient]);

	const handleCreate = useCallback(async () => {
		if (!newName.trim()) return;
		setCreating(true);
		try {
			const label = await whatsappFeaturesApi.createLabel(newName.trim(), newColor);
			setNewName('');
			queryClient.invalidateQueries({ queryKey: ['whatsapp', 'labels'] });
			// Auto-assign the new label
			await whatsappFeaturesApi.assignLabel(chatId, label.id);
			queryClient.invalidateQueries({ queryKey: ['whatsapp', 'chatLabels', chatId] });
		} catch {
			// Plan limit or duplicate
		} finally {
			setCreating(false);
		}
	}, [newName, newColor, chatId, queryClient]);

	// ─── Both compact and full mode share the same dropdown ──────────

	return (
		<div className="relative">
			{/* Assigned badges + toggle button */}
			<div className="flex items-center gap-1 flex-wrap">
				{chatLabels.map(cl => (
					compact ? (
						<button
							key={cl.labelId}
							onClick={() => setOpen(!open)}
							className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white hover:opacity-80 transition-opacity cursor-pointer"
							style={{ backgroundColor: cl.labelColor }}
							title="Manage labels"
						>
							{cl.labelName}
						</button>
					) : (
						<button
							key={cl.labelId}
							onClick={() => toggleLabel(cl.labelId)}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white hover:opacity-80 transition-opacity"
							style={{ backgroundColor: cl.labelColor }}
							title={`Remove "${cl.labelName}"`}
						>
							{cl.labelName}
							<X size={8} />
						</button>
					)
				))}
				<button
					onClick={() => setOpen(!open)}
					className={cn(
						'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-dashed transition-colors',
						t.isDark ? 'border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-400' : 'border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-600',
					)}
				>
					<Plus size={10} />
					{chatLabels.length === 0 ? 'Add Label' : ''}
				</button>
			</div>

			{/* Dropdown */}
			{open && (
				<div className={cn(
					'absolute top-full left-0 mt-1 w-56 rounded-lg border shadow-lg z-50 overflow-hidden',
					t.isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
				)}>
					{/* Existing labels */}
					<div className="max-h-48 overflow-y-auto p-1">
						{labels.length === 0 ? (
							<p className={cn('text-xs text-center py-3', t.textTertiary)}>No labels yet</p>
						) : (
							labels.map(label => (
								<button
									key={label.id}
									onClick={() => toggleLabel(label.id)}
									className={cn(
										'w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors',
										t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
									)}
								>
									<span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
									<span className={cn('flex-1 text-left', t.text)}>{label.name}</span>
									{assignedIds.has(label.id) && <Check size={14} className="text-green-500" />}
									{label.chatCount !== undefined && (
										<span className={cn('text-[10px]', t.textTertiary)}>{label.chatCount}</span>
									)}
								</button>
							))
						)}
					</div>

					{/* Create new */}
					<div className={cn('border-t p-2', t.border)}>
						<div className="flex items-center gap-1.5">
							{/* Color picker */}
							<div className="flex gap-1">
								{PRESET_COLORS.slice(0, 4).map(c => (
									<button
										key={c}
										onClick={() => setNewColor(c)}
										className={cn('w-4 h-4 rounded-full transition-transform', newColor === c && 'ring-2 ring-offset-1 ring-amber-400 scale-110')}
										style={{ backgroundColor: c }}
									/>
								))}
							</div>
							<input
								value={newName}
								onChange={e => setNewName(e.target.value)}
								onKeyDown={e => e.key === 'Enter' && handleCreate()}
								placeholder="New label..."
								className={cn('flex-1 px-2 py-1 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-amber-400', t.input)}
							/>
							<button
								onClick={handleCreate}
								disabled={!newName.trim() || creating}
								className="px-2 py-1 bg-amber-400 text-gray-900 rounded text-xs font-medium disabled:opacity-50"
							>
								Add
							</button>
						</div>
					</div>

					{/* Close */}
					<button
						onClick={() => setOpen(false)}
						className={cn('w-full text-center text-[10px] py-1.5 border-t', t.border, t.textTertiary, 'hover:bg-gray-50 dark:hover:bg-gray-700')}
					>
						Close
					</button>
				</div>
			)}
		</div>
	);
}
