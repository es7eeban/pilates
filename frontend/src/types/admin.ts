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

export interface CreateClassTypePayload {
  title: string;
  description?: string;
  defaultCapacity?: number;
  defaultPrice: number;
  durationMinutes?: number;
  intensityLevel?: string;
}

export interface UpdateClassTypePayload {
  title?: string;
  description?: string;
  defaultCapacity?: number;
  defaultPrice?: number;
  durationMinutes?: number;
  intensityLevel?: string;
  isActive?: boolean;
}

export interface CreateSchedulePayload {
  classTypeId: string;
  branchId?: string;
  instructorId?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  price?: number;
}

export interface BulkGenerateSchedulesPayload {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  timeSlots: Array<{ startTime: string; endTime: string }>;
  classTypeId: string;
  branchId?: string;
  instructorId?: string;
  capacity?: number;
  price?: number;
}

