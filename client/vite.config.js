import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // Essential for Docker port mapping
    port: 5173,      // Must match your Dockerfile EXPOSE and docker-compose ports
    strictPort: true, // If 5173 is busy, fail instead of picking a random port
    watch: {
      usePolling: true, // Fixes Hot Module Replacement (HMR) on some Windows machines
    },
  },
})