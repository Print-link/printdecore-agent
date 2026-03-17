export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Invitation {
  id: string;
  email: string;
  roleId?: string;
  roleName?: string;
  userType: 'clerk' | 'manager';
  branchId?: string;
  branchName?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  inviterName?: string;
  permissionsSnapshot?: string[];
  expiresAt: Date | string;
  acceptedAt?: Date | string;
  createdAt: Date | string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName?: string;
  userType: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  branchId?: string;
  branchName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date | string;
}

export interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  branchId: string;
  branchName: string;
  roleId?: string;
  roleName?: string;
  isActive: boolean;
  permissions?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  branchesWithUsers: number;
  pendingInvitations: number;
}
