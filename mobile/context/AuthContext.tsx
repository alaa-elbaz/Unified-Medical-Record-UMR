import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { router } from 'expo-router';
import api, { warmUpServer, tokenStorage } from '../services/api';

export type UserRole = 'patient' | 'doctor' | 'hospital' | 'lab' | 'pharmacy' | 'admin' | 'super_admin';

export interface User {
  _id: string;
  fullName?: string;
  name?: string;
  nationalId?: string;
  email: string;
  role: UserRole;
  status: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  // patient fields
  bloodType?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  dateOfBirth?: string;
  gender?: string;
  mothersName?: string;
  emergencyContact?: string;
  // doctor fields
  specialty?: string;
  syndicateNumber?: string;
  // org fields
  healthRegNumber?: string;
  sectorType?: string;
  description?: string;
  bedCount?: number;
  departmentCount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    nationalId: string | null,
    loginType?: 'individual' | 'organization',
    healthRegNumber?: string
  ) => Promise<any>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshUserData: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function getDisplayName(user: User | null): string {
  if (!user) return '';
  return user.fullName || user.name || user.email;
}

export function getHomeRoute(role: UserRole | string): string {
  switch (role) {
    case 'patient':
    case 'doctor':
      return '/(tabs)/home';
    case 'hospital':
      return '/(hospital)/home';
    case 'lab':
      return '/(lab)/home';
    case 'pharmacy':
      return '/(pharmacy)/home';
    case 'admin':
    case 'super_admin':
      return '/(admin)/home';
    default:
      return '/(tabs)/home';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const userObj = data.user;
      if (userObj.id && !userObj._id) userObj._id = userObj.id;
      setUser(userObj);
      await AsyncStorage.setItem('umr_user', JSON.stringify(userObj));
      return userObj;
    } catch (err) {
      console.warn('[AuthContext] Failed to refresh user data', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await tokenStorage.get();
        const storedUser = await AsyncStorage.getItem('umr_user');

        if (!token) {
          setIsLoading(false);
          return;
        }

        // Show cached user immediately (instant UI)
        if (storedUser) {
          try {
            const cachedUser = JSON.parse(storedUser);
            if (cachedUser.id && !cachedUser._id) cachedUser._id = cachedUser.id;
            setUser(cachedUser);
          } catch { /* ignore */ }
        }

        // Don't block on warmUpServer — it could waste up to 10 seconds at
        // every cold launch on a slow Render free-tier. Fire it in the
        // background as a hint and race /auth/me directly. /auth/me itself
        // wakes the dyno just as effectively.
        warmUpServer().catch(() => { /* noop */ });

        try {
          await refreshUserData();
        } catch (err: any) {
          // Only logout if the server explicitly rejected the token (401/403).
          // Network errors (no response) mean connectivity issue — keep cached user.
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            await tokenStorage.remove();
            await AsyncStorage.removeItem('umr_user');
            setUser(null);
          } else {
            console.warn('[AuthContext] Network issue, using cached user');
            // Keep the cached user — don't logout on network failure
          }
        }
      } catch (e) {
        console.error('Error loading auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();

    const sub = DeviceEventEmitter.addListener('onTokenExpired', () => {
      setUser(null);
      router.replace('/login');
    });

    return () => sub.remove();
  }, [refreshUserData]);

  const login = useCallback(async (
    email: string,
    nationalId: string | null,
    loginType: 'individual' | 'organization' = 'individual',
    healthRegNumber?: string
  ) => {
    const payload: Record<string, any> = { email, loginType };
    if (loginType === 'individual') {
      payload.nationalId = nationalId;
    } else {
      payload.healthRegNumber = healthRegNumber;
    }

    const { data } = await api.post('/auth/login', payload);

    const userObj = data.user;
    if (userObj.id && !userObj._id) userObj._id = userObj.id;

    await tokenStorage.set(data.token);
    await AsyncStorage.setItem('umr_user', JSON.stringify(userObj));
    setUser(userObj);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await tokenStorage.remove();
    await AsyncStorage.removeItem('umr_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, setUser, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
