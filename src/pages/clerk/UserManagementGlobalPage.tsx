import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/api';
import {
  Users, Shield, Mail, Plus, Search, ChevronDown,
  MoreHorizontal, UserCheck, UserX, Key, Trash2, Spinner,
} from '../../components/icons';
import InviteUserModal from '../../components/user-management/InviteUserModal';
import RoleFormModal from '../../components/user-management/RoleFormModal';
import type { Role, ManagedUser } from '../../types';

type Tab = 'users' | 'roles' | 'invitations';

export default function UserManagementGlobalPage() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // ─── Data Queries ─────────────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['managedUsers', searchQuery, branchFilter],
    queryFn: () => apiService.getManagedUsers({ search: searchQuery, branchId: branchFilter || undefined, limit: 100 }),
    enabled: activeTab === 'users',
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
    enabled: activeTab === 'roles',
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => apiService.getInvitations(),
    enabled: activeTab === 'invitations',
  });

  const { data: stats } = useQuery({
    queryKey: ['userManagementStats'],
    queryFn: () => apiService.getUserManagementStats(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['managerBranches', user?.id],
    queryFn: () => apiService.getBranchesByManagerId(user!.id),
    enabled: !!user?.id,
  });

  // ─── Mutations ────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; roleId?: string; branchId?: string }) => apiService.sendInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['userManagementStats'] });
      setShowInviteModal(false);
      success('Invitation sent successfully', 'Invited', 4000);
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to send invitation', 'Error', 5000),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description: string; permissionIds: string[] }) => apiService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowRoleModal(false);
      setEditingRole(null);
      success('Role created', 'Success', 4000);
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to create role', 'Error', 5000),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description: string; permissionIds: string[] }) =>
      apiService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowRoleModal(false);
      setEditingRole(null);
      success('Role updated', 'Success', 4000);
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to update role', 'Error', 5000),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      success('Role deleted', 'Deleted', 4000);
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to delete role', 'Error', 5000),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiService.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      success('Invitation revoked', 'Revoked', 4000);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiService.updateUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userManagementStats'] });
      success('User status updated', 'Updated', 4000);
    },
  });

  const bulkRoleMutation = useMutation({
    mutationFn: ({ userIds, roleId }: { userIds: string[]; roleId: string | null }) =>
      apiService.bulkUpdateRoles(userIds, roleId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['managedUsers'] });
      setSelectedUsers([]);
      success(`Updated ${data.updated} users`, 'Bulk Update', 4000);
    },
  });

  if (user?.role !== 'manager') {
    return <div className={`p-6 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
      Access denied. Manager role required.
    </div>;
  }

  const users: ManagedUser[] = usersData?.users || [];
  const d = theme === 'dark';

  // ─── Tab Definitions ──────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'users', label: 'Users', icon: Users, count: stats?.totalUsers },
    { key: 'roles', label: 'Roles', icon: Shield, count: roles.length },
    { key: 'invitations', label: 'Invitations', icon: Mail, count: stats?.pendingInvitations },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-900'}`}>User Management</h2>
          <p className={`text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage users, roles, and invitations across all branches
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-md font-semibold text-sm"
        >
          <Plus size={18} />
          Invite User
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users },
            { label: 'Active', value: stats.activeUsers, icon: UserCheck },
            { label: 'Inactive', value: stats.inactiveUsers, icon: UserX },
            { label: 'Pending Invites', value: stats.pendingInvitations, icon: Mail },
          ].map(s => (
            <div key={s.label} className={`p-4 rounded-lg border ${
              d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <s.icon size={20} className={d ? 'text-gray-400' : 'text-gray-500'} />
                <div>
                  <p className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-900'}`}>{s.value}</p>
                  <p className={`text-xs ${d ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className={`flex gap-1 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
        {tabs.map(tab => (
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key
                  ? 'bg-amber-400/20 text-amber-500'
                  : d ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Users Tab ──────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${d ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-md border text-sm ${
                  d ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-amber-400`}
              />
            </div>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className={`px-4 py-2 rounded-md border text-sm ${
                d ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="">All Branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Bulk actions */}
          {selectedUsers.length > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-md ${
              d ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-amber-50 border border-amber-200'
            }`}>
              <span className="text-sm font-medium text-amber-600">{selectedUsers.length} selected</span>
              <select
                onChange={e => {
                  if (e.target.value) {
                    bulkRoleMutation.mutate({ userIds: selectedUsers, roleId: e.target.value === 'none' ? null : e.target.value });
                    e.target.value = '';
                  }
                }}
                className={`px-3 py-1 rounded text-sm border ${d ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
              >
                <option value="">Assign Role...</option>
                <option value="none">Remove Role</option>
                {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button onClick={() => setSelectedUsers([])} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
            </div>
          )}

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : users.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Users className={`mx-auto mb-3 ${d ? 'text-gray-600' : 'text-gray-400'}`} size={40} />
              <p className={d ? 'text-gray-400' : 'text-gray-500'}>No users found</p>
            </div>
          ) : (
            <div className={`rounded-lg overflow-hidden border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <table className="w-full">
                <thead className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={e => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500"
                      />
                    </th>
                    {['Name', 'Email', 'Branch', 'Role', 'Status', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium uppercase ${d ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${d ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {users.map((u: any) => (
                    <tr key={u.id} className={`${d ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={e => setSelectedUsers(e.target.checked ? [...selectedUsers, u.id] : selectedUsers.filter(id => id !== u.id))}
                          className="w-4 h-4 rounded border-gray-300 text-amber-500"
                        />
                      </td>
                      <td className={`px-4 py-3 ${d ? 'text-gray-100' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                            d ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</td>
                      <td className={`px-4 py-3 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{u.branchName}</td>
                      <td className="px-4 py-3">
                        {u.roleName ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            d ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                          }`}>{u.roleName}</span>
                        ) : (
                          <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>No role</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.isActive !== false
                            ? d ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                            : d ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: u.id, isActive: u.isActive === false })}
                          className={`p-1.5 rounded ${d ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                          title={u.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {u.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Roles Tab ──────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingRole(null); setShowRoleModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-md font-semibold text-sm"
            >
              <Plus size={18} />
              Create Role
            </button>
          </div>

          {rolesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : roles.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Shield className={`mx-auto mb-3 ${d ? 'text-gray-600' : 'text-gray-400'}`} size={40} />
              <p className={d ? 'text-gray-400' : 'text-gray-500'}>No custom roles yet. Create one to define permission sets.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role: any) => (
                <div key={role.id} className={`p-5 rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className={`font-semibold ${d ? 'text-gray-100' : 'text-gray-900'}`}>{role.name}</h4>
                      {role.description && (
                        <p className={`text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{role.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!role.isSystem && (
                        <>
                          <button
                            onClick={() => { setEditingRole(role); setShowRoleModal(true); }}
                            className={`p-1.5 rounded ${d ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRoleMutation.mutate(role.id); }}
                            className={`p-1.5 rounded ${d ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {role.permissions?.length || 0} permissions
                    </span>
                    <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {role.userCount || 0} users
                    </span>
                    {role.isSystem && (
                      <span className={`px-2 py-0.5 rounded text-xs ${d ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>System</span>
                    )}
                  </div>
                  {role.permissions && role.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {role.permissions.slice(0, 6).map((p: any) => (
                        <span key={p.id} className={`px-2 py-0.5 rounded text-xs ${
                          d ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>{p.name}</span>
                      ))}
                      {role.permissions.length > 6 && (
                        <span className={`px-2 py-0.5 rounded text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                          +{role.permissions.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Invitations Tab ────────────────────────────────────────── */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitationsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : invitations.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <Mail className={`mx-auto mb-3 ${d ? 'text-gray-600' : 'text-gray-400'}`} size={40} />
              <p className={d ? 'text-gray-400' : 'text-gray-500'}>No invitations sent yet.</p>
            </div>
          ) : (
            <div className={`rounded-lg overflow-hidden border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <table className="w-full">
                <thead className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  <tr>
                    {['Email', 'Branch', 'Role', 'Status', 'Sent', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium uppercase ${d ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${d ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {invitations.map((inv: any) => {
                    const statusColors: Record<string, string> = {
                      pending: d ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
                      accepted: d ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700',
                      expired: d ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500',
                      revoked: d ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700',
                    };
                    return (
                      <tr key={inv.id}>
                        <td className={`px-4 py-3 text-sm ${d ? 'text-gray-100' : 'text-gray-900'}`}>{inv.email}</td>
                        <td className={`px-4 py-3 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{inv.branchName || '—'}</td>
                        <td className={`px-4 py-3 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{inv.roleName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || ''}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => revokeMutation.mutate(inv.id)}
                              className={`text-xs px-2 py-1 rounded ${d ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={data => inviteMutation.mutate(data)}
          isInviting={inviteMutation.isPending}
        />
      )}

      {showRoleModal && (
        <RoleFormModal
          role={editingRole}
          onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
          onSave={data => {
            if (editingRole) {
              updateRoleMutation.mutate({ id: editingRole.id, ...data });
            } else {
              createRoleMutation.mutate(data);
            }
          }}
          isSaving={createRoleMutation.isPending || updateRoleMutation.isPending}
        />
      )}
    </div>
  );
}
