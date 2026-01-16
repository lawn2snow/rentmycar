import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Root directory
  root: '.',

  // Base public path
  base: '/',

  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,

    // Rollup options for multi-page app
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        admin: resolve(__dirname, 'admin.html'),
        renterDashboard: resolve(__dirname, 'renter-dashboard.html')
      },
      output: {
        // Asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',

        // Manual chunks for code splitting
        manualChunks: {
          vendor: ['chart.js']
        }
      }
    },

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },

    // CSS
    cssMinify: true
  },

  // Development server
  server: {
    port: 5173,
    open: true,
    cors: true
  },

  // Preview server
  preview: {
    port: 4173
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },

  // Environment variables prefix
  envPrefix: 'VITE_',

  // Plugins
  plugins: []
});
