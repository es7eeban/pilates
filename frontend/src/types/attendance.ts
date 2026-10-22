import type { ClassSchedule, Booking, AttendanceStatus } from './schedule';

export interface InstructorClassSchedule extends ClassSchedule {
  bookings?: Booking[];
  stats?: {
    capacity: number;
    enrolled: number;
    confirmed?: number;
    pendingValidation?: number;
    unpaid?: number;
    availableSlots: number;
    attended: number;
    noShow: number;
    excused: number;
    pending: number;
  };
}

export interface ClassRosterResponse {
  schedule: ClassSchedule;
  stats: {
    totalEnrolled: number;
    pendingValidationCount?: number;
    unpaidCount?: number;
    attendedCount: number;
    noShowCount: number;
    excusedCount: number;
    pendingCount: number;
  };
  roster: Booking[];
}

export interface UpdateAttendancePayload {
  attendanceStatus: AttendanceStatus;
  notes?: string;
}

export interface BulkAttendanceItem {
  bookingId: string;
  attendanceStatus: AttendanceStatus;
  notes?: string;
}

export interface QueryAttendanceParams {
  date?: string;
  branchId?: string;
  status?: string;
  all?: boolean;
}
