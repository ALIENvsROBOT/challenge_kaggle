import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite Configuration
 * 
 * Configures the build tool and development server.
 * - Uses @vitejs/plugin-react for Fast Refresh and JSX support.
 * - Defines build output and proxy rules (if backend integration logic is added later).
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    host: true, // needed for the Docker Container port mapping to work
    strictPort: true,
    port: 5173,
  },
})

