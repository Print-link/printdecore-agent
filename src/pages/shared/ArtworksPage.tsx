import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { PageHeader } from "../../components/ui";
import { ArtworksView } from "./artworks/ArtworksView";

/** The shop's ready-made designs customers can print (moved out of the old Services page). */
export default function ArtworksPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { isClerk, hasPermission } = usePermissions();
  const branchId = isClerk ? user?.branch_id : selectedBranch?.id;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title="Art works" description="Ready-made designs customers can choose and print." />
      {branchId ? (
        <ArtworksView branchId={branchId} canManage={hasPermission(PERMISSIONS.SERVICES_MANAGE)} />
      ) : (
        <p className="text-sm text-gray-500">Choose a branch to see its art works.</p>
      )}
    </div>
  );
}
