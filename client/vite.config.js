import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // Allows access from outside the container
    port: 5173,        // Fixed port for Docker mapping
    strictPort: true,  // Forces failure if 5173 is occupied (prevents jumping to 5174)
    watch: {
      usePolling: true, // Necessary for Hot Module Replacement on Windows/WSL
    },
    hmr: {
      clientPort: 5173, // Ensures the browser knows which port to use for updates
    },
  },
})