import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle } from 'lucide-react';
import ConversationView from './messages/ConversationView';

export default function MessagesPage() {
	const { theme } = useTheme();
	const {
		isConnected,
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
			<div className={`h-full flex items-center justify-center ${
				theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
			}`}>
				<div className={`text-center p-8 rounded-lg ${
					theme === 'dark' 
						? 'bg-gray-800 border border-gray-700' 
						: 'bg-white border border-gray-200'
				}`}>
					<MessageCircle 
						size={48} 
						className={`mx-auto mb-4 ${
							theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
						}`}
					/>
					<h2 className={`text-xl font-semibold mb-2 ${
						theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
					}`}>
						WhatsApp Not Connected
					</h2>
					<p className={`text-sm mb-4 ${
						theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
					}`}>
						Please connect your WhatsApp account in Settings to start messaging.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`flex h-full overflow-hidden ${
			theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
		}`}>
			{/* Chat List Sidebar */}
			<div className={`w-80 border-r flex flex-col ${
				theme === 'dark' 
					? 'bg-gray-800 border-gray-700' 
					: 'bg-white border-gray-200'
			}`}>
				{/* Header */}
				<div className={`p-4 border-b ${
					theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
				}`}>
					<h2 className={`text-lg font-semibold mb-3 ${
						theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
					}`}>
						Messages
						{totalUnreadCount > 0 && (
							<span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
								theme === 'dark'
									? 'bg-amber-400 text-gray-900'
									: 'bg-amber-400 text-gray-900'
							}`}>
								{totalUnreadCount}
							</span>
						)}
					</h2>
					{/* Search */}
					<div className="relative">
						<Search 
							size={16} 
							className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
								theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
							}`}
						/>
						<input
							type="text"
							placeholder="Search conversations..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${
								theme === 'dark'
									? 'bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600'
									: 'bg-gray-100 text-gray-900 placeholder-gray-500 border border-gray-200'
							} focus:outline-none focus:ring-2 focus:ring-amber-400`}
						/>
					</div>
				</div>

				{/* Chat List */}
				<div className="flex-1 overflow-y-auto">
					{filteredChats.length === 0 ? (
						<div className={`p-8 text-center ${
							theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
						}`}>
							{searchQuery ? (
								<p className="text-sm">No conversations found</p>
							) : (
								<p className="text-sm">No conversations yet</p>
							)}
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredChats.map((chat) => {
								const isSelected = selectedChatId === chat.id;
								return (
									<button
										key={chat.id}
										onClick={() => setSelectedChat(chat.id)}
										className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
											isSelected
												? theme === 'dark'
													? 'bg-gray-700'
													: 'bg-amber-50'
												: ''
										}`}
									>
										<div className="flex items-start gap-3">
											{/* Avatar */}
											<div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
												theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
											}`}>
												{chat.pictureUrl ? (
													<img
														src={chat.pictureUrl}
														alt={chat.name}
														className="w-12 h-12 rounded-full object-cover"
													/>
												) : (
													<span className={`text-lg font-semibold ${
														theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
													}`}>
														{chat.name.charAt(0).toUpperCase()}
													</span>
												)}
											</div>

											{/* Chat Info */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<h3 className={`text-sm font-semibold truncate ${
														theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
													}`}>
														{chat.name}
													</h3>
													{chat.lastMessage && (
														<span className={`text-xs flex-shrink-0 ml-2 ${
															theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
														}`}>
															{formatDistanceToNow(new Date(chat.lastMessage.timestamp), {
																addSuffix: true,
															})}
														</span>
													)}
												</div>
												<div className="flex items-center justify-between">
													<p className={`text-sm truncate ${
														chat.unreadCount > 0
															? theme === 'dark'
																? 'text-gray-100 font-semibold'
																: 'text-gray-900 font-semibold'
															: theme === 'dark'
															? 'text-gray-400'
															: 'text-gray-600'
													}`}>
														{chat.lastMessage?.body || 'No messages'}
													</p>
													{chat.unreadCount > 0 && (
														<span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
															theme === 'dark'
																? 'bg-amber-400 text-gray-900'
																: 'bg-amber-400 text-gray-900'
														}`}>
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
					<div className={`flex-1 flex items-center justify-center ${
						theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
					}`}>
						<div className="text-center">
							<MessageCircle 
								size={48} 
								className={`mx-auto mb-4 ${
									theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
								}`}
							/>
							<p className={`text-sm ${
								theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
							}`}>
								Select a conversation to start messaging
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
