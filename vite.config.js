import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'landing.html'),
                home:resolve(__dirname, 'index.html'),
                lore: resolve(__dirname, 'lore.html'),
                chat: resolve(__dirname, 'chat.html'),
            },
        },
    },
});
