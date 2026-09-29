import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                lab: resolve(__dirname, 'lab.html'),
                lore: resolve(__dirname, 'lore.html'),
                chat: resolve(__dirname, 'chat.html'),
            },
        },
    },
});

