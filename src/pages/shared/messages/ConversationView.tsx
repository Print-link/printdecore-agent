import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWhatsAppStore } from '../../../stores/whatsappStore';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, ArrowLeft, Spinner, FileText, Download, Reply, X, TickSent, TickDelivered, TickRead, AlertCircle, Clock, Receipt } from '../../../components/icons';
import { Avatar, Button, EmptyState, IconButton } from '../../../components/ui';
import type { WhatsAppMessage, MessageStatus } from '../../../types/whatsapp';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { apiService } from '../../../services/api';
import { whatsappQuoteApi } from '../../../services/api/whatsappQuotes';
import { MessagesSkeleton, ConversationHeaderSkeleton } from './skeletons';
import SendQuoteModal from './SendQuoteModal';
import QuoteTracker from './QuoteTracker';

function MessageStatusTick({ status }: { status?: MessageStatus }) {
	if (!status) return <TickSent size={14} className="text-gray-600" />;

	switch (status) {
		case 'pending':
			return <Clock size={12} className="text-gray-500" />;
		case 'sent':
			return <TickSent size={14} className="text-gray-600" />;
		case 'delivered':
			return <TickDelivered size={14} className="text-gray-600" />;
		case 'read':
			return <TickRead size={14} className="text-blue-500" />;
		case 'failed':
			return <AlertCircle size={14} className="text-red-500" />;
		default:
			return null;
	}
}

interface ConversationViewProps {
	chatId: string;
}

