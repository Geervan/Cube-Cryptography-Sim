
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
        this.peer = new Peer(null, { debug: 1 });

        this.peer.on('open', (id) => {
            this.myId = id;
            if (this.dom.myId) this.dom.myId.innerText = id;
            this.logSystem("Ready. Share ID to link.");
        });

        this.peer.on('connection', (conn) => {
            if (this.conn) { conn.close(); return; } // Single peer only
            this.handleConnection(conn, true); // true = I am the receiver
        });

        this.peer.on('error', (err) => {
            this.logSystem("Peer Error: " + err.type);
        });
    }

    connectTo(peerId) {
        if (!peerId) return;
        this.logSystem(`Connecting to ${peerId}...`);
        const conn = this.peer.connect(peerId);
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

        const bubble = this.createBubble("sent", alias); // Pass alias
        const cryptoContent = document.createElement('div');
        cryptoContent.className = 'msg-cipher';
        bubble.appendChild(document.createTextNode("Encrypting..."));
        bubble.appendChild(cryptoContent);

        this.engine.encryptSequence(text, 'A',
            (char, idx, details) => {
                if (idx === 0) bubble.childNodes[0].textContent = "";
                bubble.childNodes[0].textContent += details.p;
                cryptoContent.innerText += details.c;
            },
            (fullCiphertext) => {
                console.log(`%c[NETWORK OUTGOING] Payload: ${fullCiphertext}`, 'color: cyan; font-weight: bold;');
                this.conn.send({
                    type: 'MSG',
                    alias: alias, // Send my name!
                    payload: fullCiphertext
                });
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
}
