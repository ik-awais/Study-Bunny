import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initDB } from './lib/db'
import { useTimerStore } from './store/useTimerStore'
import { useDataStore } from './store/useDataStore'
import { useSettingsStore } from './store/useSettingsStore'
import { getSpotifyToken } from './lib/spotify'
import { useSpotifyStore } from './store/useSpotifyStore'

// Spotify PKCE Interceptor
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
if (code) {
  getSpotifyToken(code).then(data => {
    if (data.access_token) useSpotifyStore.getState().setToken(data.access_token);
    window.history.replaceState({}, document.title, "/");
  }).catch(console.error);
} else {
  useSpotifyStore.getState().fetchPlaybackState();
}

// Bootstrap Systems safely
initDB()
  .then(async () => {
    await useSettingsStore.getState().loadSettings();
    await useDataStore.getState().refreshAll();
    await useTimerStore.getState().recoverState();
  })
  .catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)