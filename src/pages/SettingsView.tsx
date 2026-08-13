import { useRef } from 'react';
import { Card, Button, Input } from '../components/ui/SharedUI';
import { Mic, Palette, Download, Info, Bell, Upload } from 'lucide-react';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { useSettingsStore } from '../store/useSettingsStore';

export const SettingsView = () => {
  const { isSupported, isListening, toggleListening, hasPermission } = useVoiceCommand();
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