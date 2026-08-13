# Study Bunny - Deployment Guide

Study Bunny is a local-first, Progressive Web App (PWA) built with React, TypeScript, and Vite. It utilizes IndexedDB for persistent storage, meaning there is no cloud database requirement.

## Prerequisites
- Node.js (v18+)
- A Vercel account (or similar static hosting provider)
- A Spotify Developer account (for the music widget)

## Local Development
1. Clone the repository and install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
2. Copy the environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Production Build
To create an optimized static build locally:
\`\`\`bash
npm run build
\`\`\`
This will compile TypeScript, bundle the application with Vite, and generate the PWA Service Worker assets into the \`dist/\` directory.

## Environment Variables
- \`VITE_SPOTIFY_CLIENT_ID\`: Required for the Spotify integration. The application will function normally without it, but attempting to log in to Spotify will fail gracefully with a user-friendly alert.

## Spotify Configuration Steps
To enable the Spotify widget on production:
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an App.
3. In the App settings, locate your **Client ID** and add it as \`VITE_SPOTIFY_CLIENT_ID\` in Vercel.
4. Add your exact production domain to the **Redirect URIs** list (e.g., \`https://study-bunny.vercel.app\`). 
   *Note: The application code dynamically sets the redirect URI to \`window.location.origin\`, meaning it automatically adapts to whatever domain it is hosted on, as long as Spotify has it whitelisted.*

## Vercel Deployment Steps
1. Push your repository to GitHub.
2. Log into Vercel and click **Add New... > Project**.
3. Import your Study Bunny GitHub repository.
4. Vercel will automatically detect the **Vite** framework.
5. In the **Environment Variables** section, add your \`VITE_SPOTIFY_CLIENT_ID\`.
6. Click **Deploy**.
7. Vercel will automatically read the \`vercel.json\` file to ensure direct URL navigation (e.g., \`/timer\`) routes correctly to the SPA.

## Post-Deployment Verification Checklist
- [ ] Visit the live URL.
- [ ] Refresh the page on `/planner` to verify SPA routing works (no 404).
- [ ] Complete a 1-minute Pomodoro timer and verify it logs to Statistics.
- [ ] Refresh the page and ensure the Statistics persist (IndexedDB is working).
- [ ] Click "Connect" on the Spotify widget and verify it successfully redirects and authenticates.
- [ ] Disconnect from the internet, refresh the page, and verify the offline PWA shell loads.