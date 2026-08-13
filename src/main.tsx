import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initDB } from './lib/db'
import { useTimerStore } from './store/useTimerStore'
import { useDataStore } from './store/useDataStore'
import { useSettingsStore } from './store/useSettingsStore'

// Bootstrap Systems safely without OAuth intercepts
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