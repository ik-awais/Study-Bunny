import { useState, memo } from 'react';
import { Music, Settings, X, ExternalLink, Info, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Card, Button, Input } from '../ui/SharedUI';
import { useSettingsStore } from '../../store/useSettingsStore';

// 🚀 PERFORMANCE FIX: This strictly memoized component guarantees the iframe 
// is NEVER re-rendered, destroyed, or re-injected by React unless the actual URL changes.
const StaticSpotifyIframe = memo(({ url }: { url: string }) => {
  const iframeHtml = `
    <iframe 
      style="border-radius:0; width:100%; height:100%; border:none;" 
      src="${url}" 
      allowfullscreen="" 
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
      loading="lazy">
    </iframe>
  `;
  return <div className="w-full h-full bg-bunny-cream" dangerouslySetInnerHTML={{ __html: iframeHtml }} />;
}, (prev, next) => prev.url === next.url);

export const SpotifyWidget = memo(() => {
  const { settings, updateSetting } = useSettingsStore();
  const [activeModal, setActiveModal] = useState<'none' | 'change' | 'settings' | 'info'>('none');
  const [inputUrl, setInputUrl] = useState('');

  const handleSaveUrl = () => {
    try {
      if (!inputUrl) return;
      const url = new URL(inputUrl);
      let path = url.pathname; 
      
      // Ensure the path includes /embed so standard URLs work automatically
      if (!path.startsWith('/embed')) {
        path = '/embed' + path.replace(/^\//, '');
      }
      
      const embedUrl = `https://open.spotify.com${path}?utm_source=generator`;
      updateSetting('spotifyEmbedUrl', embedUrl);
      setActiveModal('none');
      setInputUrl('');
    } catch (e) {
      console.error("Invalid URL provided");
    }
  };

  const handleRemoveSpotify = () => {
    updateSetting('spotifyEmbedUrl', '');
    setActiveModal('none');
  };

  // EMPTY STATE (No Configuration)
  if (!settings.spotifyEmbedUrl) {
    return (
      <Card className="flex flex-col items-center justify-center text-center space-y-4 h-[220px] bg-bunny-card border-bunny-border relative overflow-hidden">
        <div className="flex justify-between items-center w-full mb-1 absolute top-3 left-3 right-3">
          <div className="flex items-center gap-2 text-[#1DB954]">
            <Music className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">Spotify</span>
          </div>
          {activeModal === 'change' && (
             <button onClick={() => setActiveModal('none')} className="text-bunny-muted hover:text-bunny-primary transition-colors">
               <X className="w-4 h-4"/>
             </button>
          )}
        </div>
        
        {activeModal === 'change' ? (
          <div className="w-full px-4 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-sm font-medium text-bunny-text">Add a Study Playlist</p>
            <p className="text-xs text-bunny-muted mb-3">Paste a Spotify Playlist or Album link</p>
            <Input 
              placeholder="https://open.spotify.com/..." 
              value={inputUrl} 
              onChange={e => setInputUrl(e.target.value)}
              className="text-xs py-2 mb-2"
            />
            <Button onClick={handleSaveUrl} className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white border-none shadow-sm text-sm py-2">
              Save Embed
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#1DB954]/10 rounded-full flex items-center justify-center text-[#1DB954] mb-3">
              <Music className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-bunny-text">No music selected</p>
            <Button onClick={() => setActiveModal('change')} variant="ghost" className="mt-2 text-[#1DB954] hover:bg-[#1DB954]/10">
              Add Spotify Playlist
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // ACTIVE STATE (Embed Loaded)
  return (
    <Card className="relative flex flex-col h-[220px] bg-bunny-card p-0 overflow-hidden border-bunny-border">
      
      {/* Permanent Header */}
      <div className="flex justify-between items-center p-2.5 border-b border-bunny-border/50 bg-bunny-cream/50 z-10 relative">
        <div className="flex items-center gap-2 text-[#1DB954]">
          <Music className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider uppercase">Player</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveModal('info')} className="text-bunny-muted hover:text-bunny-primary transition-colors" title="Playback Info" aria-label="Playback Info">
            <Info className="w-4 h-4" />
          </button>
          <a href={settings.spotifyEmbedUrl.replace('/embed', '')} target="_blank" rel="noreferrer" className="text-bunny-muted hover:text-[#1DB954] transition-colors" title="Open in Spotify App" aria-label="Open in Spotify App">
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={() => setActiveModal('change')} className="text-bunny-muted hover:text-bunny-primary transition-colors" title="Change Playlist" aria-label="Change Playlist">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveModal('settings')} className="text-bunny-muted hover:text-bunny-primary transition-colors" title="Spotify Settings" aria-label="Spotify Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Permanent Background Iframe - STAYS ALIVE during all modals */}
      <div className="flex-1 relative z-0">
        <StaticSpotifyIframe url={settings.spotifyEmbedUrl} />
      </div>

      {/* OVERLAY: Change Playlist */}
      {activeModal === 'change' && (
        <div className="absolute inset-0 z-20 bg-bunny-card/95 backdrop-blur-sm p-4 flex flex-col justify-center animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold uppercase tracking-wider text-bunny-primary">Change Music</span>
            <button onClick={() => setActiveModal('none')} className="text-bunny-muted hover:text-bunny-text"><X className="w-4 h-4"/></button>
          </div>
          <Input 
            placeholder="Paste new Spotify link..." 
            value={inputUrl} 
            onChange={e => setInputUrl(e.target.value)}
            className="text-xs py-2 mb-3"
          />
          <div className="flex gap-2">
            <Button onClick={() => setActiveModal('none')} variant="ghost" className="flex-1 py-2 text-xs">Cancel</Button>
            <Button onClick={handleSaveUrl} className="flex-1 py-2 text-xs bg-[#1DB954] hover:bg-[#1ed760] text-white border-none shadow-sm">Replace</Button>
          </div>
        </div>
      )}

      {/* OVERLAY: Settings */}
      {activeModal === 'settings' && (
        <div className="absolute inset-0 z-20 bg-bunny-card/95 backdrop-blur-sm p-4 flex flex-col justify-between animate-in fade-in duration-200">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-bunny-primary">Widget Settings</span>
              <button onClick={() => setActiveModal('none')} className="text-bunny-muted hover:text-bunny-text"><X className="w-4 h-4"/></button>
            </div>
            <p className="text-xs text-bunny-muted mb-4">This module relies on the official Spotify Embed platform. Preferences are handled automatically by your browser.</p>
          </div>
          <Button onClick={handleRemoveSpotify} variant="outline" className="w-full text-bunny-error border-bunny-error/30 hover:bg-bunny-error/10 py-2 text-xs flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Remove Playlist
          </Button>
        </div>
      )}

      {/* OVERLAY: Playback Info */}
      {activeModal === 'info' && (
        <div className="absolute inset-0 z-20 bg-bunny-card/95 backdrop-blur-sm p-4 flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-bunny-primary">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Playback Info</span>
            </div>
            <button onClick={() => setActiveModal('none')} className="text-bunny-muted hover:text-bunny-text"><X className="w-4 h-4"/></button>
          </div>
          <div className="text-xs text-bunny-muted space-y-2 flex-1 overflow-y-auto pr-1 mt-2">
            <p><strong>Why are tracks only 30 seconds?</strong></p>
            <p>1. Your browser is blocking third-party cookies (Brave/Incognito mode), preventing Spotify from seeing your login.</p>
            <p>2. You are using a <strong>Spotify Free</strong> account. Embeds are officially restricted to previews for Free users.</p>
          </div>
          <a href={settings.spotifyEmbedUrl.replace('/embed', '')} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-bunny-cream hover:bg-bunny-blush text-bunny-primary font-bold text-xs py-2 rounded-xl transition-colors mt-2 border border-bunny-border">
            Open in Spotify App <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

    </Card>
  );
});