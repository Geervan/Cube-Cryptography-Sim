
import { CubeSimulator } from './cube.js';
import { CubeChat } from './chat.js';

// 1. Initialize Cube
// We mount it to #view-cube
const cube = new CubeSimulator('view-cube');

// Force resize handling immediately
setTimeout(() => {
    cube.onWindowResize(); // Ensure it fills the new div correctly
}, 100);

// Initialize with a default key or random?
// Use input value if present, else "DEFAULT"
const initKey = document.getElementById('my-key-input').value || "DEFAULT";
cube.initCube(initKey);

// 2. Initialize Chat Logic
const chatModule = new CubeChat(
    cube,
    document.getElementById('my-id'),
    document.getElementById('status-text'),
    document.getElementById('chat-history')
);

// Pre-set default key from UI
const keyInput = document.getElementById('my-key-input');
if (keyInput.value) chatModule.setKey(keyInput.value);

chatModule.init();

// 3. UI Bindings
document.getElementById('btn-set-key').addEventListener('click', () => {
    if (keyInput.value) {
        chatModule.setKey(keyInput.value);
        // Visual confirmation
        const originalText = document.getElementById('btn-set-key').innerText;
        document.getElementById('btn-set-key').innerText = "OK";
        setTimeout(() => document.getElementById('btn-set-key').innerText = originalText, 1000);
    }
});

document.getElementById('my-id').addEventListener('click', async (e) => {
    const id = e.target.innerText;
    const isSmallScreen = window.innerWidth < 900;

    // Prioritize Share on Mobile, Copy on Desktop
    if (navigator.share && isSmallScreen) {
        try {
            await navigator.share({
                title: 'Secure Chat ID',
                text: id,
            });
            e.target.innerText = "SHARED!";
        } catch (err) {
            // User cancelled or error, fallback to copy
            copyToClipboard(e.target, id);
        }
    } else {
        copyToClipboard(e.target, id);
    }

    setTimeout(() => {
        e.target.innerText = chatModule.myId;
    }, 2000);
});

function copyToClipboard(element, text) {
    navigator.clipboard.writeText(text);
    element.innerText = "COPIED!";
}

document.getElementById('btn-connect').addEventListener('click', () => {
    const target = document.getElementById('target-id').value;
    if (target) chatModule.connectTo(target);
});

document.getElementById('btn-send').addEventListener('click', () => {
    const input = document.getElementById('msg-input');
    if (input.value) {
        chatModule.sendMessage(input.value);
        input.value = "";
    }
});

document.getElementById('msg-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-send').click();
});
