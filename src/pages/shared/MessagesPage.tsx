import { useState, useEffect } from 'react';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle } from '../../components/icons';
import { Card, Avatar, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import ConversationView from './messages/ConversationView';
import { ChatListSkeleton, SyncingBanner } from './messages/skeletons';

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
	} = useWhatsAppStore();
	const [searchQuery, setSearchQuery] = useState('');

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

	const filteredChats = chats.filter((chat) =>
		chat.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const totalUnreadCount = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

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
										className={cn(
											'w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
											isSelected && (t.isDark ? 'bg-gray-700' : 'bg-amber-50')
										)}
									>
										<div className="flex items-start gap-3">
											<Avatar src={chat.pictureUrl} name={chat.name} size="lg" className="flex-shrink-0" />

											{/* Chat Info */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<h3 className={cn('text-sm font-semibold truncate', t.text)}>
														{chat.name}
													</h3>
													{chat.lastMessage && (
														<span className={cn('text-xs flex-shrink-0 ml-2', t.textSecondary)}>
															{formatDistanceToNow(new Date(chat.lastMessage.timestamp), {
																addSuffix: true,
															})}
														</span>
													)}
												</div>
												<div className="flex items-center justify-between">
													<p className={cn(
														'text-sm truncate',
														chat.unreadCount > 0
															? cn(t.text, 'font-semibold')
															: t.textSecondary
													)}>
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
