const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''; 
const redirectUri = window.location.origin; 

const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(x => possible[x % possible.length]).join('');
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

export const initiateSpotifyLogin = async () => {
  if (!clientId) return alert("Spotify Client ID not configured in .env");
  const codeVerifier = generateRandomString(64);
  window.localStorage.setItem('spotify_code_verifier', codeVerifier);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const scope = 'user-read-playback-state user-read-currently-playing';
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: 'code', client_id: clientId, scope, redirect_uri: redirectUri,
    code_challenge_method: 'S256', code_challenge: codeChallenge
  }).toString();
  
  window.location.href = authUrl.toString();
};

export const getSpotifyToken = async (code: string) => {
  const verifier = localStorage.getItem('spotify_code_verifier');
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier! }),
  };
  const body = await fetch("https://accounts.spotify.com/api/token", payload);
  return body.json();
};