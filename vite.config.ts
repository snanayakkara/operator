import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

// Plugin to copy static files
const copyStaticFiles = () => ({
  name: 'copy-static-files',
  closeBundle() {
    // Ensure dist directory exists
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }
    
    // Copy manifest.json from current directory to dist
    const rootManifest = resolve(__dirname, 'manifest.json');
    if (existsSync(rootManifest)) {
      copyFileSync(rootManifest, 'dist/manifest.json');
      console.log('✅ Copied manifest.json to dist/');
    }
    
    // Create assets directory if it doesn't exist
    if (!existsSync('dist/assets')) {
      mkdirSync('dist/assets', { recursive: true });
    }
    
    // Create icons directory
    if (!existsSync('dist/assets/icons')) {
      mkdirSync('dist/assets/icons', { recursive: true });
    }
    
    // Copy icon files
    const iconSizes = ['16', '32', '48', '128'];
    iconSizes.forEach(size => {
      const iconFile = `src/assets/icons/icon-${size}.png`;
      if (existsSync(iconFile)) {
        copyFileSync(iconFile, `dist/assets/icons/icon-${size}.png`);
      }
    });
    
    // Copy BatchReviewResults.html to dist/src/components/
    const batchResultsHtml = 'src/components/BatchReviewResults.html';
    if (existsSync(batchResultsHtml)) {
      // Create the components directory structure in dist
      if (!existsSync('dist/src')) {
        mkdirSync('dist/src', { recursive: true });
      }
      if (!existsSync('dist/src/components')) {
        mkdirSync('dist/src/components', { recursive: true });
      }
      
      copyFileSync(batchResultsHtml, 'dist/src/components/BatchReviewResults.html');
      console.log('✅ Copied BatchReviewResults.html to dist/src/components/');
    }
    
    console.log('Static files copied successfully');
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/agents': resolve(__dirname, 'src/agents'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/components': resolve(__dirname, 'src/sidepanel/components'),
      '@/types': resolve(__dirname, 'src/types'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'service-worker.js'
          }
          if (chunkInfo.name === 'content') {
            return 'content-script.js'
          }
          return '[name].js'
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        // Ensure proper code splitting for extensions
        manualChunks: {
          vendor: ['react', 'react-dom'],
          agents: ['@/agents/router/AgentRouter', '@/agents/specialized/TAVIAgent', '@/agents/specialized/AngiogramPCIAgent'],
          services: ['@/services/LMStudioService', '@/services/TranscriptionService']
        }
      },
      // Exclude problematic packages from build for CSP compliance
      external: ['@xenova/transformers']
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    // Disable minification for now to avoid eval issues with onnxruntime-web
    minify: false
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@xenova/transformers'] // Excluded for CSP compliance
  },
  // Ensure no eval in development either
  esbuild: {
    legalComments: 'none',
    // Prevent any eval-based code generation
    supported: {
      'dynamic-import': true
    }
  }
})