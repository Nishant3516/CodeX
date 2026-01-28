
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.devsarena.in', '.arenas.devsarena.in', 'devsarena.in', '.devsarena.local'],
    host: '0.0.0.0',
    port: 5173,
    watch:{
      usePolling:true
    }
  },
});