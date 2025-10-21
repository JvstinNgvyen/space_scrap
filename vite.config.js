import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  // Configure public directory
  publicDir: 'static',

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
        multiplayer: resolve(__dirname, 'multiplayer.html'),
      },
    },
    // Copy root-level assets
    copyPublicDir: true,
  },

  // Hook to copy additional files
  plugins: [{
    name: 'copy-models',
    closeBundle() {
      try {
        // Copy scene_export files from root to dist
        copyFileSync('scene_export.gltf', 'dist/scene_export.gltf');
        copyFileSync('scene_export.bin', 'dist/scene_export.bin');
        console.log('✓ Copied 3D model files to dist/');
      } catch (err) {
        console.log('Note: Some model files not found (this is ok if using static/ folder)');
      }
    }
  }]
});
