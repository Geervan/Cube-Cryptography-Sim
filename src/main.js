import './style.css'
import { CubeSimulator } from './cube.js';

// Elements
const elSecret = document.getElementById('secret-key');
const elDataInput = document.getElementById('data-input');
const elDataOutput = document.getElementById('data-output');
const elStateHash = document.getElementById('state-hash');
const elSpeed = document.getElementById('speed-control');
const elContainer = document.getElementById('cube-container');

// Logic
const cube = new CubeSimulator('cube-container');
// Restricted Move Set: Only moves that affect the Front-Top-Right Sensor (1, 1, 1)
// U (Top), R (Right), F (Front).
// This guarantees the 'Key' (Sensor Value) changes every single step.
const movesList = ['U', "U'", 'R', "R'", 'F', "F'"];
let currentHistory = []; // Track moves for 'undo'

// CFB State
let lastCipherChar = 'A'; // IV

// Map Char -> Move
function getCharMove(char) {
  if (!char) return 'U';
  const code = char.charCodeAt(0);
  return movesList[code % 6];
}

// Character mapping helpers (Modulo 52: A-Z, a-z)
function toIndex(c) {
  if (c === ' ') return 52;
  const code = c.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65; // A-Z -> 0-25
  if (code >= 97 && code <= 122) return code - 97 + 26; // a-z -> 26-51
  return 0; // Fallback
}

function fromIndex(i) {
  if (i === 52) return ' ';
  if (i <= 25) return String.fromCharCode(i + 65); // 0-25 -> A-Z
  return String.fromCharCode(i - 26 + 97); // 26-51 -> a-z
}

// Utils
// No Console Elements anymore
// const elConsole = document.getElementById('console-output');

function log(msg) {
  // Fallback to browser console for debug
  console.log(msg);
}

function updateHash() {
  elStateHash.innerText = cube.getStateHash();
}

cube.onMoveComplete = (move) => {
  // Optionally log every move? Might be too noisy.
  updateHash();
};

// Event Listeners
document.getElementById('btn-init').addEventListener('click', () => {
  const key = elSecret.value;
  if (!key) {
    log("ERROR: NO SECRET KEY");
    return;
  }
  log(`INIT: Key hashing '${key}'...`);
  log(`INIT: Generatng texture map from '${key}'...`);
  // Initialize with key-based textures
  cube.initCube(key);
  currentHistory = [];
  log("SYSTEM: Cube Initialized with Key-derived Lattice.");
});


// Mode State
let currentMode = 'ENC'; // 'ENC' or 'DEC'
const btnAction = document.getElementById('btn-action');
const lblInput = document.getElementById('lbl-input');
const sysStatus = document.getElementById('sys-status');

// Mode Switchers
document.getElementById('tab-enc').addEventListener('click', () => setMode('ENC'));
document.getElementById('tab-dec').addEventListener('click', () => setMode('DEC'));

function setMode(mode) {
  currentMode = mode;
  document.getElementById('tab-enc').classList.toggle('active', mode === 'ENC');
  document.getElementById('tab-dec').classList.toggle('active', mode === 'DEC');

  if (mode === 'ENC') {
    lblInput.innerText = "PLAINTEXT INPUT";
    btnAction.innerText = "ENCRYPT MESSAGE";
    sysStatus.innerText = "SENDER READY";
    elDataInput.placeholder = "Type message to encrypt...";
  } else {
    lblInput.innerText = "CIPHERTEXT INPUT";
    btnAction.innerText = "DECRYPT MESSAGE";
    sysStatus.innerText = "RECEIVER READY";
    elDataInput.placeholder = "Paste ciphertext here...";
  }
}

btnAction.addEventListener('click', () => {
  if (currentMode === 'ENC') {
    runEncryption();
  } else {
    runDecryption();
  }
});

