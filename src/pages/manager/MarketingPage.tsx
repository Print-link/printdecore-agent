import SidebarTabLayout, {
	type SidebarTab,
} from "../../components/layouts/SidebarTabLayout";
import { Receipt, Phone, Zap, Send } from "../../components/icons";
import PromosPage from "./PromosPage";
import QuickRepliesPage from "./QuickRepliesPage";
import ContactsPage from "./ContactsPage";
import BroadcastsPage from "./BroadcastsPage";

const tabs: SidebarTab[] = [
	{ id: "promos", label: "Promos", icon: Receipt },
	{ id: "contacts", label: "Contacts", icon: Phone },
	{ id: "quick-replies", label: "Quick Replies", icon: Zap },
	{ id: "broadcasts", label: "Broadcasts", icon: Send },
];

export default function MarketingPage() {
	return (
		<SidebarTabLayout
			title="Marketing"
			basePath="/app/marketing"
			tabs={tabs}
			defaultTab="promos"
		>
			{(activeTab) => (
				<>
					{activeTab === "promos" && <PromosPage />}
					{activeTab === "contacts" && <ContactsPage />}
					{activeTab === "quick-replies" && <QuickRepliesPage />}
					{activeTab === "broadcasts" && <BroadcastsPage />}
				</>
			)}
		</SidebarTabLayout>
	);
}
