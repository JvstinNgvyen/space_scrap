import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
        multiplayer: resolve(__dirname, 'multiplayer.html'),
        test: resolve(__dirname, 'test-connection.html')
      }
    }
  },
  server: {
    port: 5173
  },
  publicDir: 'static',
  plugins: [
    {
      name: 'copy-scene-files',
      closeBundle() {
        // Copy scene files from root to dist
        try {
          copyFileSync('scene_export.gltf', 'dist/scene_export.gltf');
          copyFileSync('scene_export.bin', 'dist/scene_export.bin');
          console.log('Scene files copied to dist/');
        } catch (err) {
          console.error('Error copying scene files:', err);
        }
      }
    }
  ]
});
