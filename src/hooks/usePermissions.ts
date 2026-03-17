import { useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

// All permission keys matching the backend (migration 039)
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_CREATE: 'orders.create',
  // Services
  SERVICES_VIEW: 'services.view',
  SERVICES_MANAGE: 'services.manage',
  // Users
  USERS_VIEW: 'users.view',
  USERS_INVITE: 'users.invite',
  USERS_MANAGE: 'users.manage',
  USERS_PERMISSIONS: 'users.permissions',
  // Branch
  BRANCH_VIEW: 'branch.view',
  BRANCH_MANAGE: 'branch.manage',
  BRANCH_CREATE: 'branch.create',
  BRANCH_DELETE: 'branch.delete',
  // Messages
  MESSAGES_VIEW: 'messages.view',
  MESSAGES_SEND: 'messages.send',
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  // Activity
  ACTIVITY_VIEW: 'activity.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const isManager = user?.role === 'manager';
  const isClerk = user?.role === 'clerk';
  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);

  /** Managers always have full access. Clerks check their permission list. */
  const hasPermission = useCallback(
    (...keys: PermissionKey[]): boolean => {
      if (isManager) return true;
      return keys.some((key) => permissions.includes(key));
    },
    [isManager, permissions],
  );

  /** Check if user has ALL of the specified permissions */
  const hasAllPermissions = useCallback(
    (...keys: PermissionKey[]): boolean => {
      if (isManager) return true;
      return keys.every((key) => permissions.includes(key));
    },
    [isManager, permissions],
  );

  return {
    permissions,
    isManager,
    isClerk,
    hasPermission,
    hasAllPermissions,
  };
}
