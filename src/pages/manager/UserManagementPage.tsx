import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/api';
import { Users, Shield, Mail, Plus, Search, UserCheck, UserX, Key, Trash2 } from '../../components/icons';
import { Card, PageHeader, Button, Badge, Tabs, Avatar, EmptyState, StatusBadge } from '../../components/ui';
import { UserTableSkeleton, CategoryGridSkeleton, TableSkeleton } from '../../components/ui/skeletons';
import InviteUserModal from '../../components/user-management/InviteUserModal';
import RoleFormModal from '../../components/user-management/RoleFormModal';
import type { Role, ManagedUser } from '../../types';

type Tab = 'users' | 'roles' | 'invitations';

export default function UserManagementGlobalPage() {
  const { user } = useAuthStore();
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const invalidate = (...keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const onErr = (fallback: string) => (err: any) => showError(err?.response?.data?.message || fallback, 'Error', 5000);

  // ─── Queries ──────────────────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['managedUsers', searchQuery, branchFilter],
    queryFn: () => apiService.getManagedUsers({ search: searchQuery, branchId: branchFilter || undefined, limit: 100 }),
    enabled: activeTab === 'users',
  });
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'], queryFn: () => apiService.getRoles(), enabled: activeTab === 'roles',
  });
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations'], queryFn: () => apiService.getInvitations(), enabled: activeTab === 'invitations',
  });
  const { data: stats } = useQuery({ queryKey: ['userManagementStats'], queryFn: () => apiService.getUserManagementStats() });
  const { data: branches = [] } = useQuery({
    queryKey: ['managerBranches', user?.id], queryFn: () => apiService.getAllBranches(user!.id), enabled: !!user?.id,
  });

  // ─── Mutations ────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; roleId?: string; branchId?: string }) => apiService.sendInvitation(data),
    onSuccess: () => { invalidate('invitations', 'userManagementStats'); setShowInviteModal(false); success('Invitation sent successfully', 'Invited', 4000); },
    onError: onErr('Failed to send invitation'),
  });
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description: string; permissionIds: string[] }) => apiService.createRole(data),
    onSuccess: () => { invalidate('roles'); setShowRoleModal(false); setEditingRole(null); success('Role created', 'Success', 4000); },
    onError: onErr('Failed to create role'),
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description: string; permissionIds: string[] }) => apiService.updateRole(id, data),
    onSuccess: () => { invalidate('roles'); setShowRoleModal(false); setEditingRole(null); success('Role updated', 'Success', 4000); },
    onError: onErr('Failed to update role'),
  });
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteRole(id),
    onSuccess: () => { invalidate('roles'); success('Role deleted', 'Deleted', 4000); },
    onError: onErr('Failed to delete role'),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiService.revokeInvitation(id),
    onSuccess: () => { invalidate('invitations'); success('Invitation revoked', 'Revoked', 4000); },
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiService.updateUserStatus(id, isActive),
    onSuccess: () => { invalidate('managedUsers', 'userManagementStats'); success('User status updated', 'Updated', 4000); },
  });
  const bulkRoleMutation = useMutation({
    mutationFn: ({ userIds, roleId }: { userIds: string[]; roleId: string | null }) => apiService.bulkUpdateRoles(userIds, roleId),
    onSuccess: (data) => { invalidate('managedUsers'); setSelectedUsers([]); success(`Updated ${data.updated} users`, 'Bulk Update', 4000); },
  });

  if (user?.role !== 'manager') return <div className={cn('p-6 text-center', t.textSecondary)}>Access denied. Manager role required.</div>;

  const users: ManagedUser[] = usersData?.users || [];
  const thd = cn('px-4 py-3 text-left text-xs font-medium uppercase', t.textSecondary);
  const thead = t.isDark ? 'bg-gray-700/50' : 'bg-gray-50';

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Manage users, roles, and invitations across all branches"
        actions={<Button icon={Plus} onClick={() => setShowInviteModal(true)}>Invite User</Button>} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([['Total Users', stats.totalUsers, Users], ['Active', stats.activeUsers, UserCheck], ['Inactive', stats.inactiveUsers, UserX], ['Pending Invites', stats.pendingInvitations, Mail]] as const).map(([label, value, Icon]) => (
            <Card key={label} padding="sm" className="!rounded-lg">
              <div className="flex items-center gap-3">
                <Icon size={20} className={t.textSecondary} />
                <div>
                  <p className={cn('text-2xl font-bold', t.text)}>{value}</p>
                  <p className={cn('text-xs', t.textSecondary)}>{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Tabs tabs={[
        { key: 'users', label: 'Users', icon: Users, count: stats?.totalUsers },
        { key: 'roles', label: 'Roles', icon: Shield, count: roles.length },
        { key: 'invitations', label: 'Invitations', icon: Mail, count: stats?.pendingInvitations },
      ]} active={activeTab} onChange={key => setActiveTab(key as Tab)} />

      {/* ─── Users Tab ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className={cn('absolute left-3 top-1/2 -translate-y-1/2', t.textSecondary)} />
              <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className={cn('w-full pl-10 pr-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400', t.input)} />
            </div>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className={cn('px-4 py-2 rounded-md border text-sm', t.input)}>
              <option value="">All Branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {selectedUsers.length > 0 && (
            <div className={cn('flex items-center gap-3 px-4 py-2 rounded-md border', t.isDark ? 'bg-amber-400/10 border-amber-400/30' : 'bg-amber-50 border-amber-200')}>
              <span className="text-sm font-medium text-amber-600">{selectedUsers.length} selected</span>
              <select onChange={e => { if (e.target.value) { bulkRoleMutation.mutate({ userIds: selectedUsers, roleId: e.target.value === 'none' ? null : e.target.value }); e.target.value = ''; } }}
                className={cn('px-3 py-1 rounded text-sm border', t.input)}>
                <option value="">Assign Role...</option>
                <option value="none">Remove Role</option>
                {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>Clear</Button>
            </div>
          )}

          {usersLoading ? (
            <UserTableSkeleton />
          ) : users.length === 0 ? (
            <Card><EmptyState icon={Users} title="No users found" /></Card>
          ) : (
            <Card padding="none" className="!rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className={thead}>
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} onChange={e => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])} className="w-4 h-4 rounded border-gray-300 text-amber-500" />
                    </th>
                    {['Name', 'Email', 'Branch', 'Role', 'Status', ''].map(h => <th key={h} className={thd}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className={cn('divide-y', t.border)}>
                  {users.map((u: any) => (
                    <tr key={u.id} className={t.isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={e => setSelectedUsers(e.target.checked ? [...selectedUsers, u.id] : selectedUsers.filter(id => id !== u.id))} className="w-4 h-4 rounded border-gray-300 text-amber-500" />
                      </td>
                      <td className={cn('px-4 py-3', t.text)}>
                        <div className="flex items-center gap-3">
                          <Avatar name={`${u.firstName || ''} ${u.lastName || ''}`} size="sm" />
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td className={cn('px-4 py-3 text-sm', t.textSecondary)}>{u.email}</td>
                      <td className={cn('px-4 py-3 text-sm', t.textSecondary)}>{u.branchName}</td>
                      <td className="px-4 py-3">{u.roleName ? <Badge color="purple">{u.roleName}</Badge> : <span className={cn('text-xs', t.textTertiary)}>No role</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.isActive !== false ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => updateStatusMutation.mutate({ id: u.id, isActive: u.isActive === false })} title={u.isActive !== false ? 'Deactivate' : 'Activate'}>
                          {u.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ─── Roles Tab ─────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={Plus} onClick={() => { setEditingRole(null); setShowRoleModal(true); }}>Create Role</Button>
          </div>
          {rolesLoading ? (
            <CategoryGridSkeleton count={3} />
          ) : roles.length === 0 ? (
            <Card><EmptyState icon={Shield} title="No custom roles yet" description="Create one to define permission sets." /></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role: any) => (
                <Card key={role.id} className="!rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className={cn('font-semibold', t.text)}>{role.name}</h4>
                      {role.description && <p className={cn('text-sm mt-1', t.textSecondary)}>{role.description}</p>}
                    </div>
                    {!role.isSystem && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingRole(role); setShowRoleModal(true); }}><Key size={14} /></Button>
                        <Button variant="ghost" size="sm" className="!text-red-400 hover:!bg-red-900/30" onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRoleMutation.mutate(role.id); }}><Trash2 size={14} /></Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('text-xs', t.textTertiary)}>{role.permissions?.length || 0} permissions</span>
                    <span className={cn('text-xs', t.textTertiary)}>{role.userCount || 0} users</span>
                    {role.isSystem && <Badge color="gray">System</Badge>}
                  </div>
                  {role.permissions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {role.permissions.slice(0, 6).map((p: any) => <Badge key={p.id} color="gray">{p.name}</Badge>)}
                      {role.permissions.length > 6 && <span className={cn('px-2 py-0.5 text-xs', t.textTertiary)}>+{role.permissions.length - 6} more</span>}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Invitations Tab ───────────────────────────────────────── */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitationsLoading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : invitations.length === 0 ? (
            <Card><EmptyState icon={Mail} title="No invitations sent yet" /></Card>
          ) : (
            <Card padding="none" className="!rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className={thead}>
                  <tr>{['Email', 'Branch', 'Role', 'Status', 'Sent', ''].map(h => <th key={h} className={thd}>{h}</th>)}</tr>
                </thead>
                <tbody className={cn('divide-y', t.border)}>
                  {invitations.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className={cn('px-4 py-3 text-sm', t.text)}>{inv.email}</td>
                      <td className={cn('px-4 py-3 text-sm', t.textSecondary)}>{inv.branchName || '—'}</td>
                      <td className={cn('px-4 py-3 text-sm', t.textSecondary)}>{inv.roleName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className={cn('px-4 py-3 text-xs', t.textTertiary)}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {inv.status === 'pending' && <Button variant="ghost" size="sm" className="!text-red-400" onClick={() => revokeMutation.mutate(inv.id)}>Revoke</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ─── Modals ────────────────────────────────────────────────── */}
      {showInviteModal && <InviteUserModal onClose={() => setShowInviteModal(false)} onInvite={data => inviteMutation.mutate(data)} isInviting={inviteMutation.isPending} />}
      {showRoleModal && (
        <RoleFormModal role={editingRole} onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
          onSave={data => editingRole ? updateRoleMutation.mutate({ id: editingRole.id, ...data }) : createRoleMutation.mutate(data)}
          isSaving={createRoleMutation.isPending || updateRoleMutation.isPending} />
      )}
    </div>
  );
}
