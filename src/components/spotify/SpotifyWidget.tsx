import { useEffect } from 'react';
import { Music, ExternalLink, Settings } from 'lucide-react';
import { Card, Button } from '../ui/SharedUI';
import { useSpotifyStore } from '../../store/useSpotifyStore';
import { initiateSpotifyLogin } from '../../lib/spotify';

export const SpotifyWidget = () => {
  const { accessToken, currentTrack, isPlaying, logout, fetchPlaybackState } = useSpotifyStore();

  useEffect(() => {
    if (!accessToken) return;
    
    // Fetch immediately, then every 10 seconds to stay in sync
    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 10000); 
    
    return () => clearInterval(interval);
  }, [accessToken, fetchPlaybackState]);

  if (!accessToken) {
    return (
      <Card className="flex flex-col items-center justify-center text-center space-y-4 h-full py-8">
        <div className="w-16 h-16 bg-[#1DB954]/10 rounded-full flex items-center justify-center text-[#1DB954]">
          <Music className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold">Connect Spotify</h3>
          <p className="text-xs text-bunny-muted mt-1">See what's playing while you study</p>
        </div>
        <Button onClick={initiateSpotifyLogin} className="bg-[#1DB954] hover:bg-[#1ed760] text-white border-none shadow-md">
          Connect
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between h-full group bg-gradient-to-br from-bunny-card to-bunny-cream">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 text-[#1DB954]">
          <Music className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider uppercase">Spotify Connected</span>
        </div>
        <button onClick={logout} className="text-bunny-muted hover:text-bunny-error transition-colors" title="Disconnect">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {currentTrack ? (
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-bunny-border rounded-xl shadow-sm overflow-hidden flex-shrink-0">
            <img src={currentTrack.album.images[0]?.url} alt="Album art" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden flex-1">
            <h4 className="font-bold text-sm truncate">{currentTrack.name}</h4>
            <p className="text-xs text-bunny-muted truncate mt-0.5">{currentTrack.artists[0]?.name}</p>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-bunny-muted text-sm">
          Nothing playing right now.
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex gap-2">
          {isPlaying && (
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-[#1DB954] animate-pulse"></span>
              <span className="w-1 h-4 bg-[#1DB954] animate-pulse delay-75"></span>
              <span className="w-1 h-2 bg-[#1DB954] animate-pulse delay-150"></span>
            </div>
          )}
        </div>
        <a href="https://open.spotify.com" target="_blank" rel="noreferrer" className="text-xs font-bold text-bunny-muted hover:text-bunny-primary flex items-center gap-1">
          Open App <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </Card>
  );
};