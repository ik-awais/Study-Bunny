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
      // Added ?additional_types=episode to support Podcasts
      const res = await fetch('https://api.spotify.com/v1/me/player?additional_types=episode', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (res.status === 401) {
        console.warn("Spotify token expired. Logging out.");
        return logout(); 
      }
      
      if (res.status === 204) {
        console.log("Spotify API returned 204 (No Content). Spotify's servers do not see an active device for this account.");
        set({ currentTrack: null, isPlaying: false });
        return;
      }
      
      if (res.status > 400) {
        console.error("Spotify API returned an error:", res.status);
        set({ currentTrack: null, isPlaying: false });
        return;
      }
      
      const data = await res.json();
      console.log("Spotify API Response payload:", data); // Tells us exactly what Spotify sees
      
      set({ currentTrack: data.item, isPlaying: data.is_playing });
    } catch (e) { 
      console.error("Spotify fetch error:", e); 
    }
  }
}));