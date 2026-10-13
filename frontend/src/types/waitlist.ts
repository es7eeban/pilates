export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';

export interface WaitlistEntry {
  id: string;
  userId: string;
  scheduleId: string;
  position: number;
  status: WaitlistStatus;
  offeredAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  schedule?: import('./schedule').ClassSchedule;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface WaitlistStatusResponse {
  inWaitlist: boolean;
  entry?: WaitlistEntry;
  position?: number;
  status?: WaitlistStatus;
  expiresAt?: string;
  remainingMinutes?: number;
  expired?: boolean;
}

export interface WaitlistSummaryResponse {
  waitlistCount: number;
  waitlistMax: number;
  isWaitlistFull: boolean;
}
