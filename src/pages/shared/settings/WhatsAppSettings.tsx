import { useState, useEffect } from "react";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Card, PageHeader, Button, Section } from "../../../components/ui";
import { Spinner } from "../../../components/icons";
import { useWhatsAppStore } from "../../../stores/whatsappStore";
import QRCode from "qrcode";

export default function WhatsAppSettings() {
	const t = useThemeClasses();
	const { isConnected, isConnecting, qrCode, error, connect, disconnect } =
		useWhatsAppStore();
	const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

	useEffect(() => {
		if (qrCode) {
			QRCode.toDataURL(qrCode, { width: 300, margin: 2 })
				.then((url) => setQrImageUrl(url))
				.catch((err) => console.error("Error generating QR code:", err));
		} else {
			setQrImageUrl(null);
		}
	}, [qrCode]);

	return (
		<Section>
			<PageHeader
				title="WhatsApp Integration"
				description="Connect your WhatsApp account to send and receive messages"
			/>
			<div className="space-y-6 max-w-2xl mt-6">
				<Card>
					<div className="flex items-center justify-between mb-4">
						<div>
							<label className={cn("block text-sm font-medium", t.textSecondary)}>
								Connection Status
							</label>
							<p className={cn("text-xs mt-1", t.textTertiary)}>
								{isConnected
									? "Connected"
									: isConnecting
										? "Connecting..."
										: "Disconnected"}
							</p>
						</div>
						<div
							className={cn(
								"w-3 h-3 rounded-full",
								isConnected
									? "bg-green-500"
									: isConnecting
										? "bg-yellow-500 animate-pulse"
										: "bg-gray-400",
							)}
						/>
					</div>

					{error && (
						<div
							className={cn(
								"mb-4 p-3 rounded-md text-sm",
								t.isDark
									? "bg-red-900/30 text-red-400 border border-red-800"
									: "bg-red-50 text-red-600 border border-red-200",
							)}
						>
							{error}
						</div>
					)}

					{!isConnected && !isConnecting && (
						<Button className="w-full" onClick={connect}>
							Connect WhatsApp
						</Button>
					)}

					{isConnecting && qrImageUrl && (
						<div className="space-y-4">
							<div className="text-center">
								<p className={cn("text-sm mb-2 font-medium", t.textSecondary)}>
									Scan QR Code with WhatsApp
								</p>
								<p className={cn("text-xs mb-4", t.textTertiary)}>
									1. Open WhatsApp on your phone
									<br />
									2. Tap Menu or Settings and select Linked Devices
									<br />
									3. Tap Link a Device
									<br />
									4. Point your phone at this screen to capture the code
								</p>
								<div className="flex justify-center p-4 bg-white rounded-lg">
									<img
										src={qrImageUrl}
										alt="QR Code"
										className="w-64 h-64 border-2 border-gray-200 rounded-lg"
									/>
								</div>
								<p className={cn("text-xs mt-2", t.textTertiary)}>
									QR code will refresh automatically if it expires
								</p>
							</div>
							<Button variant="secondary" className="w-full" onClick={disconnect}>
								Cancel Connection
							</Button>
						</div>
					)}

					{isConnecting && !qrImageUrl && (
						<div className="text-center py-8">
							<Spinner size="md" />
							<p className={cn("text-sm mt-4", t.textTertiary)}>
								Initializing WhatsApp connection...
							</p>
						</div>
					)}

					{isConnected && (
						<Button variant="danger" className="w-full" onClick={disconnect}>
							Disconnect WhatsApp
						</Button>
					)}
				</Card>

				{isConnected && (
					<div
						className={cn(
							"p-4 rounded-lg border",
							t.isDark
								? "bg-green-900/20 border-green-700"
								: "bg-green-50 border-green-200",
						)}
					>
						<div className="flex items-start gap-3">
							<div
								className={cn(
									"flex-shrink-0 w-2 h-2 rounded-full mt-1.5 animate-pulse",
									t.isDark ? "bg-green-400" : "bg-green-500",
								)}
							/>
							<div className="flex-1">
								<p
									className={cn(
										"text-sm font-medium mb-1",
										t.isDark ? "text-green-300" : "text-green-700",
									)}
								>
									WhatsApp Connected
								</p>
								<p
									className={cn(
										"text-xs",
										t.isDark ? "text-green-400" : "text-green-600",
									)}
								>
									Your WhatsApp is connected. You can now send and receive
									messages from the Messages tab.
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</Section>
	);
}
