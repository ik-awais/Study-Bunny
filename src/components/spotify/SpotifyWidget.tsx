import { useState } from 'react';
import { Music, Settings, X, ExternalLink } from 'lucide-react';
import { Card, Button, Input } from '../ui/SharedUI';
import { useSettingsStore } from '../../store/useSettingsStore';

export const SpotifyWidget = () => {
  const { settings, updateSetting } = useSettingsStore();
  const [inputUrl, setInputUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    try {
      if (!inputUrl) return;
      const url = new URL(inputUrl);
      const path = url.pathname; // Extracts e.g. /playlist/37i9dQZF1DXcBWIGoYBM5M
      
      // Convert standard URL into Spotify's official iFrame Embed URL
      const embedUrl = `https://open.spotify.com/embed${path}?utm_source=generator`;
      updateSetting('spotifyEmbedUrl', embedUrl);
      setIsEditing(false);
      setInputUrl('');
    } catch (e) {
      console.error("Invalid URL");
    }
  };

  if (!settings.spotifyEmbedUrl || isEditing) {
    return (
      <Card className="flex flex-col items-center justify-center text-center space-y-4 h-[220px] bg-bunny-card border-bunny-border">
        <div className="flex justify-between items-center w-full mb-1">
          <div className="flex items-center gap-2 text-[#1DB954]">
            <Music className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">Spotify</span>
          </div>
          {isEditing && settings.spotifyEmbedUrl && (
             <button onClick={() => setIsEditing(false)} className="text-bunny-muted hover:text-bunny-primary transition-colors"><X className="w-4 h-4"/></button>
          )}
        </div>
        
        <p className="text-sm font-medium text-bunny-text">Add a Study Playlist</p>
        <p className="text-xs text-bunny-muted mb-2">Paste a Spotify Playlist or Album link</p>
        
        <Input 
          placeholder="https://open.spotify.com/..." 
          value={inputUrl} 
          onChange={e => setInputUrl(e.target.value)}
          className="text-xs py-2"
        />
        <Button onClick={handleSave} className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white border-none shadow-sm text-sm py-2">
          Save Embed
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[220px] bg-bunny-card p-0 overflow-hidden border-bunny-border">
      <div className="flex justify-between items-center p-3 border-b border-bunny-border/50 bg-bunny-cream/30">
        <div className="flex items-center gap-2 text-[#1DB954]">
          <Music className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider uppercase">Player</span>
        </div>
        <div className="flex gap-3">
          <a href={settings.spotifyEmbedUrl.replace('/embed', '')} target="_blank" rel="noreferrer" className="text-bunny-muted hover:text-[#1DB954] transition-colors" title="Open in Spotify">
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={() => setIsEditing(true)} className="text-bunny-muted hover:text-bunny-primary transition-colors" title="Change Playlist">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-bunny-cream">
        <iframe 
          style={{ borderRadius: '0' }} 
          src={settings.spotifyEmbedUrl} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          allowFullScreen 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        ></iframe>
      </div>
    </Card>
  );
};