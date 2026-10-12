import type { UserRole } from './auth';

export interface CreateBranchPayload {
  name: string;
  slug?: string;
  address: string;
  commune?: string;
  city?: string;
  phone?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  slug?: string;
  address?: string;
  commune?: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
}

export interface AdminCreateUserPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role?: UserRole;
  isInstructor?: boolean;
  favoriteBranchId?: string;
}

export interface AdminUpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: UserRole;
  isInstructor?: boolean;
  isActive?: boolean;
  favoriteBranchId?: string | null;
}

export interface QueryUsersParams {
  search?: string;
  role?: string;
  isActive?: boolean;
}
