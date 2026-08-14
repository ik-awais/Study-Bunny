import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initDB } from './lib/db'
import { useTimerStore } from './store/useTimerStore'
import { useDataStore } from './store/useDataStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useAuthStore } from './store/useAuthStore';

// Bootstrap Systems safely without OAuth intercepts
initDB()
  .then(async () => {
    await useSettingsStore.getState().loadSettings();
    const user = useAuthStore.getState().user;
    if (user) {
      await useDataStore.getState().refreshAll(user.id);
    }
    await useTimerStore.getState().recoverState();
  })
  .catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)