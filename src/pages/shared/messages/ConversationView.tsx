import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWhatsAppStore } from '../../../stores/whatsappStore';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, ArrowLeft, Spinner, FileText, Download } from '../../../components/icons';
import { Avatar, Button, EmptyState, IconButton } from '../../../components/ui';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';
import { apiService } from '../../../services/api';
import { MessagesSkeleton, ConversationHeaderSkeleton } from './skeletons';

interface ConversationViewProps {
	chatId: string;
}

export default function ConversationView({ chatId }: ConversationViewProps) {
	const t = useThemeClasses();
	const {
		chats,
		messages,
		isLoadingMessages,
		sendMessage,
		loadMessages,
		setSelectedChat,
	} = useWhatsAppStore();
	const [messageText, setMessageText] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
	const [downloadingFile, setDownloadingFile] = useState<Set<string>>(new Set());
	const messagesEndRef = useRef<HTMLDivElement>(null);

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
			loadMessages(chatId); // Force refresh when chat changes
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

	const handleSend = async () => {
		if (!messageText.trim() || isSending) return;

		const textToSend = messageText.trim();
		setMessageText('');
		setIsSending(true);

		try {
			await sendMessage(chatId, textToSend);
			// Messages update via optimistic update + SSE — no manual reload needed
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
								{chat.isGroup && (
									<p className={cn('text-xs', t.textSecondary)}>
										Group
									</p>
								)}
							</div>
						</>
					)}
				</div>
			)}

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
											className={`flex ${
												message.isFromMe ? 'justify-end' : 'justify-start'
											}`}
										>
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
														className={cn('text-xs mt-1 block',
															message.isFromMe
																? 'text-gray-700'
																: t.textSecondary,
														)}
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
			<div className={cn('px-4 py-3 border-t', t.isDark ? 'bg-gray-800' : 'bg-white', t.border)}>
				<div className="flex items-end gap-2">
					<textarea
						value={messageText}
						onChange={(e) => setMessageText(e.target.value)}
						onKeyDown={handleKeyPress}
						placeholder="Type a message..."
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
		</div>
	);
}
