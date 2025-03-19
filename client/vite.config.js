import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true, // Enable source maps for your code
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true, // Prevents dependency source maps from being loaded
      },
    },
  },
  server: {
    port: 5173,
  }
})
