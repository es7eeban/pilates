import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

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
};

export const classTypesApi = {
  async getAll(): Promise<import('../types/schedule').ClassType[]> {
    const res = await fetch(`${API_BASE_URL}/class-types`);
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
};
