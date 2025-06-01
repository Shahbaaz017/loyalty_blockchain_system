// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger"; // Assuming this is a valid plugin you use

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Listen on all available IPv6 and IPv4 addresses
    port: 8080, // Your frontend development server port
    proxy: {
      // Proxy API requests starting with '/api' to your backend server
      '/api': {
        target: 'http://localhost:3001', // <<<< CHANGE THIS if your backend runs on a different port
        changeOrigin: true, // needed for virtual hosted sites
        // secure: false,      // uncomment if your backend is http and you're having SSL issues locally
        // rewrite: (path) => path.replace(/^\/api/, '') // uncomment if your backend routes don't start with /api
      },
    },
  },
  plugins: [
    react(),
    // Conditionally add the componentTagger plugin only in development mode
    mode === 'development' && componentTagger(),
  ].filter(Boolean), // filter(Boolean) removes any falsy values (like 'false' from the condition)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));