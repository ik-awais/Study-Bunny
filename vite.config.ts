import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Define the SVG string once for the PWA manifest
const bunnySvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M45 20C45 10 35 5 30 15C25 25 35 45 40 50L30 60C20 70 25 90 50 90C75 90 80 70 70 60L60 50C65 45 75 25 70 15C65 5 55 10 55 20C55 30 52 40 50 45C48 40 45 30 45 20Z' fill='%239e9e9e'/><circle cx='40' cy='65' r='3' fill='%232d2424'/><circle cx='60' cy='65' r='3' fill='%232d2424'/><path d='M48 70 Q50 73 52 70' stroke='%23ffb6c1' stroke-width='2' fill='none'/></svg>`;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Study Bunny',
        short_name: 'StudyBunny',
        description: 'A cute, local-first study productivity companion.',
        theme_color: '#FFFDF9',
        background_color: '#FFFDF9',
        display: 'standalone',
        icons: [
          { src: `data:image/svg+xml,${encodeURIComponent(bunnySvg)}`, sizes: '192x192', type: 'image/svg+xml' },
          { src: `data:image/svg+xml,${encodeURIComponent(bunnySvg)}`, sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
});