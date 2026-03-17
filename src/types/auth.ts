export type UserRole = 'manager' | 'clerk';

export interface User {
	id: string;
	name?: string; // Computed from firstName + lastName for backward compatibility
	firstName?: string;
	lastName?: string;
	email: string;
	role: UserRole;
	permissions?: string[];
	phoneNumber?: string;
	avatar?: string;
	verified?: boolean;
	branch_id?: string; // Only for clerks - the branch they belong to
	isActive?: boolean;
	isTemporaryPassword?: boolean;
	createdAt: number | Date;
	updatedAt: number | Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
  requiresPasswordSetup?: boolean;
  requiresLocation?: boolean;
}
