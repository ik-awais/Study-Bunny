import { useRef } from 'react';
import { Card, Button, Input } from '../components/ui/SharedUI';
import { Mic, Palette, Download, Info, Bell, Upload } from 'lucide-react';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';

export const SettingsView = () => {
  const { state: voiceStatus, toggleVoice } = useVoiceCommand();
  const { user, logout, requestDriveAccess } = useAuthStore();
  const { syncToDrive, restoreFromDriveBackup } = useDataStore();
  
  const isSupported = voiceStatus !== 'UNSUPPORTED';
  const isListening = voiceStatus === 'LISTENING';
  const hasPermission = voiceStatus !== 'DENIED';
  const toggleListening = () => toggleVoice();
  const { settings, updateSetting, requestNotificationPermission, exportData, importData } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if(window.confirm("Importing will overwrite your current data. Continue?")) {
        importData(e.target.files[0]);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in pb-10">
      <h1 className="text-3xl font-rounded font-bold">Settings</h1>
      
      {/* Account & Sync */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold font-rounded mb-6">Account & Sync</h2>
        
        {user && (
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 bg-bunny-cream/50 rounded-2xl border border-bunny-border">
            <img src={user.picture} alt="Profile" className="w-12 h-12 rounded-full border-2 border-bunny-primary/20" />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-bunny-text leading-tight">{user.name}</p>
              <p className="text-xs text-bunny-muted">{user.email}</p>
            </div>
            <Button onClick={logout} variant="outline" className="text-xs py-1.5 px-4 text-bunny-error border-bunny-error/30 hover:bg-bunny-error/10">Sign Out</Button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-bunny-cream rounded-2xl border border-bunny-border">
            <div>
              <p className="font-bold text-sm">Google Drive Backup</p>
              <p className="text-xs text-bunny-muted">Securely back up your local data to a private Drive folder.</p>
            </div>
            {!user?.hasDriveAccess ? (
              <Button onClick={requestDriveAccess} className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 shadow-sm">Connect Drive</Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={syncToDrive} variant="outline" className="text-xs py-1.5">Backup Now</Button>
                <Button onClick={restoreFromDriveBackup} className="text-xs py-1.5 bg-bunny-primary">Restore</Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Timer Preferences */}
      <Card className="space-y-6">
        <div className="flex items-center gap-3 border-b border-bunny-border pb-4">
          <Bell className="w-5 h-5 text-bunny-primary" />
          <h2 className="font-bold font-rounded text-lg">Timer & Notifications</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-bunny-muted">Focus Duration (min)</label>
            <Input type="number" min="1" value={settings.pomodoroFocusMins} onChange={e => updateSetting('pomodoroFocusMins', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium text-bunny-muted">Short Break (min)</label>
            <Input type="number" min="1" value={settings.pomodoroShortBreakMins} onChange={e => updateSetting('pomodoroShortBreakMins', Number(e.target.value))} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="font-medium">Browser Notifications</p>
            <p className="text-sm text-bunny-muted">Get alerted when timers finish.</p>
          </div>
          <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => {
            if (e.target.checked) requestNotificationPermission();
            else updateSetting('notificationsEnabled', false);
          }} className="w-5 h-5 accent-bunny-primary" />
        </div>
      </Card>

      {/* Voice Controls */}
      <Card className="space-y-6">
        <div className="flex items-center gap-3 border-b border-bunny-border pb-4">
          <Mic className="w-5 h-5 text-bunny-primary" />
          <h2 className="font-bold font-rounded text-lg">Voice Controls</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium">Web Speech Engine</p>
            <p className="text-sm text-bunny-muted">Say "Start timer" or "Pause timer". Only active when mic is toggled on.</p>
            {hasPermission === false && <p className="text-xs text-bunny-error mt-1">Permission denied by browser.</p>}
          </div>
          <Button variant={isListening ? 'primary' : 'outline'} onClick={toggleListening} disabled={!isSupported}>
            {isListening ? 'Listening...' : 'Test Microphone'}
          </Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="space-y-6">
        <div className="flex items-center gap-3 border-b border-bunny-border pb-4">
          <Palette className="w-5 h-5 text-bunny-primary" />
          <h2 className="font-bold font-rounded text-lg">Appearance & Animation</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Reduced Motion</p>
            <p className="text-sm text-bunny-muted">Overrides ambient animations for accessibility.</p>
          </div>
          <input type="checkbox" checked={settings.reducedMotion} onChange={e => updateSetting('reducedMotion', e.target.checked)} className="w-5 h-5 accent-bunny-primary" />
        </div>
      </Card>

      {/* Data Management */}
      <Card className="space-y-6">
        <div className="flex items-center gap-3 border-b border-bunny-border pb-4">
          <Download className="w-5 h-5 text-bunny-primary" />
          <h2 className="font-bold font-rounded text-lg">Data Management (Local First)</h2>
        </div>
        <p className="text-sm text-bunny-muted">Your data is stored strictly on your device. Export it to back it up.</p>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={exportData}><Download className="w-4 h-4" /> Export Data</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" /> Import Data</Button>
          <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </Card>
      
      <div className="text-center pt-8 text-bunny-muted text-xs flex items-center justify-center gap-2">
        <Info className="w-4 h-4" /> Study Bunny v1.0 • PWA Ready
      </div>
    </div>
  );
};