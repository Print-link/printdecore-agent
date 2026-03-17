import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import {
  Shield, Users, Clock, ChevronDown, ChevronRight, Plus,
  Save, Spinner,
} from '../../components/icons';
import { Card, PageHeader, Button, Badge, Tabs, Avatar, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import PermissionPicker from '../../components/user-management/PermissionPicker';
import InviteUserModal from '../../components/user-management/InviteUserModal';
import type { Permission } from '../../types';

type TabKey = 'users' | 'activity';

export default function AccessControlPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const { isManager, isClerk, hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  // Clerks use their assigned branch, managers use selected branch
  const canManageUsers = hasPermission(PERMISSIONS.USERS_PERMISSIONS);

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
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
    return <div className={cn('p-6 text-center', t.textSecondary)}>Access denied. You need the required permissions.</div>;
  }

  if (!branchId) {
    return <div className={cn('p-6 text-center', t.textSecondary)}>
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
    try {
      const data = await apiService.getBranchUserPermissions(branchId!, userId);
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

  const tabItems = [
    ...(canManageUsers ? [{ key: 'users', label: 'Users & Permissions', icon: Shield, count: branchUsers.length }] : []),
    { key: 'activity', label: 'Activity Log', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description={canManageUsers ? `Manage user permissions for ${branchName}` : `Activity log for ${branchName}`}
        actions={canManageUsers ? (
          <Button icon={Plus} onClick={() => setShowInviteModal(true)}>Invite to Branch</Button>
        ) : undefined}
      />

      <Tabs tabs={tabItems} active={activeTab} onChange={key => setActiveTab(key as TabKey)} />

      {/* ─── Users & Permissions Tab ────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {usersLoading ? (
            <div className="flex justify-center py-12"><Spinner size="md" /></div>
          ) : branchUsers.length === 0 ? (
            <Card>
              <EmptyState icon={Users} title="No users assigned to this branch yet." />
            </Card>
          ) : (
            branchUsers.map((u: any) => {
              const isExpanded = expandedUserId === u.id;
              return (
                <Card key={u.id} padding="none" className={isExpanded ? 'ring-2 ring-amber-400/50' : ''}>
                  <button
                    onClick={() => handleExpandUser(u.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  >
                    <Avatar name={`${u.firstName || ''} ${u.lastName || ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium', t.text)}>
                          {u.firstName} {u.lastName}
                        </span>
                        {u.roleName && <Badge color="purple">{u.roleName}</Badge>}
                        <Badge color={u.isActive !== false ? 'green' : 'red'}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className={cn('text-sm', t.textSecondary)}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs', t.textTertiary)}>
                        {u.permissions?.length || 0} permissions
                      </span>
                      {isExpanded
                        ? <ChevronDown size={18} className="text-gray-400" />
                        : <ChevronRight size={18} className="text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className={cn('px-5 pb-5 border-t', t.border)}>
                      <div className="pt-4">
                        <h4 className={cn('text-sm font-semibold mb-3', t.textSecondary)}>
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
                          <Button
                            icon={Save}
                            loading={updatePermsMutation.isPending}
                            onClick={() => updatePermsMutation.mutate({ userId: u.id, permissionIds: editingPermissions })}
                          >
                            {updatePermsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                          </Button>
                          <Button variant="secondary" onClick={() => setExpandedUserId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── Activity Log Tab ───────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {activityLoading ? (
            <div className="flex justify-center py-12"><Spinner size="md" /></div>
          ) : !activityData?.logs?.length ? (
            <Card>
              <EmptyState icon={Clock} title="No activity logged for this branch yet." />
            </Card>
          ) : (
            <>
              <Card padding="none">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activityData.logs.map((log: any) => (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                      <div className={cn('mt-0.5 w-2 h-2 rounded-full flex-shrink-0',
                        log.action.includes('deleted') || log.action.includes('deactivated') || log.action.includes('revoked')
                          ? 'bg-red-400'
                          : log.action.includes('created') || log.action.includes('accepted') || log.action.includes('activated')
                          ? 'bg-green-400'
                          : 'bg-blue-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', t.text)}>
                          <span className="font-medium">{log.userName || log.userId.slice(0, 8)}</span>
                          {' '}{ACTION_LABELS[log.action] || log.action}
                          {log.details?.clerkName && <span className="font-medium"> — {log.details.clerkName}</span>}
                          {log.details?.roleName && <span> ({log.details.roleName})</span>}
                          {log.details?.email && <span> ({log.details.email})</span>}
                        </p>
                        <p className={cn('text-xs mt-0.5', t.textTertiary)}>
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {activityData.pagination && activityData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                  >
                    Previous
                  </Button>
                  <span className={cn('px-3 py-1 text-sm', t.textSecondary)}>
                    Page {activityPage} of {activityData.pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivityPage(p => p + 1)}
                    disabled={activityPage >= activityData.pagination.totalPages}
                  >
                    Next
                  </Button>
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
