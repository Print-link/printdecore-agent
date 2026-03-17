import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import {
  Shield, Users, Clock, ChevronDown, ChevronRight, Plus,
  UserCheck, UserX, Save, X, Search, Spinner,
} from '../../components/icons';
import PermissionPicker from '../../components/user-management/PermissionPicker';
import InviteUserModal from '../../components/user-management/InviteUserModal';
import type { Permission, ManagedUser } from '../../types';

type Tab = 'users' | 'activity';

export default function AccessControlPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const { isManager, isClerk, hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const d = theme === 'dark';

  // Clerks use their assigned branch, managers use selected branch
  const canManageUsers = hasPermission(PERMISSIONS.USERS_PERMISSIONS);

  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  const branchId = isClerk ? user?.branch_id : selectedBranch?.id;

  // ─── Data ─────────────────────────────────────────────────────────
  const { data: branchUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['branchAccessUsers', branchId],
    queryFn: () => apiService.getBranchAccessControlUsers(branchId!),
    enabled: !!branchId,
  });

  const { data: permData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => apiService.getPermissions(),
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['branchActivity', branchId, activityPage],
    queryFn: () => apiService.getBranchActivityLog(branchId!, activityPage, 25),
    enabled: !!branchId && activeTab === 'activity',
  });

  // ─── Mutations ────────────────────────────────────────────────────
  const updatePermsMutation = useMutation({
    mutationFn: ({ userId, permissionIds }: { userId: string; permissionIds: string[] }) =>
      apiService.updateBranchUserPermissions(branchId!, userId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branchAccessUsers', branchId] });
      setExpandedUserId(null);
      success('Permissions updated', 'Saved', 4000);
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to update', 'Error', 5000),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; roleId?: string; branchId?: string }) => apiService.sendInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branchAccessUsers', branchId] });
      setShowInviteModal(false);
      success('Invitation sent', 'Invited', 4000);
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to invite', 'Error', 5000),
  });

  if (!hasPermission(PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.USERS_PERMISSIONS)) {
    return <div className={`p-6 text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>
      Access denied. You need the required permissions.
    </div>;
  }

  if (!branchId) {
    return <div className={`p-6 text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>
      {isClerk ? 'No branch assigned.' : 'Please select a branch.'}
    </div>;
  }

  const branchName = isClerk ? 'Your Branch' : selectedBranch?.name || '';

  const allPermissions: Permission[] = permData?.permissions || [];

  const handleExpandUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    // Load this user's direct permissions
    try {
      const data = await apiService.getBranchUserPermissions(branchId!, userId);
      // Convert effective permission keys to permission IDs
      const permIds = allPermissions
        .filter(p => data.effectivePermissions.includes(p.key))
        .map(p => p.id);
      setEditingPermissions(permIds);
    } catch {
      setEditingPermissions([]);
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    'user.role_changed': 'Changed user role',
    'user.permissions_updated': 'Updated user permissions',
    'user.branch_permissions_updated': 'Updated branch permissions',
    'user.activated': 'Activated user',
    'user.deactivated': 'Deactivated user',
    'user.bulk_role_changed': 'Bulk role change',
    'user.bulk_deactivated': 'Bulk deactivation',
    'role.created': 'Created role',
    'role.updated': 'Updated role',
    'role.deleted': 'Deleted role',
    'invitation.sent': 'Sent invitation',
    'invitation.revoked': 'Revoked invitation',
    'invitation.accepted': 'Invitation accepted',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-900'}`}>Access Control</h2>
          <p className={`text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            {canManageUsers ? `Manage user permissions for ${branchName}` : `Activity log for ${branchName}`}
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-md font-semibold text-sm"
          >
            <Plus size={18} />
            Invite to Branch
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
        {[
          ...(canManageUsers ? [{ key: 'users' as Tab, label: 'Users & Permissions', icon: Shield, count: branchUsers.length }] : []),
          { key: 'activity' as Tab, label: 'Activity Log', icon: Clock },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-amber-400 text-amber-500'
                : `border-transparent ${d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-amber-400/20 text-amber-500' : d ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Users & Permissions Tab ────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : branchUsers.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Users className={`mx-auto mb-3 ${d ? 'text-gray-600' : 'text-gray-400'}`} size={40} />
              <p className={d ? 'text-gray-400' : 'text-gray-500'}>No users assigned to this branch yet.</p>
            </div>
          ) : (
            branchUsers.map((u: any) => {
              const isExpanded = expandedUserId === u.id;
              return (
                <div key={u.id} className={`rounded-lg border transition-all ${
                  d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } ${isExpanded ? 'ring-2 ring-amber-400/50' : ''}`}>
                  {/* User Row */}
                  <button
                    onClick={() => handleExpandUser(u.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      d ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${d ? 'text-gray-100' : 'text-gray-900'}`}>
                          {u.firstName} {u.lastName}
                        </span>
                        {u.roleName && (
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            d ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                          }`}>{u.roleName}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          u.isActive !== false
                            ? d ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                            : d ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                        {u.permissions?.length || 0} permissions
                      </span>
                      {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded Permission Editor */}
                  {isExpanded && (
                    <div className={`px-5 pb-5 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="pt-4">
                        <h4 className={`text-sm font-semibold mb-3 ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                          Permissions for this branch
                        </h4>
                        {allPermissions.length > 0 ? (
                          <PermissionPicker
                            permissions={allPermissions}
                            selectedIds={editingPermissions}
                            onChange={setEditingPermissions}
                          />
                        ) : (
                          <div className="animate-pulse h-24 rounded bg-gray-200 dark:bg-gray-700" />
                        )}
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => updatePermsMutation.mutate({ userId: u.id, permissionIds: editingPermissions })}
                            disabled={updatePermsMutation.isPending}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm ${
                              updatePermsMutation.isPending ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
                            }`}
                          >
                            <Save size={16} />
                            {updatePermsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                          </button>
                          <button
                            onClick={() => setExpandedUserId(null)}
                            className={`px-4 py-2 rounded-md text-sm ${
                              d ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Activity Log Tab ───────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {activityLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : !activityData?.logs?.length ? (
            <div className={`p-12 text-center rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Clock className={`mx-auto mb-3 ${d ? 'text-gray-600' : 'text-gray-400'}`} size={40} />
              <p className={d ? 'text-gray-400' : 'text-gray-500'}>No activity logged for this branch yet.</p>
            </div>
          ) : (
            <>
              <div className={`rounded-lg border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activityData.logs.map((log: any) => (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        log.action.includes('deleted') || log.action.includes('deactivated') || log.action.includes('revoked')
                          ? 'bg-red-400'
                          : log.action.includes('created') || log.action.includes('accepted') || log.action.includes('activated')
                          ? 'bg-green-400'
                          : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${d ? 'text-gray-200' : 'text-gray-800'}`}>
                          <span className="font-medium">{log.userName || log.userId.slice(0, 8)}</span>
                          {' '}{ACTION_LABELS[log.action] || log.action}
                          {log.details?.clerkName && <span className="font-medium"> — {log.details.clerkName}</span>}
                          {log.details?.roleName && <span> ({log.details.roleName})</span>}
                          {log.details?.email && <span> ({log.details.email})</span>}
                        </p>
                        <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {activityData.pagination && activityData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className={`px-3 py-1 rounded text-sm ${
                      d ? 'bg-gray-700 text-gray-300 disabled:text-gray-600' : 'bg-gray-100 text-gray-600 disabled:text-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  <span className={`px-3 py-1 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    Page {activityPage} of {activityData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setActivityPage(p => p + 1)}
                    disabled={activityPage >= activityData.pagination.totalPages}
                    className={`px-3 py-1 rounded text-sm ${
                      d ? 'bg-gray-700 text-gray-300 disabled:text-gray-600' : 'bg-gray-100 text-gray-600 disabled:text-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={data => inviteMutation.mutate(data)}
          isInviting={inviteMutation.isPending}
          preselectedBranchId={branchId}
        />
      )}
    </div>
  );
}
