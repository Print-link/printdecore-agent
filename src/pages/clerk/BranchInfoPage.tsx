import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import { MapPin, Phone, Mail, Clock, Spinner } from '../../components/icons';
import { Card, PageHeader, StatusBadge, Badge } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';

export default function BranchInfoPage() {
  const { user } = useAuthStore();
  const t = useThemeClasses();
  const { hasPermission } = usePermissions();

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branchInfo', user?.branch_id],
    queryFn: () => apiService.getBranchById(user!.branch_id!),
    enabled: !!user?.branch_id,
  });

  if (!hasPermission(PERMISSIONS.BRANCH_VIEW)) {
    return (
      <div className={cn('p-6 text-center', t.textSecondary)}>
        Access denied. You need branch view permissions.
      </div>
    );
  }

  if (!user?.branch_id) {
    return (
      <div className={cn('p-6 text-center', t.textSecondary)}>
        No branch assigned. Please contact your manager.
      </div>
    );
  }

  if (isLoading || !branch) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Branch Information" description="Details about your assigned branch" />

      {/* Cover Image */}
      {branch.branchCoverImage && (
        <div className="rounded-lg overflow-hidden h-48">
          <img src={branch.branchCoverImage} alt={branch.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Basic Info */}
      <Card padding="lg">
        <h3 className={cn('text-lg font-semibold mb-4', t.text)}>{branch.name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branch.phoneNumber && (
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className={cn('text-sm font-medium', t.textSecondary)}>Phone</p>
                <p className={t.text}>{branch.phoneNumber}</p>
              </div>
            </div>
          )}
          {branch.branchEmailAddress && (
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className={cn('text-sm font-medium', t.textSecondary)}>Email</p>
                <p className={t.text}>{branch.branchEmailAddress}</p>
              </div>
            </div>
          )}
          {branch.location?.address && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <MapPin size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className={cn('text-sm font-medium', t.textSecondary)}>Address</p>
                <p className={t.text}>{branch.location.address}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <StatusBadge status={branch.status} />
          {branch.isMainBranch && <Badge color="amber">Main Branch</Badge>}
        </div>
      </Card>

      {/* Operating Hours */}
      {branch.operatingHours && Object.keys(branch.operatingHours).length > 0 && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-amber-500" />
            <h3 className={cn('text-lg font-semibold', t.text)}>Operating Hours</h3>
          </div>
          <div className="space-y-2">
            {daysOfWeek.map(day => {
              const hours = branch.operatingHours[day];
              return (
                <div key={day} className="flex items-center justify-between py-1.5">
                  <span className={cn('text-sm font-medium capitalize', t.isDark ? 'text-gray-300' : 'text-gray-700')}>
                    {day}
                  </span>
                  <span className={cn('text-sm', t.textSecondary)}>
                    {hours ? `${hours.open} - ${hours.close}` : 'Closed'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
