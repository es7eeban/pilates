export type NotificationType =
  | 'BOOKING_CREATED'
  | 'VOUCHER_UPLOADED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'WAITLIST_JOINED'
  | 'WAITLIST_OFFER'
  | 'WAITLIST_EXPIRED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_CANCELLED';

export type NotificationChannel = 'IN_APP' | 'EMAIL_SIMULATED' | 'WHATSAPP_SIMULATED';

export interface NotificationMetadata {
  bookingCode?: string;
  bookingId?: string;
  scheduleId?: string;
  waitlistEntryId?: string;
  classTitle?: string;
  branchName?: string;
  oldBranchName?: string;
  newBranchName?: string;
  branchAddress?: string;
  startTime?: string;
  oldStartTime?: string;
  newStartTime?: string;
  newEndTime?: string;
  expiresAt?: string;
  price?: number | string;
  reason?: string;
  voucherUrl?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  email?: {
    to: string;
    subject: string;
    body: string;
  };
  whatsapp?: {
    to: string;
    message: string;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  read: boolean;
  metadata?: NotificationMetadata | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };
}

export interface MyNotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}
