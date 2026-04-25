import { create } from 'zustand';
import { authApi } from '../services/api';

interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login({ username, password });
      localStorage.setItem('token', data.access_token);
      set({ token: data.access_token, isLoading: false });
      // 直接使用登录返回的用户信息
      set({ user: data.user });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    set({ isLoading: true });
    try {
      const { data } = await authApi.me();
      set({ user: data, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

// 角色权限检查
export const hasRole = (user: User | null, roles: string[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role.code);
};

// 路由映射：根据角色返回首页路径
export const getHomePath = (roleCode: string): string => {
  const roleHomeMap: Record<string, string> = {
    admin: '/admin/dashboard',
    sales_manager: '/manager/dashboard',
    sales_consultant: '/consultant/dashboard',
    finance_staff: '/office/finance',
    receptionist: '/consultant/customers/add',
    channel_manager: '/channel/dashboard',
    risk_controller: '/channel/dashboard',
    distributor: '/distributor/dashboard',
    office_staff: '/office/dashboard',
  };
  return roleHomeMap[roleCode] || '/login';
};
