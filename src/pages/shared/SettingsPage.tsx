import SidebarTabLayout, {
	type SidebarTab,
} from "../../components/layouts/SidebarTabLayout";
import { Printer, Palette, Volume2, MessageCircle, Banknote } from "../../components/icons";
import PrinterSettings from "./settings/PrinterSettings";
import UISettings from "./settings/UISettings";
import SoundSettings from "./settings/SoundSettings";
import WhatsAppSettings from "./settings/WhatsAppSettings";
import WalletSettings from "./settings/WalletSettings";

const tabs: SidebarTab[] = [
	{ id: "printers", label: "Printer Status", icon: Printer },
	{ id: "ui", label: "UI Preferences", icon: Palette },
	{ id: "sounds", label: "Sounds", icon: Volume2 },
	{ id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
	{ id: "wallet", label: "Wallet", icon: Banknote },
];

export default function SettingsPage() {
	return (
		<SidebarTabLayout
			title="Settings"
			basePath="/app/settings"
			tabs={tabs}
			defaultTab="printers"
		>
			{(activeTab) => (
				<>
					{activeTab === "printers" && <PrinterSettings />}
					{activeTab === "ui" && <UISettings />}
					{activeTab === "sounds" && <SoundSettings />}
					{activeTab === "whatsapp" && <WhatsAppSettings />}
					{activeTab === "wallet" && <WalletSettings />}
				</>
			)}
		</SidebarTabLayout>
	);
}
