import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) return 'http://localhost:4000/api/v1';
  const trimmed = envUrl.replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1')) {
    return `${trimmed}/api/v1`;
  }
  return trimmed;
}

const API_BASE_URL = getApiBaseUrl();

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const backendHost = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function isPdfDocument(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.pdf');
}

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('pilates_access_token'),
  getRefreshToken: () => localStorage.getItem('pilates_refresh_token'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('pilates_access_token', accessToken);
    localStorage.setItem('pilates_refresh_token', refreshToken);
  },
  clear: () => {
    localStorage.removeItem('pilates_access_token');
    localStorage.removeItem('pilates_refresh_token');
  },
};

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg =
      (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
      'Ha ocurrido un error inesperado al procesar la solicitud';
    throw new Error(errorMsg);
  }
  return data as T;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(res);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(res);
  },

  async getMe(): Promise<User> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<User>(res);
  },

  async updatePreferences(payload: import('../types/auth').UpdatePreferencesPayload): Promise<User> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/auth/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<User>(res);
  },
};

export const branchesApi = {
  async getAll(includeInactive = false): Promise<import('../types/schedule').Branch[]> {
    const res = await fetch(`${API_BASE_URL}/branches${includeInactive ? '?includeInactive=true' : ''}`);
    return handleResponse(res);
  },

  async getById(id: string): Promise<import('../types/schedule').Branch> {
    const res = await fetch(`${API_BASE_URL}/branches/${id}`);
    return handleResponse(res);
  },

  async create(payload: import('../types/admin').CreateBranchPayload): Promise<import('../types/schedule').Branch> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async update(id: string, payload: import('../types/admin').UpdateBranchPayload): Promise<import('../types/schedule').Branch> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/branches/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async remove(id: string): Promise<import('../types/schedule').Branch> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/branches/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },
};

export const usersApi = {
  async getAll(params?: import('../types/admin').QueryUsersParams): Promise<import('../types/auth').User[]> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/users${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  async getInstructors(): Promise<import('../types/schedule').Instructor[]> {
    const res = await fetch(`${API_BASE_URL}/users/instructors`);
    return handleResponse(res);
  },

  async getById(id: string): Promise<import('../types/auth').User> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  async create(payload: import('../types/admin').AdminCreateUserPayload): Promise<import('../types/auth').User> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async update(id: string, payload: import('../types/admin').AdminUpdateUserPayload): Promise<import('../types/auth').User> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async toggleActive(id: string): Promise<import('../types/auth').User> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/users/${id}/toggle-active`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },
};

export const classTypesApi = {
  async getAll(includeInactive = false): Promise<import('../types/schedule').ClassType[]> {
    const res = await fetch(`${API_BASE_URL}/class-types${includeInactive ? '?includeInactive=true' : ''}`);
    return handleResponse(res);
  },

  async create(payload: import('../types/admin').CreateClassTypePayload): Promise<import('../types/schedule').ClassType> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/class-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async update(id: string, payload: import('../types/admin').UpdateClassTypePayload): Promise<import('../types/schedule').ClassType> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/class-types/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async remove(id: string): Promise<import('../types/schedule').ClassType> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/class-types/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },
};

export const schedulesApi = {
  async getAll(params?: import('../types/schedule').QuerySchedulesParams): Promise<import('../types/schedule').ClassSchedule[]> {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.classTypeId) query.append('classTypeId', params.classTypeId);
    if (params?.instructorId) query.append('instructorId', params.instructorId);
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.onlyAvailable) query.append('onlyAvailable', 'true');

    const queryString = query.toString();
    const url = `${API_BASE_URL}/schedules${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async getById(id: string): Promise<import('../types/schedule').ClassSchedule> {
    const res = await fetch(`${API_BASE_URL}/schedules/${id}`);
    return handleResponse(res);
  },

  async create(payload: import('../types/admin').CreateSchedulePayload): Promise<import('../types/schedule').ClassSchedule> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async bulkGenerate(payload: import('../types/admin').BulkGenerateSchedulesPayload): Promise<{ count: number; schedules: import('../types/schedule').ClassSchedule[] }> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/schedules/bulk-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async cancel(id: string): Promise<import('../types/schedule').ClassSchedule> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/schedules/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },
};

export const bookingsApi = {
  async create(payload: import('../types/schedule').CreateBookingPayload): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('Debes iniciar sesión para reservar');

    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },

  async getMyBookings(): Promise<import('../types/schedule').Booking[]> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/schedule').Booking[]>(res);
  },

  async cancel(id: string): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },

  async uploadVoucher(id: string, voucherUrl: string): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/bookings/${id}/upload-voucher`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ voucherUrl }),
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },

  async uploadVoucherDirect(file: File): Promise<{ url: string; filename: string; originalName: string; size: number; mimetype: string }> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/bookings/upload-voucher`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>(res);
  },

  async uploadVoucherFile(id: string, file: File): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/bookings/${id}/upload-voucher-file`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },

  // Endpoints administrativos
  async getPendingVouchers(): Promise<import('../types/schedule').Booking[]> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/bookings/admin/pending-vouchers`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/schedule').Booking[]>(res);
  },

  async approveVoucher(id: string): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/bookings/admin/${id}/approve-voucher`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },

  async rejectVoucher(id: string, reason: string): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/bookings/admin/${id}/reject-voucher`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },
};

