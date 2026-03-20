import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Vite configuration for the WS Financial Decision Engine frontend.
// Serves on port 5173 in development.
// The backend runs separately on port 4000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
