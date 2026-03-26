import { PageHeader, Section } from "../../../components/ui";
import StatusPage from "../StatusPage";

export default function PrinterSettings() {
	return (
		<Section>
			<PageHeader
				title="Printer Status"
				description="View and manage available printers"
			/>
			<div className="mt-6">
				<StatusPage />
			</div>
		</Section>
	);
}
