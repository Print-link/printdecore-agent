import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import { MapPin, Phone, Mail, Clock, Spinner } from '../../components/icons';

export default function BranchInfoPage() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const { hasPermission } = usePermissions();
  const d = theme === 'dark';

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branchInfo', user?.branch_id],
    queryFn: () => apiService.getBranchById(user!.branch_id!),
    enabled: !!user?.branch_id,
  });

  if (!hasPermission(PERMISSIONS.BRANCH_VIEW)) {
    return (
      <div className={`p-6 text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>
        Access denied. You need branch view permissions.
      </div>
    );
  }

  if (!user?.branch_id) {
    return (
      <div className={`p-6 text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>
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

  const cardClass = `p-6 rounded-lg ${d ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`;
  const labelClass = `text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`;
  const valueClass = `text-base ${d ? 'text-gray-100' : 'text-gray-900'}`;

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-900'}`}>
          Branch Information
        </h2>
        <p className={`text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
          Details about your assigned branch
        </p>
      </div>

      {/* Cover Image */}
      {branch.branchCoverImage && (
        <div className="rounded-lg overflow-hidden h-48">
          <img
            src={branch.branchCoverImage}
            alt={branch.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Basic Info */}
      <div className={cardClass}>
        <h3 className={`text-lg font-semibold mb-4 ${d ? 'text-gray-100' : 'text-gray-900'}`}>
          {branch.name}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branch.phoneNumber && (
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className={labelClass}>Phone</p>
                <p className={valueClass}>{branch.phoneNumber}</p>
              </div>
            </div>
          )}
          {branch.branchEmailAddress && (
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className={labelClass}>Email</p>
                <p className={valueClass}>{branch.branchEmailAddress}</p>
              </div>
            </div>
          )}
          {branch.location?.address && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <MapPin size={18} className="text-amber-500 mt-0.5" />
              <div>
                <p className={labelClass}>Address</p>
                <p className={valueClass}>{branch.location.address}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            branch.status === 'active'
              ? d ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
              : d ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
          }`}>
            {branch.status}
          </span>
          {branch.isMainBranch && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              d ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'
            }`}>
              Main Branch
            </span>
          )}
        </div>
      </div>

      {/* Operating Hours */}
      {branch.operatingHours && Object.keys(branch.operatingHours).length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-amber-500" />
            <h3 className={`text-lg font-semibold ${d ? 'text-gray-100' : 'text-gray-900'}`}>
              Operating Hours
            </h3>
          </div>
          <div className="space-y-2">
            {daysOfWeek.map(day => {
              const hours = branch.operatingHours[day];
              return (
                <div key={day} className="flex items-center justify-between py-1.5">
                  <span className={`text-sm font-medium capitalize ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    {hours ? `${hours.open} - ${hours.close}` : 'Closed'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
