import { create } from 'zustand';

interface SpotifyState {
  accessToken: string | null;
  currentTrack: any | null;
  isPlaying: boolean;
  setToken: (token: string) => void;
  fetchPlaybackState: () => Promise<void>;
  logout: () => void;
}

export const useSpotifyStore = create<SpotifyState>()((set, get) => ({
  accessToken: localStorage.getItem('spotify_access_token'),
  currentTrack: null,
  isPlaying: false,

  setToken: (token) => {
    localStorage.setItem('spotify_access_token', token);
    set({ accessToken: token });
    get().fetchPlaybackState();
  },

  logout: () => {
    localStorage.removeItem('spotify_access_token');
    set({ accessToken: null, currentTrack: null, isPlaying: false });
  },

  fetchPlaybackState: async () => {
    const { accessToken, logout } = get();
    if (!accessToken) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.status === 401) return logout(); // Token expired
      if (res.status === 204 || res.status > 400) {
        set({ currentTrack: null, isPlaying: false });
        return;
      }
      const data = await res.json();
      set({ currentTrack: data.item, isPlaying: data.is_playing });
    } catch (e) { console.error(e); }
  }
}));