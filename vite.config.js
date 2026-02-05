import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'), // Was landing
                lab: resolve(__dirname, 'lab.html'),    // Was index
                lore: resolve(__dirname, 'lore.html'),
                chat: resolve(__dirname, 'chat.html'),
            },
        },
    },
});
