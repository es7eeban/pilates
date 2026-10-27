export type UserRole = 'CLIENT' | 'INSTRUCTOR' | 'ADMIN';

export interface StudioBankInfo {
  bankName: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountRut: string;
  bankAccountHolder: string;
  bankPaymentEmail: string;
  bankPaymentNotes?: string | null;
  updatedAt?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isInstructor: boolean;
  isActive?: boolean;
  favoriteBranchId?: string | null;
  favoriteTimeSchedule?: string | null;
  favoriteBranch?: import('./schedule.js').Branch | null;
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountNumber?: string | null;
  bankAccountRut?: string | null;
  bankAccountHolder?: string | null;
  bankPaymentEmail?: string | null;
  bankPaymentNotes?: string | null;
  allowedMenus?: string[];
}

export interface UpdatePreferencesPayload {
  name?: string;
  email?: string;
  phone?: string;
  favoriteBranchId?: string | null;
  favoriteTimeSchedule?: string | null;
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountNumber?: string | null;
  bankAccountRut?: string | null;
  bankAccountHolder?: string | null;
  bankPaymentEmail?: string | null;
  bankPaymentNotes?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
