import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
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
    
    // Copy rules directory for declarativeNetRequest
    const rulesDir = 'rules';
    if (existsSync(rulesDir)) {
      // Create rules directory in dist
      if (!existsSync('dist/rules')) {
        mkdirSync('dist/rules', { recursive: true });
      }

      // Copy performance_rules.json
      const performanceRules = 'rules/performance_rules.json';
      if (existsSync(performanceRules)) {
        copyFileSync(performanceRules, 'dist/rules/performance_rules.json');
        console.log('✅ Copied performance_rules.json to dist/rules/');
      } else {
        console.warn('⚠️  performance_rules.json not found, skipping...');
      }
    } else {
      console.warn('⚠️  rules directory not found, skipping...');
    }

    // Copy lanyard assets (3D models and textures)
    const lanyardDir = 'src/assets/lanyard';
    if (existsSync(lanyardDir)) {
      // Create lanyard directory in dist/assets
      if (!existsSync('dist/assets/lanyard')) {
        mkdirSync('dist/assets/lanyard', { recursive: true });
      }

      // Copy .glb and .png files
      const lanyardFiles = ['card.glb', 'lanyard.png'];
      lanyardFiles.forEach(file => {
        const srcFile = `${lanyardDir}/${file}`;
        if (existsSync(srcFile)) {
          copyFileSync(srcFile, `dist/assets/lanyard/${file}`);
          console.log(`✅ Copied ${file} to dist/assets/lanyard/`);
        }
      });
    }

    console.log('Static files copied successfully');
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  // Include .glb files as assets for Three.js 3D models
  assetsInclude: ['**/*.glb'],
  server: {
    // Warm up critical modules for faster startup
    warmup: {
      clientFiles: [
        './src/sidepanel/OptimizedApp.tsx',
        './src/options/OptionsApp.tsx',
        './src/hooks/useAppState.ts',
        './src/hooks/useRecorder.ts',
        './src/services/LMStudioService.ts',
        './src/services/WhisperServerService.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/agents': resolve(__dirname, 'src/agents'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/components': resolve(__dirname, 'src/sidepanel/components'),
      '@/types': resolve(__dirname, 'src/types'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        canvas: resolve(__dirname, 'src/canvas/index.html'),
        presentation: resolve(__dirname, 'src/presentation/index.html'),
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
        // Optimized code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', '@tanstack/react-query'],
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/rapier', 'meshline'],
          agents: ['@/agents/router/AgentRouter'],
          services: ['@/services/LMStudioService', '@/services/TranscriptionService', '@/services/WhisperServerService'],
          'settings-components': ['@/components/settings/OptimizationPanel', '@/components/settings/LocalCorrectionsViewer']
        }
      },
      // Exclude problematic packages from build for CSP compliance
      external: ['@xenova/transformers']
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: 'hidden', // Enable hidden sourcemaps for debugging without size penalty
    minify: 'esbuild', // Enable minification with esbuild for better performance
    // Compression settings for large files
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', '@tanstack/react-query'],
    exclude: ['@xenova/transformers'], // Excluded for CSP compliance
    // Force include for faster cold start
    force: false
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
