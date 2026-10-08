export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  commune?: string;
  city: string;
  phone?: string;
  isActive: boolean;
}

export interface ClassType {
  id: string;
  title: string;
  description?: string;
  defaultCapacity: number;
  defaultPrice: number | string;
  durationMinutes: number;
  intensityLevel: string;
  isActive: boolean;
}

export interface Instructor {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isInstructor: boolean;
}

export interface ClassSchedule {
  id: string;
  classTypeId: string;
  instructorId?: string;
  branchId?: string;
  startTime: string;
  endTime: string;
  capacity: number;
  availableSlots: number;
  price: number | string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  classType: ClassType;
  branch?: Branch;
  instructor?: Instructor;
}

export interface QuerySchedulesParams {
  dateFrom?: string;
  dateTo?: string;
  classTypeId?: string;
  instructorId?: string;
  branchId?: string;
  onlyAvailable?: boolean;
}

export interface Booking {
  id: string;
  userId?: string;
  scheduleId: string;
  bookingCode: string;
  status: 'PENDIENTE_PAGO' | 'PENDIENTE_VALIDACION' | 'CONFIRMADA' | 'CANCELADA_CLIENTE' | 'RECHAZADA_ADMIN' | 'FINALIZADA';
  paymentMethod: 'GATEWAY' | 'TRANSFER';
  voucherUrl?: string;
  rejectionReason?: string;
  expiresAt?: string;
  createdAt: string;
  schedule: ClassSchedule;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  payment?: {
    id: string;
    amount: number | string;
    currency: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    gatewayProvider: string;
  };
}

export interface CreateBookingPayload {
  scheduleId: string;
  paymentMethod: 'GATEWAY' | 'TRANSFER';
  voucherUrl?: string;
}
