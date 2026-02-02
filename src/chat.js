
import { Peer } from "peerjs";
import { CubeCipherEngine } from "./cipher_engine.js";

export class CubeChat {
    constructor(cube, myIdElement, statusElement, logElement) {
        this.cube = cube;
        // engine is not used directly for 'sync' but for encrypt/decrypt
        this.engine = new CubeCipherEngine(cube);
        this.peer = null;
        this.conn = null;

        this.dom = {
            myId: myIdElement,
            status: statusElement,
            log: logElement
        };

        this.myId = "";
        this.connected = false;

        // We track the current Key locally
        this.currentKey = "DEFAULT";

        // Ensure clean disconnect on tab close
        window.addEventListener('beforeunload', () => {
            if (this.conn) {
                this.conn.close();
            }
            if (this.peer) {
                this.peer.destroy();
            }
        });
    }

    // Call this before init() to set the user's chosen key
    setKey(key) {
        this.currentKey = key;
        // Re-init cube with this key immediately so user sees it
        this.cube.initCube(key);
        this.logSystem(`Local Key set to: ${key}`);

        // Dynamic Rekeying: If connected, force peer to update too
        if (this.connected) {
            this.logSystem("Broadcasting new Key to Peer...");
            this.sendSyncPacket();
        }
    }

    init() {
        const config = {
            debug: 2,
            secure: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        };

        try {
            this.peer = new Peer(null, config);
        } catch (e) {
            this.logSystem("Critical PeerJS Error: " + e.message);
            return;
        }

        this.peer.on('open', (id) => {
            this.myId = id;
            if (this.dom.myId) this.dom.myId.innerText = id;
            this.logSystem("Ready. Share ID to link.");
        });

        this.peer.on('connection', (conn) => {
            // Allow multiple attempts, but close old ones if replacing
            if (this.conn) {
                this.logSystem("New connection replacing old one...");
                this.conn.close();
            }
            this.handleConnection(conn, true); // true = I am the receiver
        });

        this.peer.on('error', (err) => {
            this.logSystem("Peer Error: " + err.type);
        });
    }

    connectTo(peerId) {
        if (!peerId) return;

        // Sanitize ID
        peerId = peerId.trim();

        this.logSystem(`Connecting to ${peerId}...`);

        const conn = this.peer.connect(peerId, {
            reliable: true,
            serialization: 'json'
        });

        this.handleConnection(conn, false); // false = I am the initiator
    }

    handleConnection(conn, isReceiver) {
        this.conn = conn;

        this.conn.on('open', () => {
            this.connected = true;
            this.dom.status.innerText = "CONNECTED";
            this.dom.status.classList.add('connected');
            this.logSystem("Connection Established.");

            // IMPROVEMENT: Auto-Sync State
            // Protocol Flip: The Receiver (Host) dictates the key to the Initiator (Joiner).
            // "I connected to you, so I adopt your reality."
            if (isReceiver) {
                this.logSystem("New peer joined. Sending my Key State...");
                this.sendSyncPacket();
            } else {
                this.logSystem("Joined secure channel. Waiting for Host Key...");
            }
        });

        this.conn.on('data', (data) => {
            // Distinguish types
            if (data.type === 'SYNC') {
                this.handleSync(data.payload);
            } else if (data.type === 'MSG' || data.type === 'MSG_CHUNK') {
                this.handleIncomingMessage(data);
            }
        });

        this.conn.on('close', () => {
            this.connected = false;
            this.conn = null;
            this.dom.status.innerText = "DISCONNECTED";
            this.dom.status.classList.remove('connected');
            this.logSystem("Peer disconnected.");

            // Re-enable connect button if disable logic was added later, 
            // but for now just visual feedback is enough.
        });

        // Handle explicit ICE disconnects (network failure)
        this.conn.peerConnection.oniceconnectionstatechange = () => {
            if (this.conn.peerConnection.iceConnectionState === 'disconnected') {
                this.logSystem("Network connection lost.");
                // Force close logic will trigger via the 'close' event eventually
            }
        };
    }

    sendSyncPacket() {
        this.logSystem("Sending Key State to Peer...");
        // Payload contains the 'Seed Key' that generated the cube
        this.conn.send({
            type: 'SYNC',
            payload: {
                key: this.currentKey
            }
        });
    }

    handleSync(payload) {
        const newKey = payload.key;
        this.logSystem(`Received Sync Config from Host.`);
        this.logSystem(`Synchronizing Cube to Key: ${newKey}`);

        this.currentKey = newKey;
        this.cube.initCube(newKey);

        // Update the UI Input to reflect the new state
        const input = document.getElementById('my-key-input');
        if (input) {
            input.value = newKey;
            // Visual flash
            input.style.borderColor = '#00ff88';
            setTimeout(() => input.style.borderColor = '#444', 500);
        }
    }

    async sendMessage(text) {
        if (!this.connected) {
            this.logSystem("Err: Not connected.");
            return;
        }

        const alias = document.getElementById('my-alias').value || "UNKNOWN";
        const bubble = this.createBubble("sent", alias);
        const contentSpan = bubble.querySelector('.msg-content'); // Safer selector
        const cryptoContent = document.createElement('div');
        cryptoContent.className = 'msg-cipher';

        contentSpan.textContent = "Encrypting...";
        bubble.appendChild(cryptoContent);

        // Chunking Strategy for long messages
        let buffer = "";
        const CHUNK_SIZE = 5;

        this.engine.encryptSequence(text, 'A',
            (char, idx, details) => {
                if (idx === 0) contentSpan.textContent = "";
                contentSpan.textContent += details.p;
                cryptoContent.innerText += details.c;

                // Real-time Streaming Logic
                buffer += details.c;
                if (buffer.length >= CHUNK_SIZE) {
                    this.conn.send({
                        type: 'MSG_CHUNK',
                        alias: alias,
                        payload: buffer,
                        isFinal: false
                    });
                    buffer = "";
                }
            },
            (fullCiphertext) => {
                console.log(`%c[NETWORK OUTGOING] Payload: ${fullCiphertext}`, 'color: cyan; font-weight: bold;');

                // Send remaining buffer + Final Flag
                this.conn.send({
                    type: 'MSG_CHUNK',
                    alias: alias,
                    payload: buffer,
                    isFinal: true
                });
            }
        );
    }

