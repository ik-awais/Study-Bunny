import { useState } from 'react';
import { Music, Settings, X, ExternalLink, Info, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from '../ui/SharedUI';
import { useSettingsStore } from '../../store/useSettingsStore';

export const SpotifyWidget = () => {
  const { settings, updateSetting } = useSettingsStore();
  const [inputUrl, setInputUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleSave = () => {
    try {
      if (!inputUrl) return;
      const url = new URL(inputUrl);
      const path = url.pathname; 
      
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
             <button onClick={() => setIsEditing(false)} className="text-bunny-muted hover:text-bunny-primary transition-colors">
               <X className="w-4 h-4"/>
             </button>
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

  if (showInfo) {
    return (
      <Card className="flex flex-col justify-between h-[220px] bg-bunny-card border-bunny-border p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-bunny-primary">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Playback Info</span>
          </div>
          <button onClick={() => setShowInfo(false)} className="text-bunny-muted hover:text-bunny-primary transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="text-xs text-bunny-muted space-y-2 flex-1 overflow-y-auto pr-1">
          <p><strong>Why are tracks only 30 seconds?</strong></p>
          <p>1. Your browser is blocking third-party cookies (common in Brave, Safari, and Incognito mode), preventing Spotify from seeing your login.</p>
          <p>2. You are using a <strong>Spotify Free</strong> account. Spotify officially restricts embeds to 30-second previews for Free users.</p>
          <p>To hear full tracks, open the playlist directly in the Spotify app.</p>
        </div>
        <a href={settings.spotifyEmbedUrl.replace('/embed', '')} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-bunny-cream hover:bg-bunny-blush text-bunny-primary font-bold text-xs py-2 rounded-xl transition-colors mt-2 border border-bunny-border">
          Open in Spotify <ExternalLink className="w-3 h-3" />
        </a>
      </Card>
    );
  }

  // Generate the raw iframe HTML exactly as Spotify documents it.
  // Using dangerouslySetInnerHTML ensures React does not strip or alter the `allow` attributes or DRM permissions.
  const iframeHtml = `
    <iframe 
      style="border-radius:0; width:100%; height:100%; border:none;" 
      src="${settings.spotifyEmbedUrl}" 
      allowfullscreen="" 
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
      loading="lazy">
    </iframe>
  `;

  return (
    <Card className="flex flex-col h-[220px] bg-bunny-card p-0 overflow-hidden border-bunny-border">
      <div className="flex justify-between items-center p-3 border-b border-bunny-border/50 bg-bunny-cream/30">
        <div className="flex items-center gap-2 text-[#1DB954]">
          <Music className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider uppercase">Player</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowInfo(true)} className="text-bunny-muted hover:text-bunny-primary transition-colors" title="Playback Info">
            <Info className="w-4 h-4" />
          </button>
          <a href={settings.spotifyEmbedUrl.replace('/embed', '')} target="_blank" rel="noreferrer" className="text-bunny-muted hover:text-[#1DB954] transition-colors" title="Open in Spotify">
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={() => setIsEditing(true)} className="text-bunny-muted hover:text-bunny-primary transition-colors" title="Change Playlist">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 
        Inject raw HTML. 
        This is the only guaranteed way to prevent React synthetic DOM from altering DRM permissions. 
      */}
      <div className="flex-1 bg-bunny-cream" dangerouslySetInnerHTML={{ __html: iframeHtml }} />
    </Card>
  );
};