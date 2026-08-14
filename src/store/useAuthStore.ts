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
    // 1. Strict Environment Guard
    if (!CLIENT_ID || CLIENT_ID === 'undefined') {
      useToastStore.getState().addToast('System Error: Missing Google Client ID.', 'error');
      console.error("Authentication Blocked: VITE_GOOGLE_CLIENT_ID is missing in your environment variables.");
      return;
    }

    // 2. Strict Script Load Guard
    if (!window.google?.accounts?.oauth2) {
      useToastStore.getState().addToast('Google Auth script is blocked or still loading.', 'error');
      return;
    }
    
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid email profile',
        
        // 3. Strict Popup & Network Error Handling
        error_callback: (error: any) => {
          console.error("Google Auth Error:", error);
          if (error?.type === 'popup_closed') {
            useToastStore.getState().addToast('Google login canceled.', 'info');
          } else if (error?.type === 'popup_failed_to_open') {
            useToastStore.getState().addToast('Popup blocked by browser. Please allow popups.', 'error');
          } else {
            useToastStore.getState().addToast('Google authentication failed.', 'error');
          }
        },
        
        callback: async (response: any) => {
          if (response.error) {
            console.error("Auth callback error:", response);
            return useToastStore.getState().addToast('Login rejected by Google.', 'error');
          }
          
          try {
            // Fetch User Identity using the token
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            
            if (!res.ok) throw new Error("Failed to fetch user profile from Google");
            
            const profile = await res.json();
            
            const user: AuthUser = {
              id: profile.sub,
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
          } catch (err) {
            console.error("Profile fetch error:", err);
            useToastStore.getState().addToast('Failed to load user profile.', 'error');
          }
        }
      });
      client.requestAccessToken();
    } catch (err) {
      console.error("Google Auth Initialization Error:", err);
      useToastStore.getState().addToast('Failed to initialize Google Auth.', 'error');
    }
  },

  requestDriveAccess: () => {
    if (!CLIENT_ID) return useToastStore.getState().addToast('Missing Google Client ID.', 'error');
    
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid email profile https://www.googleapis.com/auth/drive.appdata',
        error_callback: (error: any) => {
          if (error?.type === 'popup_closed') useToastStore.getState().addToast('Drive connection canceled.', 'info');
          else useToastStore.getState().addToast('Failed to connect Drive.', 'error');
        },
        callback: (response: any) => {
          if (response.error) return;
          const updatedUser = { ...get().user!, accessToken: response.access_token, hasDriveAccess: true };
          localStorage.setItem('sb_auth_session', JSON.stringify(updatedUser));
          set({ user: updatedUser });
          useToastStore.getState().addToast('Google Drive connected.', 'success');
        }
      });
      client.requestAccessToken();
    } catch (e) {
      useToastStore.getState().addToast('Failed to initialize Drive Auth.', 'error');
    }
  },

  logout: () => {
    localStorage.removeItem('sb_auth_session');
    set({ user: null });
    useDataStore.getState().clearData(); 
    useToastStore.getState().addToast('Signed out successfully.', 'info');
  }
}));