function runEncryption() { // Filter: Keep only A-Z, a-z, space
  const raw = elDataInput.value;
  const data = raw.replace(/[^A-Za-z ]/g, '');

  if (data.length !== raw.length) {
    // Warn user?
    // log("WARN: Non-alphabetic characters removed.");
  }
  if (!data) return;

  // Reset Cube to Key State
  const key = elSecret.value || "DEFAULT";
  cube.initCube(key);

  // IV Reset
  lastCipherChar = 'A';
  currentHistory = [];
  elDataOutput.value = "";
  let outputBuffer = "";

  // Lock UI
  cube.setLocked(true);

  // CFB Loop Manager
  let index = 0;

  // We define a recursive processor
  const processNext = () => {
    if (index >= data.length) {
      cube.setLocked(false);
      log("SYSTEM: Encryption Sequence Complete.");
      return;
    }

    // 1. Determine Move based on Last Cipher Char (CFB)
    const prevChar = lastCipherChar;
    const move = getCharMove(prevChar);
    const pChar = data[index];

    // 2. Define what happens AFTER move
    cube.onMoveComplete = (m) => {
      updateHash();

      // 3. Read Sensor
      const sensorVal = cube.getSensorValue();

      // 4. Encrypt: Modulo 53 (A-Z, a-z, space)
      const k = toIndex(sensorVal);
      const p = toIndex(pChar);

      const cVal = (p + k) % 53;
      const cChar = fromIndex(cVal);

      // 5. Update Output & State
      outputBuffer += cChar;
      elDataOutput.value = outputBuffer;
      lastCipherChar = cChar; // Feedback!

      // Live Dashboard Update
      document.getElementById('step-count').innerText = `STEP ${index + 1} / ${data.length}`;
      document.getElementById('disp-input').innerText = pChar;
      document.getElementById('disp-input-code').innerText = `IDX ${p}`;

      document.getElementById('disp-sensor').innerText = sensorVal;
      document.getElementById('disp-sensor-code').innerText = `IDX ${k}`;

      document.getElementById('disp-result').innerText = cChar;
      document.getElementById('disp-result-code').innerText = `IDX ${cVal}`;

      document.getElementById('disp-math').innerText = `(${p} + ${k}) % 53 = ${cVal}`;

      index++;
      // 6. Loop
      processNext();
    };

    // Execute Move
    cube.queueMove(move);
  };

  // Start Loop
  processNext();
}

function runDecryption() {
  const raw = elDataInput.value;
  const data = raw.replace(/[^A-Za-z ]/g, ''); // Filter
  if (!data) return;

  // Reset
  const key = elSecret.value || "DEFAULT";
  cube.initCube(key);
  lastCipherChar = 'A'; // IV
  elDataOutput.value = "";
  let outputBuffer = "";

  // Lock
  cube.setLocked(true);

  let index = 0;

  const processNext = () => {
    if (index >= data.length) {
      cube.setLocked(false);
      log("SYSTEM: Decryption Complete.");
      return;
    }

    // Decryption Rule: 
    // 1. Determine Move based on Last Cipher Char (CFB)
    const prevChar = lastCipherChar;
    const move = getCharMove(prevChar);
    const cChar = data[index]; // The current ciphertext char

    cube.onMoveComplete = (m) => {
      updateHash();

      // 2. Read Sensor (Should match sender's K)
      const sensorVal = cube.getSensorValue();

      // 3. Decrypt: P = (C - K) (Modulo 53)
      const k = toIndex(sensorVal);
      const c = toIndex(cChar);

      // Inverse Modulo: (C - K)
      let pVal = (c - k) % 53;
      if (pVal < 0) pVal += 53;

      const pChar = fromIndex(pVal);

      outputBuffer += pChar;
      elDataOutput.value = outputBuffer;
      lastCipherChar = cChar;

      // Live Dashboard Update
      document.getElementById('step-count').innerText = `STEP ${index + 1} / ${data.length}`;
      document.getElementById('disp-input').innerText = cChar;
      document.getElementById('disp-input-code').innerText = `IDX ${c}`;

      document.getElementById('disp-sensor').innerText = sensorVal;
      document.getElementById('disp-sensor-code').innerText = `IDX ${k}`;

      document.getElementById('disp-result').innerText = pChar;
      document.getElementById('disp-result-code').innerText = `IDX ${pVal}`;

      document.getElementById('disp-math').innerText = `(${c} - ${k}) % 53 = ${pVal}`;

      index++;
      processNext();
    };

    cube.queueMove(move);
  };

  processNext();
}

// Step Mode Logic
const elStepMode = document.getElementById('mode-step');
const elStepBtn = document.getElementById('btn-step');

elStepMode.addEventListener('change', (e) => {
  const isStepMode = e.target.checked;
  cube.setAutoProcess(!isStepMode);
  elStepBtn.disabled = !isStepMode;
  if (isStepMode) {
    log("MODE: STEP-BY-STEP ENABLED");
  } else {
    log("MODE: AUTO-PROCESS ENABLED");
  }
});

elStepBtn.addEventListener('click', () => {
  cube.step();
});

elSpeed.addEventListener('input', (e) => {
  cube.setSpeed(parseInt(e.target.value));
});

// Set initial speed
cube.setSpeed(5);

// Manual Keys
window.addEventListener('keydown', (e) => {
  // Avoid capturing input if typing
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const key = e.key.toUpperCase();
  let move = null;

  if (movesList.includes(key)) move = key;

  // Add shift for prime? e.g. Shift+U = U'
  if (e.shiftKey && movesList.includes(key + "'")) {
    move = key + "'";
  }

  if (move) {
    cube.queueMove(move);
    currentHistory.push(move);
    log(`MANUAL: ${move}`);
  }
});

log("SYSTEM ONLINE. AWAITING INPUT.");
updateHash();

// Hide loading overlay once everything is ready
window.addEventListener('load', () => {
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 300);
    }
  }, 100);
});