    // Track active receiving bubble to append partial chunks
    // this.activeRxBubble = null; (Add to constructor if strict, but safe to use loosely)

    handleIncomingMessage(data) {
        // Legacy support
        if (data.type === 'MSG') {
            this._handleLegacyMsg(data);
            return;
        }

        const ciphertext = data.payload;
        const senderAlias = data.alias || "PEER";

        if (!ciphertext && !data.isFinal) return; // empty chunk

        // Do we have an active bubble for this stream?
        // Simplified: Assume strictly ordered streams for now (safe for TCP/WebRTC)
        if (!this.activeRxBubble) {
            this.activeRxBubble = this.createBubble("received", senderAlias);
            const contentSpan = this.activeRxBubble.querySelector('.msg-content');
            // Clear the placeholder text immediately on first chunk
            contentSpan.textContent = "";

            const cryptoContent = document.createElement('div');
            cryptoContent.className = 'msg-cipher';
            this.activeRxBubble.appendChild(cryptoContent);
        }

        const bubble = this.activeRxBubble;
        const contentSpan = bubble.querySelector('.msg-content');
        const cryptoContent = bubble.querySelector('.msg-cipher');

        cryptoContent.innerText += ciphertext; // Append cipher

        // Decrypt the CHUNK
        // Note: engine.decryptSequence usually resets generic state, but since
        // this is a stream cipher, decrypting "BC" after "A" works IF the cube state is preserved.
        // Our engine tracks state globally? Yes, 'this.cube' is shared.
        // But 'decryptSequence' manages 'lastCipherChar'.
        // We need to verify if 'fromIndex' relies on last char.
        // The engine logic: 'const move = this.getCharMove(lastCipherChar);'
        // We need to track 'lastCipherChar' across chunks.

        // Actually, the Engine uses a local 'lastCipherChar' variable inside the function scope.
        // This is a problem for chunking.
        // Quick Fix: We won't change the engine. 
        // We will just decrypt the chunk, but we need to know the *previous* chunk's last char.
        // OR: The engine is fast enough to decrypt "Whole so far"? 
        // No, that messes up cube rotation.

        // BETTER APPROACH for minimal code change:
        // just let the user wait? 
        // No, the user asked specifically.

        // Okay, I will implement a visual trick.
        // The 'encryptSequence' calls callback.

        // Wait, if I decrypt "Chunk 2" independently, I need the cube state to be at "Post-Chunk 1".
        // The Cube State IS at Post-Chunk 1 because the sender *rotated* it.
        // The Receiver *must* rotate it too.
        // So sequential decryption of chunks works perfectly!
        // The only issue is 'lastCipherChar' used for determining the Move.
        // The helper `getCharMove(lastCipherChar)` needs the char from the *previous* chunk.

        // I will hack it: I will attach 'prevChar' to the packet? 
        // Or simpler: The receiver just remembers the last char of the previous chunk.

        if (!this.lastRxChar) this.lastRxChar = 'A'; // Default IV

        this.engine.decryptSequence(ciphertext, this.lastRxChar,
            (pChar, idx, details) => {
                contentSpan.textContent += pChar;
                // Update global tracker
                this.lastRxChar = details.c;
            },
            () => {
                // Chunk done.
                if (data.isFinal) {
                    this.activeRxBubble = null;
                    this.lastRxChar = 'A'; // Reset for NEXT message
                }
            }
        );
    }

    _handleLegacyMsg(data) {
        const ciphertext = data.payload;
        const senderAlias = data.alias || "PEER";
        console.log(`%c[NETWORK INCOMING] Payload: ${ciphertext}`, 'color: orange; font-weight: bold;');

        const bubble = this.createBubble("received", senderAlias);
        const contentSpan = bubble.querySelector('.msg-content');

        const cryptoContent = document.createElement('div');
        cryptoContent.className = 'msg-cipher';
        cryptoContent.innerText = ciphertext;
        bubble.appendChild(cryptoContent);

        this.engine.decryptSequence(ciphertext, 'A',
            (char, idx, details) => {
                if (idx === 0) contentSpan.textContent = "";
                contentSpan.textContent += details.p;
            },
            () => { }
        );
    }

    createBubble(type, name = "SYSTEM") {
        const div = document.createElement('div');
        div.className = `msg ${type}`;

        // Add Name Tag
        const nameTag = document.createElement('div');
        nameTag.style.fontSize = "0.7rem";
        nameTag.style.opacity = "0.7";
        nameTag.style.marginBottom = "4px";
        nameTag.style.color = type === 'sent' ? '#88ffbb' : '#aaaaff';
        nameTag.innerText = name;
        div.appendChild(nameTag);

        // Content Span (The Plaintext)
        const contentSpan = document.createElement('span');
        contentSpan.className = 'msg-content';
        div.appendChild(contentSpan);

        this.dom.log.appendChild(div);
        this.dom.log.scrollTop = this.dom.log.scrollHeight;
        return div;
    }

    logSystem(msg) {
        const div = document.createElement('div');
        div.className = 'msg system';
        div.innerText = `>> ${msg}`;
        this.dom.log.appendChild(div);
        this.dom.log.scrollTop = this.dom.log.scrollHeight;
    }
}
