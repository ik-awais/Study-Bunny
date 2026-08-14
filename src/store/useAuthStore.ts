import { create } from 'zustand';
import { migrateAnonymousData } from '../lib/db';
import { useDataStore } from './useDataStore';
import { useToastStore } from './useToastStore';

declare global {
  interface Window {
    google: any;
  }
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  hasDriveAccess: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isInitialized: boolean;
  login: () => void;
  logout: () => void;
  requestDriveAccess: () => void;
  checkSession: () => void;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isInitialized: false,

  checkSession: () => {
    const saved = localStorage.getItem('sb_auth_session');
    if (saved) {
      set({ user: JSON.parse(saved), isInitialized: true });
      useDataStore.getState().refreshAll(JSON.parse(saved).id);
    } else {
      set({ isInitialized: true });
    }
  },

  login: () => {
    if (!window.google) return useToastStore.getState().addToast('Google Auth failed to load.', 'error');
    
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile',
      callback: async (response: any) => {
        if (response.error) return useToastStore.getState().addToast('Login failed.', 'error');
        
        // Fetch User Identity using the token
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` }
        });
        const profile = await res.json();
        
        const user: AuthUser = {
          id: profile.sub, // The canonical Google ID
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          accessToken: response.access_token,
          hasDriveAccess: false
        };

        localStorage.setItem('sb_auth_session', JSON.stringify(user));
        set({ user });
        
        // Migrate legacy data & Load User Data
        await migrateAnonymousData(user.id);
        useDataStore.getState().refreshAll(user.id);
        useToastStore.getState().addToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
      }
    });
    client.requestAccessToken();
  },

  requestDriveAccess: () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile https://www.googleapis.com/auth/drive.appdata',
      callback: (response: any) => {
        if (response.error) return;
        const updatedUser = { ...get().user!, accessToken: response.access_token, hasDriveAccess: true };
        localStorage.setItem('sb_auth_session', JSON.stringify(updatedUser));
        set({ user: updatedUser });
        useToastStore.getState().addToast('Google Drive connected.', 'success');
      }
    });
    client.requestAccessToken();
  },

  logout: () => {
    localStorage.removeItem('sb_auth_session');
    set({ user: null });
    useDataStore.getState().clearData(); // Prevent data leakage
    useToastStore.getState().addToast('Signed out successfully.', 'info');
  }
}));