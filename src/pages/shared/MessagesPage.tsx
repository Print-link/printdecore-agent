import { useState, useEffect, useCallback } from 'react';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle, Pin, Archive, ArchiveRestore, BellOff, Bell, PinSlash } from '../../components/icons';
import { Card, Avatar, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import ConversationView from './messages/ConversationView';
import { ChatListSkeleton, SyncingBanner } from './messages/skeletons';
import type { WhatsAppChat } from '../../types/whatsapp';

export default function MessagesPage() {
	const t = useThemeClasses();
	const {
		isConnected,
		isSyncingChats,
		chats,
		selectedChatId,
		setSelectedChat,
		loadChats,
		loadMessages,
		markAsRead,
		pinChat,
		archiveChat,
		muteChat,
	} = useWhatsAppStore();
	const [searchQuery, setSearchQuery] = useState('');
	const [showArchived, setShowArchived] = useState(false);
	const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);

	useEffect(() => {
		if (isConnected) {
			loadChats(); // Load once — SSE handles real-time updates
		}
	}, [isConnected, loadChats]);

	useEffect(() => {
		if (selectedChatId) {
			loadMessages(selectedChatId);
			markAsRead(selectedChatId);
		}
	}, [selectedChatId, loadMessages, markAsRead]);

	const handleContextMenu = useCallback((e: React.MouseEvent, chatId: string) => {
		e.preventDefault();
		setContextMenu({ chatId, x: e.clientX, y: e.clientY });
	}, []);

	// Close context menu on click anywhere
	useEffect(() => {
		if (!contextMenu) return;
		const close = () => setContextMenu(null);
		window.addEventListener('click', close);
		return () => window.removeEventListener('click', close);
	}, [contextMenu]);

	const filteredChats = chats
		.filter((chat) => {
			// Filter by archived state
			if (showArchived) return chat.isArchived;
			if (chat.isArchived) return false;
			// Filter by search
			return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
		})
		// Sort: pinned first, then by last message time
		.sort((a, b) => {
			if (a.isPinned && !b.isPinned) return -1;
			if (!a.isPinned && b.isPinned) return 1;
			return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
		});

	const archivedCount = chats.filter(c => c.isArchived).length;
	const totalUnreadCount = chats.filter(c => !c.isArchived).reduce((sum, chat) => sum + chat.unreadCount, 0);

	if (!isConnected) {
		return (
			<div className={cn('h-full flex items-center justify-center', t.surfaceInset)}>
				<Card className="text-center p-8">
					<MessageCircle size={48} className={cn('mx-auto mb-4', t.textSecondary)} />
					<h2 className={cn('text-xl font-semibold mb-2', t.text)}>WhatsApp Not Connected</h2>
					<p className={cn('text-sm mb-4', t.textSecondary)}>
						Please connect your WhatsApp account in Settings to start messaging.
					</p>
				</Card>
			</div>
		);
	}

	return (
		<div className={cn('flex h-full overflow-hidden', t.surfaceInset)}>
			{/* Chat List Sidebar */}
			<div className={cn('w-80 border-r flex flex-col', t.isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
				{/* Header */}
				<div className={cn('p-4 border-b', t.border)}>
					<h2 className={cn('text-lg font-semibold mb-3', t.text)}>
						Messages
						{totalUnreadCount > 0 && (
							<span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
								{totalUnreadCount}
							</span>
						)}
					</h2>
					{/* Search */}
					<div className="relative">
						<Search size={16} className={cn('absolute left-3 top-1/2 transform -translate-y-1/2', t.textSecondary)} />
						<input
							type="text"
							placeholder="Search conversations..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={cn(
								'w-full pl-10 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-400',
								t.isDark
									? 'bg-gray-700 text-gray-100 placeholder-gray-400 border-gray-600'
									: 'bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-200'
							)}
						/>
					</div>
				</div>

				{/* Filter tabs */}
				{archivedCount > 0 && (
					<div className={cn('flex border-b', t.border)}>
						<button
							onClick={() => setShowArchived(false)}
							className={cn(
								'flex-1 py-2 text-xs font-medium transition-colors',
								!showArchived ? 'text-amber-500 border-b-2 border-amber-400' : t.textSecondary,
							)}
						>
							All Chats
						</button>
						<button
							onClick={() => setShowArchived(true)}
							className={cn(
								'flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
								showArchived ? 'text-amber-500 border-b-2 border-amber-400' : t.textSecondary,
							)}
						>
							Archived
							<span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', t.isDark ? 'bg-gray-700' : 'bg-gray-200')}>
								{archivedCount}
							</span>
						</button>
					</div>
				)}

				{/* Chat List */}
				<div className="flex-1 overflow-y-auto">
					{/* Syncing banner */}
					{isSyncingChats && chats.length > 0 && <SyncingBanner />}

					{/* States: skeleton → empty → list */}
					{chats.length === 0 && isSyncingChats ? (
						<ChatListSkeleton />
					) : filteredChats.length === 0 ? (
						<div className={cn('p-8 text-center', t.textSecondary)}>
							<p className="text-sm">{searchQuery ? 'No conversations found' : 'No conversations yet'}</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredChats.map((chat) => {
								const isSelected = selectedChatId === chat.id;
								return (
									<button
										key={chat.id}
										onClick={() => setSelectedChat(chat.id)}
										onContextMenu={(e) => handleContextMenu(e, chat.id)}
										className={cn(
											'w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
											isSelected && (t.isDark ? 'bg-gray-700' : 'bg-amber-50'),
										)}
									>
										<div className="flex items-start gap-3">
											<Avatar src={chat.pictureUrl} name={chat.name} size="lg" className="flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<div className="flex items-center gap-1 min-w-0">
														<h3 className={cn('text-sm font-semibold truncate', t.text)}>{chat.name}</h3>
														{chat.isMuted && <BellOff size={12} className={t.textTertiary} />}
													</div>
													<div className="flex items-center gap-1 flex-shrink-0 ml-2">
														{chat.isPinned && <Pin size={12} className="text-amber-500" />}
														{chat.lastMessage && (
															<span className={cn('text-xs', t.textSecondary)}>
																{formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
															</span>
														)}
													</div>
												</div>
												<div className="flex items-center justify-between">
													<p className={cn('text-sm truncate', chat.unreadCount > 0 ? cn(t.text, 'font-semibold') : t.textSecondary)}>
														{chat.lastMessage?.body || 'No messages'}
													</p>
													{chat.unreadCount > 0 && (
														<span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 bg-amber-400 text-gray-900">
															{chat.unreadCount}
														</span>
													)}
												</div>
											</div>
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* Context Menu */}
			{contextMenu && (() => {
				const chat = chats.find(c => c.id === contextMenu.chatId);
				if (!chat) return null;
				const items = [
					{ label: chat.isPinned ? 'Unpin' : 'Pin', icon: chat.isPinned ? PinSlash : Pin, action: () => pinChat(chat.id, !chat.isPinned) },
					{ label: chat.isArchived ? 'Unarchive' : 'Archive', icon: chat.isArchived ? ArchiveRestore : Archive, action: () => archiveChat(chat.id, !chat.isArchived) },
					{ label: chat.isMuted ? 'Unmute' : 'Mute', icon: chat.isMuted ? Bell : BellOff, action: () => muteChat(chat.id, !chat.isMuted) },
				];
				return (
					<div
						className={cn('fixed z-50 rounded-lg shadow-xl border py-1 min-w-[160px]', t.isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}
						style={{ top: contextMenu.y, left: contextMenu.x }}
						onClick={(e) => e.stopPropagation()}
					>
						{items.map((item) => (
							<button
								key={item.label}
								onClick={() => { item.action(); setContextMenu(null); }}
								className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors', t.isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700')}
							>
								<item.icon size={16} className={t.textSecondary} />
								{item.label}
							</button>
						))}
					</div>
				);
			})()}

			{/* Conversation View */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{selectedChatId ? (
					<ConversationView chatId={selectedChatId} />
				) : (
					<div className={cn('flex-1 flex items-center justify-center', t.surfaceInset)}>
						<EmptyState
							icon={MessageCircle}
							title="Select a conversation to start messaging"
						/>
					</div>
				)}
			</div>
		</div>
	);
}