export default function ConversationView({ chatId }: ConversationViewProps) {
	const t = useThemeClasses();
	const {
		chats,
		messages,
		isLoadingMessages,
		typingChats,
		sendMessage,
		reactToMessage,
		sendTypingIndicator,
		stopTypingIndicator,
		loadMessages,
		setSelectedChat,
	} = useWhatsAppStore();

	const isContactTyping = typingChats.has(chatId);
	const [messageText, setMessageText] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [replyingTo, setReplyingTo] = useState<WhatsAppMessage | null>(null);
	const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
	const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
	const [downloadingFile, setDownloadingFile] = useState<Set<string>>(new Set());
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const [showQuoteModal, setShowQuoteModal] = useState(false);

	const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

	/** Fetch file as blob and trigger browser save-to-disk */
	const saveFileToDevice = useCallback(async (url: string, filename: string, messageId: string) => {
		setDownloadingFile(prev => new Set(prev).add(messageId));
		try {
			const response = await fetch(url);
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error('Download failed:', error);
			// Fallback: open in new tab
			window.open(url, '_blank');
		} finally {
			setDownloadingFile(prev => {
				const next = new Set(prev);
				next.delete(messageId);
				return next;
			});
		}
	}, []);

	/** Fetch media on-demand when mediaUrl is missing, then save to device */
	const handleDownloadMedia = useCallback(async (messageId: string, filename?: string) => {
		setLoadingMedia(prev => new Set(prev).add(messageId));
		try {
			const result = await apiService.downloadMessageMedia(messageId);
			if (result?.mediaUrl) {
				// Update the message in the store with the downloaded mediaUrl
				const chatMsgs = messages.get(chatId);
				if (chatMsgs) {
					const updated = chatMsgs.map(m =>
						m.id === messageId ? { ...m, mediaUrl: result.mediaUrl } : m
					);
					const store = useWhatsAppStore.getState();
					store.setMessages(chatId, updated);
				}
				// Also save to device
				await saveFileToDevice(result.mediaUrl, filename || result.filename || 'file', messageId);
			}
		} catch (error) {
			console.error('Failed to download media:', error);
		} finally {
			setLoadingMedia(prev => {
				const next = new Set(prev);
				next.delete(messageId);
				return next;
			});
		}
	}, [chatId, messages, saveFileToDevice]);
	const chat = chats.find((c) => c.id === chatId);

	useEffect(() => {
		if (chatId) {
			loadMessages(chatId);
			setReplyingTo(null);
			setReactionPickerMsgId(null);
		}
	}, [chatId, loadMessages]);

	// Re-render when messages Map reference changes (SSE updates)
	useEffect(() => {
		// Zustand creates new Map references on update, triggering this effect
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

	/** After a quote is created, send its formatted message in the chat */
	const handleQuoteSent = useCallback(async (quoteId: string, messageText: string) => {
		try {
			await sendMessage(chatId, messageText);
		} catch (error) {
			console.error('Failed to send quote message:', error);
		}
	}, [chatId, sendMessage]);

	const handleReply = useCallback((message: WhatsAppMessage) => {
		setReplyingTo(message);
		textareaRef.current?.focus();
	}, []);

	const handleCancelReply = useCallback(() => {
		setReplyingTo(null);
	}, []);

	const handleReact = useCallback((messageId: string, emoji: string) => {
		reactToMessage(chatId, messageId, emoji);
		setReactionPickerMsgId(null);
	}, [chatId, reactToMessage]);

	const handleSend = async () => {
		if (!messageText.trim() || isSending) return;

		const textToSend = messageText.trim();
		const quotedId = replyingTo?.id;
		setMessageText('');
		setReplyingTo(null);
		setIsSending(true);
		stopTypingIndicator(chatId);

		try {
			await sendMessage(chatId, textToSend, quotedId);
		} catch (error) {
			console.error('Failed to send message:', error);
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
		<div className={cn('flex flex-col h-full', t.surfaceInset)}>
			{/* Header */}
			{!chat && isLoadingMessages ? (
				<ConversationHeaderSkeleton />
			) : (
				<div className={cn('px-6 py-4 border-b flex items-center gap-4', t.isDark ? 'bg-gray-800' : 'bg-white', t.border)}>
					<IconButton
						icon={ArrowLeft}
						onClick={() => setSelectedChat(null)}
						label="Back"
					/>
					{chat && (
						<>
							<Avatar
								src={chat.pictureUrl}
								name={chat.name}
								size="md"
							/>
							<div className="flex-1 min-w-0">
								<h3 className={cn('text-base font-semibold', t.text)}>
									{chat.name}
								</h3>
								{isContactTyping ? (
									<p className="text-xs text-amber-500 font-medium animate-pulse">
										typing...
									</p>
								) : chat.isGroup ? (
									<p className={cn('text-xs', t.textSecondary)}>
										Group
									</p>
								) : null}
							</div>
							{/* Send Quote button */}
							{!chat.isGroup && (
								<Button
									variant="primary"
									size="sm"
									icon={Receipt}
									onClick={() => setShowQuoteModal(true)}
								>
									Quote
								</Button>
							)}
						</>
					)}
				</div>
			)}

			{/* Quote Tracker */}
			{chat && !chat.isGroup && <QuoteTracker chatId={chatId} />}

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{isLoadingMessages && chatMessages.length === 0 ? (
					<MessagesSkeleton />
				) : chatMessages.length === 0 ? (
					<EmptyState title="No messages yet" />
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
									<div className={cn(
										'px-3 py-1 rounded-full text-xs font-medium',
										t.isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600',
									)}>
										{dateLabel}
									</div>
								</div>

								{/* Messages for this date */}
								<div className="space-y-2">
									{dateMessages.map((message) => (
										<div
											key={message.id}
											id={`msg-${message.id}`}
											className={cn('flex group transition-all duration-300 rounded-lg', message.isFromMe ? 'justify-end' : 'justify-start')}
										>
											{/* Action buttons — hover, before bubble for sent messages */}
											{message.isFromMe && !message.id.startsWith('temp-') && (
												<div className="self-center flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
													<button
														onClick={() => setReactionPickerMsgId(prev => prev === message.id ? null : message.id)}
														className={cn(
															'p-1.5 rounded-full',
															t.isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400',
														)}
														title="React"
													>
														<span className="text-sm">😊</span>
													</button>
													<button
														onClick={() => handleReply(message)}
														className={cn(
															'p-1.5 rounded-full',
															t.isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400',
														)}
														title="Reply"
													>
														<Reply size={14} />
													</button>
												</div>
											)}

											<div className={`max-w-[70%] ${
												message.isFromMe ? 'items-end' : 'items-start'
											} flex flex-col`}>
												{!message.isFromMe && (
													<span className={cn('text-xs mb-1 px-2', t.textSecondary)}>
														{message.contactName || 'Unknown'}
													</span>
												)}
												<div
													className={cn('px-4 py-2 rounded-lg',
														message.isFromMe
															? 'bg-amber-400 text-gray-900'
															: t.isDark
															? 'bg-gray-700 text-gray-100'
															: 'bg-white text-gray-900 border border-gray-200',
													)}
												>
													{/* Quoted message preview */}
													{message.quotedMessage && (
														<div
															className={cn(
																'mb-2 px-3 py-1.5 rounded border-l-3 text-xs cursor-pointer',
																message.isFromMe
																	? 'bg-amber-500/30 border-l-amber-600'
																	: t.isDark
																	? 'bg-gray-600/50 border-l-amber-400'
																	: 'bg-gray-100 border-l-amber-400',
															)}
															onClick={() => {
																const el = document.getElementById(`msg-${message.quotedMessage!.id}`);
																if (el) {
																	el.scrollIntoView({ behavior: 'smooth', block: 'center' });
																	el.classList.add('ring-2', 'ring-amber-400');
																	setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 1500);
																}
															}}
														>
															<p className={cn('font-semibold mb-0.5',
																message.isFromMe ? 'text-amber-800' : 'text-amber-500',
															)}>
																{message.quotedMessage.isFromMe ? 'You' : (message.quotedMessage.contactName || 'Unknown')}
															</p>
															<p className="line-clamp-2 opacity-80">
																{message.quotedMessage.mediaType && !message.quotedMessage.body
																	? `📎 ${message.quotedMessage.mediaType}`
																	: message.quotedMessage.body}
															</p>
														</div>
													)}
													{message.hasMedia && (
														<div className="mb-2">
															{message.mediaUrl ? (
																<>
																	{/* Video */}
																	{message.mediaType === 'video' && (
																		<div>
																			<video
																				src={message.mediaUrl}
																				controls
																				className="max-w-full rounded-lg"
																				style={{ maxHeight: '300px' }}
																			/>
																			<button
																				onClick={() => saveFileToDevice(message.mediaUrl!, message.mediaFilename || 'video', message.id)}
																				disabled={downloadingFile.has(message.id)}
																				className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
																			>
																				{downloadingFile.has(message.id) ? <Spinner size="xs" /> : <Download size={12} />}
																				{downloadingFile.has(message.id) ? 'Saving...' : 'Download'}
																			</button>
																		</div>
																	)}

																	{/* Audio */}
																	{message.mediaType === 'audio' && (
																		<div>
																			<audio
																				src={message.mediaUrl}
																				controls
																				className="w-full"
																			/>
																			<button
																				onClick={() => saveFileToDevice(message.mediaUrl!, message.mediaFilename || 'audio', message.id)}
																				disabled={downloadingFile.has(message.id)}
																				className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
																			>
																				{downloadingFile.has(message.id) ? <Spinner size="xs" /> : <Download size={12} />}
																				{downloadingFile.has(message.id) ? 'Saving...' : 'Download'}
																			</button>
																		</div>
																	)}

																	{/* Document / PDF */}
																	{(message.mediaType === 'document' || message.mediaType === 'sticker') && (
																		<div className={cn('p-3 rounded-lg border',
																			t.isDark ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-300',
																		)}>
																			<div className="flex items-center gap-3">
																				<FileText size={28} className="flex-shrink-0 text-amber-500" />
																				<div className="flex-1 min-w-0">
																					<p className={cn('text-sm font-medium truncate', t.text)}>
																						{message.mediaFilename || message.body || 'Document'}
																					</p>
																					<button
																						onClick={() => saveFileToDevice(message.mediaUrl!, message.mediaFilename || message.body || 'document', message.id)}
																						disabled={downloadingFile.has(message.id)}
																						className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
																					>
																						{downloadingFile.has(message.id) ? <Spinner size="xs" /> : <Download size={12} />}
																						{downloadingFile.has(message.id) ? 'Saving...' : 'Download'}
																					</button>
																				</div>
																			</div>
																		</div>
																	)}

																	{/* Image (default for image type or no type specified) */}
																	{(!message.mediaType || message.mediaType === 'image') && (
																		<div>
																			<a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
																				<img
																					src={message.mediaUrl}
																					alt="Media"
																					className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
																					style={{ maxHeight: '400px', objectFit: 'contain' }}
																					onError={(e) => {
																						(e.target as HTMLImageElement).style.display = 'none';
																					}}
																				/>
																			</a>
																			<button
																				onClick={() => saveFileToDevice(message.mediaUrl!, message.mediaFilename || 'image', message.id)}
																				disabled={downloadingFile.has(message.id)}
																				className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
																			>
																				{downloadingFile.has(message.id) ? <Spinner size="xs" /> : <Download size={12} />}
																				{downloadingFile.has(message.id) ? 'Saving...' : 'Download'}
																			</button>
																		</div>
																	)}
																</>
															) : (
																<div className={cn('p-3 rounded-lg border',
																	t.isDark ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-300',
																)}>
																	<div className="flex items-center gap-3">
																		<FileText size={28} className="flex-shrink-0 text-amber-500" />
																		<div className="flex-1 min-w-0">
																			<p className={cn('text-sm font-medium truncate', t.text)}>
																				{message.mediaFilename || message.body || 'Media'}
																			</p>
																			{loadingMedia.has(message.id) ? (
																				<p className={cn('text-xs mt-1', t.textSecondary)}>
																					<Spinner size="xs" className="inline-block mr-1" />
																					Downloading...
																				</p>
																			) : (
																				<button
																					onClick={() => handleDownloadMedia(message.id)}
																					className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1 bg-transparent border-none cursor-pointer p-0"
																				>
																					<Download size={12} />
																					Download media
																				</button>
																			)}
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
														className={cn('text-xs mt-1 flex items-center gap-1',
															message.isFromMe
																? 'text-gray-700 justify-end'
																: t.textSecondary,
														)}
													>
														{formatMessageTime(message.timestamp)}
														{message.isFromMe && (
															<MessageStatusTick status={message.status} />
														)}
													</span>
												</div>

												{/* Reactions display */}
												{message.reactions && message.reactions.length > 0 && (
													<div className={cn(
														'flex flex-wrap gap-1 mt-1',
														message.isFromMe ? 'justify-end' : 'justify-start',
													)}>
														{(() => {
															// Group reactions by emoji
															const grouped = new Map<string, number>();
															for (const r of message.reactions) {
																grouped.set(r.emoji, (grouped.get(r.emoji) || 0) + 1);
															}
															return Array.from(grouped.entries()).map(([emoji, count]) => (
																<button
																	key={emoji}
																	onClick={() => handleReact(message.id, message.reactions!.some(r => r.isFromMe && r.emoji === emoji) ? '' : emoji)}
																	className={cn(
																		'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
																		message.reactions!.some(r => r.isFromMe && r.emoji === emoji)
																			? 'border-amber-400 bg-amber-400/20'
																			: t.isDark
																			? 'border-gray-600 bg-gray-700/50 hover:bg-gray-600'
																			: 'border-gray-200 bg-white hover:bg-gray-50',
																	)}
																>
																	{emoji}{count > 1 && <span className={t.textSecondary}>{count}</span>}
																</button>
															));
														})()}
													</div>
												)}

												{/* Reaction picker */}
												{reactionPickerMsgId === message.id && (
													<div className={cn(
														'flex items-center gap-1 px-2 py-1.5 rounded-full shadow-lg border mt-1',
														message.isFromMe ? 'ml-auto' : 'mr-auto',
														t.isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
													)}>
														{QUICK_REACTIONS.map((emoji) => (
															<button
																key={emoji}
																onClick={() => handleReact(message.id, emoji)}
																className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-transform hover:scale-125"
															>
																{emoji}
															</button>
														))}
													</div>
												)}
											</div>

											{/* Action buttons — hover, after bubble for received messages */}
											{!message.isFromMe && !message.id.startsWith('temp-') && (
												<div className="self-center flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
													<button
														onClick={() => handleReply(message)}
														className={cn(
															'p-1.5 rounded-full',
															t.isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400',
														)}
														title="Reply"
													>
														<Reply size={14} />
													</button>
													<button
														onClick={() => setReactionPickerMsgId(prev => prev === message.id ? null : message.id)}
														className={cn(
															'p-1.5 rounded-full',
															t.isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400',
														)}
														title="React"
													>
														<span className="text-sm">😊</span>
													</button>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Reply bar */}
			{replyingTo && (
				<div className={cn('px-4 pt-2 border-t', t.isDark ? 'bg-gray-800' : 'bg-white', t.border)}>
					<div className={cn(
						'flex items-center gap-3 px-3 py-2 rounded-lg border-l-3',
						t.isDark
							? 'bg-gray-700/60 border-l-amber-400'
							: 'bg-gray-100 border-l-amber-400',
					)}>
						<Reply size={14} className="text-amber-500 flex-shrink-0" />
						<div className="flex-1 min-w-0">
							<p className="text-xs font-semibold text-amber-500">
								{replyingTo.isFromMe ? 'You' : (replyingTo.contactName || 'Unknown')}
							</p>
							<p className={cn('text-xs truncate', t.textSecondary)}>
								{replyingTo.hasMedia && !replyingTo.body
									? `📎 ${replyingTo.mediaType || 'Media'}`
									: replyingTo.body}
							</p>
						</div>
						<button
							onClick={handleCancelReply}
							className={cn('p-1 rounded-full flex-shrink-0', t.isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200')}
						>
							<X size={14} className={t.textSecondary} />
						</button>
					</div>
				</div>
			)}

			{/* Input */}
			<div className={cn('px-4 py-3', !replyingTo && 'border-t', t.isDark ? 'bg-gray-800' : 'bg-white', !replyingTo && t.border)}>
				<div className="flex items-end gap-2">
					<textarea
						ref={textareaRef}
						value={messageText}
						onChange={(e) => {
							setMessageText(e.target.value);
							if (e.target.value.trim()) {
								sendTypingIndicator(chatId);
							}
						}}
						onKeyDown={handleKeyPress}
						placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
						rows={1}
						className={cn(
							'flex-1 px-4 py-2 rounded-lg text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-amber-400',
							t.input,
						)}
						style={{ maxHeight: '120px' }}
					/>
					<Button
						onClick={handleSend}
						disabled={!messageText.trim() || isSending}
						loading={isSending}
						icon={isSending ? undefined : Send}
						variant={!messageText.trim() || isSending ? 'secondary' : 'primary'}
						className="p-2"
					/>
				</div>
			</div>

			{/* Send Quote Modal */}
			{chat && !chat.isGroup && (
				<SendQuoteModal
					open={showQuoteModal}
					onClose={() => setShowQuoteModal(false)}
					chatId={chatId}
					contactPhone={chatId.replace('@s.whatsapp.net', '').replace('@c.us', '')}
					contactName={chat.name}
					businessPhoneNumber=""
					onQuoteSent={handleQuoteSent}
				/>
			)}
		</div>
	);
}
