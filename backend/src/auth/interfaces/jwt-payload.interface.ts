import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  isInstructor: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isInstructor: boolean;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    isInstructor: boolean;
    favoriteBranchId?: string | null;
    favoriteTimeSchedule?: string | null;
    favoriteBranch?: any;
    bankName?: string | null;
    bankAccountType?: string | null;
    bankAccountNumber?: string | null;
    bankAccountRut?: string | null;
    bankAccountHolder?: string | null;
    bankPaymentEmail?: string | null;
    bankPaymentNotes?: string | null;
    allowedMenus?: string[];
  };
  tokens: AuthTokens;
}
