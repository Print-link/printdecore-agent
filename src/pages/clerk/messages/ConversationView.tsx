import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useWhatsAppStore } from '../../../stores/whatsappStore';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, Loader2, ArrowLeft } from 'lucide-react';

interface ConversationViewProps {
	chatId: string;
}

export default function ConversationView({ chatId }: ConversationViewProps) {
	const { theme } = useTheme();
	const {
		chats,
		messages,
		sendMessage,
		loadMessages,
		setSelectedChat,
	} = useWhatsAppStore();
	const [messageText, setMessageText] = useState('');
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const chat = chats.find((c) => c.id === chatId);

	useEffect(() => {
		if (chatId) {
			loadMessages(chatId); // Force refresh when chat changes
		}
	}, [chatId, loadMessages]);

	// Also listen for new messages for this specific chat
	useEffect(() => {
		// This effect ensures we reload messages when the messages Map changes
		// and this chat has new messages
		const currentMessages = messages.get(chatId) || [];
		// Force a re-render by checking message count
		// The component will re-render when messages Map reference changes
	}, [messages, chatId]);

	// Get messages for current chat - useMemo ensures we get a new reference when messages change
	const chatMessages = useMemo(() => {
		return messages.get(chatId) || [];
	}, [messages, chatId]);
	
	// Track previous message count to detect new messages
	const prevMessageCountRef = useRef(chatMessages.length);

	// Watch for new messages in the current chat
	useEffect(() => {
		const currentCount = chatMessages.length;
		const prevCount = prevMessageCountRef.current;
		
		// If message count increased, scroll to bottom
		if (currentCount > prevCount && currentCount > 0) {
			// Small delay to ensure DOM is updated
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
			}, 100);
		}
		
		// Update ref
		prevMessageCountRef.current = currentCount;
	}, [chatMessages.length, chatId, messages]); // Include messages Map to detect updates

	const handleSend = async () => {
		if (!messageText.trim() || isSending) return;

		const textToSend = messageText.trim();
		setMessageText('');
		setIsSending(true);
		
		try {
			await sendMessage(chatId, textToSend);
			// Reload messages to ensure we have the latest
			setTimeout(() => {
				loadMessages(chatId);
			}, 500);
		} catch (error) {
			console.error('Failed to send message:', error);
			// Restore message text on error
			setMessageText(textToSend);
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const formatMessageTime = (timestamp: number) => {
		const date = new Date(timestamp);
		if (isToday(date)) {
			return format(date, 'HH:mm');
		} else if (isYesterday(date)) {
			return 'Yesterday ' + format(date, 'HH:mm');
		} else {
			return format(date, 'MMM d, HH:mm');
		}
	};

	const groupMessagesByDate = (messages: typeof chatMessages) => {
		const groups: { [key: string]: typeof chatMessages } = {};
		
		messages.forEach((message) => {
			const date = new Date(message.timestamp);
			const dateKey = format(date, 'yyyy-MM-dd');
			
			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(message);
		});

		return groups;
	};

	const messageGroups = groupMessagesByDate(chatMessages);

	return (
		<div className={`flex flex-col h-full ${
			theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
		}`}>
			{/* Header */}
			<div className={`px-6 py-4 border-b flex items-center gap-4 ${
				theme === 'dark' 
					? 'bg-gray-800 border-gray-700' 
					: 'bg-white border-gray-200'
			}`}>
				<button
					onClick={() => setSelectedChat(null)}
					className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
						theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
					}`}
				>
					<ArrowLeft size={20} />
				</button>
				{chat && (
					<>
						<div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
							theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
						}`}>
							{chat.pictureUrl ? (
								<img
									src={chat.pictureUrl}
									alt={chat.name}
									className="w-10 h-10 rounded-full object-cover"
								/>
							) : (
								<span className={`text-base font-semibold ${
									theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
								}`}>
									{chat.name.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<h3 className={`text-base font-semibold ${
								theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
							}`}>
								{chat.name}
							</h3>
							{chat.isGroup && (
								<p className={`text-xs ${
									theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
								}`}>
									Group
								</p>
							)}
						</div>
					</>
				)}
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{chatMessages.length === 0 ? (
					<div className={`text-center py-8 ${
						theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
					}`}>
						<p className="text-sm">No messages yet</p>
					</div>
				) : (
					Object.entries(messageGroups).map(([dateKey, dateMessages]) => {
						const date = new Date(dateKey);
						const dateLabel = isToday(date)
							? 'Today'
							: isYesterday(date)
							? 'Yesterday'
							: format(date, 'MMMM d, yyyy');

						return (
							<div key={dateKey}>
								{/* Date Separator */}
								<div className="flex items-center justify-center my-4">
									<div className={`px-3 py-1 rounded-full text-xs font-medium ${
										theme === 'dark'
											? 'bg-gray-700 text-gray-300'
											: 'bg-gray-200 text-gray-600'
									}`}>
										{dateLabel}
									</div>
								</div>

								{/* Messages for this date */}
								<div className="space-y-2">
									{dateMessages.map((message) => (
										<div
											key={message.id}
											className={`flex ${
												message.isFromMe ? 'justify-end' : 'justify-start'
											}`}
										>
											<div className={`max-w-[70%] ${
												message.isFromMe ? 'items-end' : 'items-start'
											} flex flex-col`}>
												{!message.isFromMe && (
													<span className={`text-xs mb-1 px-2 ${
														theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
													}`}>
														{message.contactName || 'Unknown'}
													</span>
												)}
												<div
													className={`px-4 py-2 rounded-lg ${
														message.isFromMe
															? theme === 'dark'
																? 'bg-amber-400 text-gray-900'
																: 'bg-amber-400 text-gray-900'
															: theme === 'dark'
															? 'bg-gray-700 text-gray-100'
															: 'bg-white text-gray-900 border border-gray-200'
													}`}
												>
													{message.hasMedia && (
														<div className="mb-2">
															{message.mediaUrl ? (
																// Media downloaded successfully
																message.mediaUrl.startsWith('data:video/') ? (
																	<video
																		src={message.mediaUrl}
																		controls
																		className="max-w-full rounded-lg"
																		style={{ maxHeight: '300px' }}
																	/>
																) : message.mediaUrl.startsWith('data:audio/') ? (
																	<audio
																		src={message.mediaUrl}
																		controls
																		className="w-full"
																	/>
																) : message.mediaUrl.startsWith('data:application/') || 
																	  message.mediaUrl.includes('octet-stream') ||
																	  message.mediaUrl.includes('pdf') ||
																	  message.mediaUrl.includes('document') ? (
																	<div className={`p-3 rounded-lg border ${
																		theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-300'
																	}`}>
																		<div className="flex items-center gap-2">
																			<svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
																			</svg>
																			<div className="flex-1 min-w-0">
																				<p className={`text-sm font-medium truncate ${
																					theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
																				}`}>
																					{message.body || 'Document'}
																				</p>
																				<a
																					href={message.mediaUrl}
																					download={message.body || 'document'}
																					className="text-xs text-amber-400 hover:underline inline-block mt-1"
																				>
																					Download
																				</a>
																			</div>
																		</div>
																	</div>
																) : (
																	<img
																		src={message.mediaUrl}
																		alt="Media"
																		className="max-w-full rounded-lg"
																		style={{ maxHeight: '400px', objectFit: 'contain' }}
																		onError={(e) => {
																			console.error('Error loading media image:', e);
																			(e.target as HTMLImageElement).style.display = 'none';
																		}}
																	/>
																)
															) : (
																// Media download failed or in progress - show document info anyway
																<div className={`p-3 rounded-lg border ${
																	theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-300'
																}`}>
																	<div className="flex items-center gap-2">
																		<svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
																		</svg>
																		<div className="flex-1 min-w-0">
																			<p className={`text-sm font-medium truncate ${
																				theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
																			}`}>
																				{message.body || 'Document'}
																			</p>
																			<p className={`text-xs mt-1 ${
																				theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
																			}`}>
																				Download unavailable
																			</p>
																		</div>
																	</div>
																</div>
															)}
														</div>
													)}
													{/* Show message body - hide if it's just "Document" and we're showing media */}
													{!(message.hasMedia && message.body === 'Document') && (
														<p className="text-sm whitespace-pre-wrap break-words">
															{message.body}
														</p>
													)}
													<span
														className={`text-xs mt-1 block ${
															message.isFromMe
																? 'text-gray-700'
																: theme === 'dark'
																? 'text-gray-400'
																: 'text-gray-500'
														}`}
													>
														{formatMessageTime(message.timestamp)}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className={`px-4 py-3 border-t ${
				theme === 'dark' 
					? 'bg-gray-800 border-gray-700' 
					: 'bg-white border-gray-200'
			}`}>
				<div className="flex items-end gap-2">
					<textarea
						value={messageText}
						onChange={(e) => setMessageText(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="Type a message..."
						rows={1}
						className={`flex-1 px-4 py-2 rounded-lg text-sm resize-none ${
							theme === 'dark'
								? 'bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600'
								: 'bg-gray-100 text-gray-900 placeholder-gray-500 border border-gray-200'
						} focus:outline-none focus:ring-2 focus:ring-amber-400`}
						style={{ maxHeight: '120px' }}
					/>
					<button
						onClick={handleSend}
						disabled={!messageText.trim() || isSending}
						className={`p-2 rounded-lg transition-colors ${
							!messageText.trim() || isSending
								? theme === 'dark'
									? 'bg-gray-700 text-gray-500 cursor-not-allowed'
									: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								: 'bg-amber-400 hover:bg-amber-500 text-gray-900'
						}`}
					>
						{isSending ? (
							<Loader2 size={20} className="animate-spin" />
						) : (
							<Send size={20} />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
