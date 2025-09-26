import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use root path for assets
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections
    open: false, // Disable auto-opening browser for server deployment
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-visually-hidden'
          ],
          'fontawesome-vendor': [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/react-fontawesome'
          ],
          'utils-vendor': [
            'axios',
            'socket.io-client',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          'icons-vendor': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Force cache busting
    assetsInlineLimit: 0,
    // เพิ่มการบีบอัดและ optimize
    minify: 'terser',
    sourcemap: false, // ปิดใน production เพื่อลดขนาดไฟล์
    target: 'es2015',
    cssCodeSplit: true
  },
  // เพิ่มการ optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
      'lucide-react'
    ]
  }
})