// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from "@vitejs/plugin-react-swc"
import path from "path" // Make sure to import path

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // If you use path aliases like "@/"
    },
  },
  server: {
    proxy: {
      // Option 1: Proxy all requests starting with /api
      '/api': {
        target: 'http://localhost:3001', // YOUR BACKEND SERVER URL
        changeOrigin: true, // Recommended for most cases
        // secure: false, // Uncomment if your backend is on HTTPS with a self-signed cert (not typical for local dev)
        // rewrite: (path) => path.replace(/^\/api/, '') // UNCOMMENT if your backend routes DON'T start with /api
                                                        // For example, if your Express route is just '/coffee-coin/transaction-history'
                                                        // and not '/api/coffee-coin/transaction-history'
      },

      // Option 2 (if you don't use an /api prefix in your frontend fetches, but your backend IS prefixed):
      // '/coffee-coin': { // If your frontend fetch is to '/coffee-coin/transaction-history'
      //   target: 'http://localhost:3001/api', // And your backend expects '/api/coffee-coin/transaction-history'
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/coffee-coin/, '/api/coffee-coin') // Example rewrite
      // }
    }
  }
})