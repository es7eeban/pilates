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
  startTime: string;
  endTime: string;
  capacity: number;
  availableSlots: number;
  price: number | string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  classType: ClassType;
  instructor?: Instructor;
}

export interface QuerySchedulesParams {
  dateFrom?: string;
  dateTo?: string;
  classTypeId?: string;
  instructorId?: string;
  onlyAvailable?: boolean;
}