export const attendanceApi = {
  async getMyClasses(params?: import('../types/attendance').QueryAttendanceParams): Promise<import('../types/attendance').InstructorClassSchedule[]> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.status) query.append('status', params.status);
    if (params?.all) query.append('all', 'true');

    const queryString = query.toString();
    const url = `${API_BASE_URL}/attendance/my-classes${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/attendance').InstructorClassSchedule[]>(res);
  },

  async getClassRoster(scheduleId: string): Promise<import('../types/attendance').ClassRosterResponse> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/attendance/classes/${scheduleId}/roster`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/attendance').ClassRosterResponse>(res);
  },

  async updateAttendance(
    bookingId: string,
    payload: import('../types/attendance').UpdateAttendancePayload,
  ): Promise<import('../types/schedule').Booking> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/attendance/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<import('../types/schedule').Booking>(res);
  },

  async bulkAttendance(
    scheduleId: string,
    attendees: import('../types/attendance').BulkAttendanceItem[],
  ): Promise<import('../types/attendance').ClassRosterResponse> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/attendance/classes/${scheduleId}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ attendees }),
    });
    return handleResponse<import('../types/attendance').ClassRosterResponse>(res);
  },

  async updateScheduleStatus(
    scheduleId: string,
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  ): Promise<import('../types/schedule').ClassSchedule> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/attendance/classes/${scheduleId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<import('../types/schedule').ClassSchedule>(res);
  },
};

export const notificationsApi = {
  async getMy(): Promise<import('../types/notification').MyNotificationsResponse> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/notifications/my`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/notification').MyNotificationsResponse>(res);
  },

  async markAsRead(id: string): Promise<import('../types/notification').AppNotification> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/notification').AppNotification>(res);
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getAdminLogs(limit = 100): Promise<import('../types/notification').AppNotification[]> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/notifications/admin/logs?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<import('../types/notification').AppNotification[]>(res);
  },
};

export const waitlistApi = {
  async join(scheduleId: string): Promise<{ message: string; entry: import('../types/waitlist').WaitlistEntry; waitlistCount: number; waitlistMax: number }> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/waitlist/schedules/${scheduleId}/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  async accept(
    scheduleId: string,
    payload: { paymentMethod: import('../types/schedule').PaymentMethod; voucherUrl?: string },
  ): Promise<{ message: string; booking: import('../types/schedule').Booking }> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/waitlist/schedules/${scheduleId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async decline(scheduleId: string): Promise<{ success: boolean; message: string }> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/waitlist/schedules/${scheduleId}/decline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  async getMyStatus(scheduleId: string): Promise<import('../types/waitlist').WaitlistStatusResponse> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/waitlist/schedules/${scheduleId}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  async getMyEntries(): Promise<import('../types/waitlist').WaitlistEntry[]> {
    const token = tokenStorage.getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const res = await fetch(`${API_BASE_URL}/waitlist/my-entries`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  },

  async getSummary(scheduleId: string): Promise<import('../types/waitlist').WaitlistSummaryResponse> {
    const res = await fetch(`${API_BASE_URL}/waitlist/schedules/${scheduleId}/summary`);
    return handleResponse(res);
  },
};


