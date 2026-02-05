
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
        this.isEncrypting = false;
        this.isCompromised = false;

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
            if (err.type === 'network' || err.type === 'disconnected') {
                this.logSystem("Network glitch. Reconnecting...");
                this.peer.reconnect();
            } else {
                this.logSystem("Peer Error: " + err.type);
            }
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
            } else if (data.type === 'MSG') {
                if (this.isCompromised) {
                    // Ignore this message, we already collided
                    this.isCompromised = false;
                    return;
                }
                this.clearTypingIndicator(); // Msg arrived, clear indicator
                this.lockInput(false); // Unlock input
                this.handleIncomingMessage(data);
            } else if (data.type === 'SIGNAL') {
                if (data.payload === 'START_ENC') {
                    if (this.isEncrypting) {
                        // WE HAVE A COLLISION!
                        // I am sending AND they are sending.
                        this.handleCollision();
                    } else {
                        this.showTypingIndicator();
                        this.lockInput(true); // Found signal, lock input
                    }
                } else if (data.payload === 'COLLISION') {
                    this.handleCollision();
                }
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

    handleCollision(isInitiator) {
        // Red critical alert
        const div = document.createElement('div');
        div.className = 'msg system';
        div.style.color = '#ff4444';
        div.style.fontWeight = 'bold';
        div.style.textShadow = '0 0 5px rgba(255,0,0,0.5)';
        div.innerText = "⚠ COLLISION DETECTED - PLEASE CLICK 'SET' TO RESYNC ⚠";
        this.dom.log.appendChild(div);
        this.dom.log.scrollTop = this.dom.log.scrollHeight;

        this.isCompromised = true;
        this.isEncrypting = false; // Stop encrypting
        this.clearTypingIndicator();
        this.lockInput(false);

        // Remove the zombie bubble if it exists
        if (this.activeBubble) {
            this.activeBubble.remove();
            this.activeBubble = null;
        }

        // Only notify peer if I AM THE ONE who found it.
        // If I just received the warning, do not reply, or we loop forever.
        if (isInitiator) {
            this.conn.send({ type: 'SIGNAL', payload: 'COLLISION' });
        }

        // Reset Cube mechanics to clean state to undo partial rotations
        this.cube.initCube(this.currentKey);
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

        const bubble = this.createBubble("sent", alias); // Pass alias
        this.activeBubble = bubble; // Track for collision cleanup

        const cryptoContent = document.createElement('div');
        cryptoContent.className = 'msg-cipher';
        bubble.appendChild(document.createTextNode("Encrypting..."));
        bubble.appendChild(cryptoContent);

        // Signal Peer that we are busy encrypting
        this.conn.send({ type: 'SIGNAL', payload: 'START_ENC' });

        // Lock our own input to prevent double-sending
        this.lockInput(true);
        this.isCompromised = false; // Reset flag
        this.isEncrypting = true; // Set flag that we are encrypting

        this.engine.encryptSequence(text, 'A',
            (char, idx, details) => {
                // If collision happened during encryption, stop updating UI
                if (this.isCompromised) return;

                if (idx === 0) bubble.childNodes[0].textContent = "";
                bubble.childNodes[0].textContent += details.p;
                cryptoContent.innerText += details.c;
            },
            (fullCiphertext) => {
                this.isEncrypting = false; // Clear flag
                this.activeBubble = null; // Clear reference

                // Check if we crashed while encrypting
                if (this.isCompromised) {
                    this.logSystem("ABORTED: Transmission Collision.");
                    // bubble removed via handleCollision already
                    this.lockInput(false);
                    return;
                }

                console.log(`%c[NETWORK OUTGOING] Payload: ${fullCiphertext}`, 'color: cyan; font-weight: bold;');
                this.conn.send({
                    type: 'MSG',
                    alias: alias, // Send my name!
                    payload: fullCiphertext
                });
                // Unlock after sending
                this.lockInput(false);
            }
        );
    }

    handleIncomingMessage(data) {
        const ciphertext = data.payload;
        const senderAlias = data.alias || "PEER"; // Get name
        console.log(`%c[NETWORK INCOMING] Payload: ${ciphertext}`, 'color: orange; font-weight: bold;');

        const bubble = this.createBubble("received", senderAlias);
        const mainTextNode = bubble.childNodes[1]; // [0] is name, [1] is text

        const cryptoContent = document.createElement('div');
        cryptoContent.className = 'msg-cipher';
        cryptoContent.innerText = ciphertext; // Show cipher at bottom
        bubble.appendChild(cryptoContent);

        // Instant Decryption
        this.engine.decryptSequence(ciphertext, 'A',
            (char, idx, details) => {
                if (idx === 0) mainTextNode.textContent = "";
                mainTextNode.textContent += details.p;
            },
            (fullPlaintext) => { }
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

        div.appendChild(document.createTextNode("")); // Placeholder for text
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

    showTypingIndicator() {
        // Prevent duplicates
        if (this.typingEl) return;

        this.typingEl = document.createElement('div');
        this.typingEl.className = 'msg system';
        this.typingEl.style.color = '#00ff88';
        this.typingEl.style.fontStyle = 'italic';
        this.typingEl.innerText = ">> Incoming Transmission Detected (Decrypting Stream...)";
        this.dom.log.appendChild(this.typingEl);
        this.dom.log.scrollTop = this.dom.log.scrollHeight;
    }

    clearTypingIndicator() {
        if (this.typingEl) {
            this.typingEl.remove();
            this.typingEl = null;
        }
    }

    lockInput(locked) {
        const input = document.getElementById('msg-input');
        const btn = document.getElementById('btn-send');
        if (input && btn) {
            input.disabled = locked;
            btn.disabled = locked;
            if (locked) {
                input.placeholder = "CHANNEL BUSY - WAIT FOR SIGNAL...";
                input.style.borderColor = '#ff4444';
            } else {
                input.placeholder = "Type encrypted message...";
                input.style.borderColor = '#444';
                input.focus();
            }
        }
    }
}
