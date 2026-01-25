# Rubik's Encryption Lab

An experimental playground for visualizing cryptographic permutations using a 3x3 Rubik's Cube.

## Features
- **Shared Secret Initialization**: Scrambles the cube based on a seed phrase.
- **Data Stream Encryption**: Maps ASCII characters to cube rotations, obfuscating data dependent on the dynamic cube state.
- **Mechanical Visualization**: Satisfying, step-by-step 3D animations of the encryption process using Three.js.
- **Analysis Tools**: Real-time state hashing and operation logs.

## Technical Details
- **Stack**: Vite + Vanilla JS + Three.js
- **Aesthetic**: Academic / Retro-technical (IBM Plex Mono, Dark Mode)
- **State**: The cube acts as a state machine where `Output = f(Input, CubeState)`.

## Setup
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`

## Controls
- **Key**: Enter a secret passphrase to set the initial permutation state.
- **Encrypt**: Process text input.
- **Step Mode**: Toggle for manual step-by-step execution analysis.
- **Manual**: Use keys U, D, L, R, F, B to manually manipulate the state.
