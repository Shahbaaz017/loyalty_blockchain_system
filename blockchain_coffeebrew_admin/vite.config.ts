import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Listens on all available IPv4 and IPv6 network interfaces
    port: 8080, // Your admin frontend will run on port 8080
    proxy: {
      // This will proxy any request from your admin frontend that starts with '/api'
      // to your backend server running on http://localhost:3001
      '/api': {
        target: 'http://localhost:3001', // <<< IMPORTANT: Your backend server's URL
        changeOrigin: true, // Recommended, changes the Origin header to the target URL
        // secure: false, // Use if your backend is HTTPS with a self-signed certificate (uncommon for local dev)
        
        // Optional: rewrite path if your backend routes DON'T start with /api
        // For example, if frontend calls /api/admin/contract-overview 
        // and backend expects /admin/contract-overview, then use rewrite:
        // rewrite: (path) => path.replace(/^\/api/, ''), 
        //
        // However, based on our backend setup (app.use('/api/admin', adminRoutes)),
        // you likely DO NOT need the rewrite for '/api' proxy.
      }
    }
  },
  plugins: [
    react(),
    // Conditionally add your componentTagger plugin only in development mode
    mode === 'development' && componentTagger(), 
  ].filter(Boolean), // .filter(Boolean) removes any falsy values (like 'false' if componentTagger isn't added)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
