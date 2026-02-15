# Rubik's Encryption Lab

An experimental playground for visualizing cryptographic permutations using a 3x3 Rubik's Cube.

## Features

- **Shared Secret Initialization**: Scrambles the cube based on a seed phrase.
- **Data Stream Encryption**: Maps ASCII characters to cube rotations, obfuscating data dependent on the dynamic cube state.
- **Mechanical Visualization**: Satisfying, step-by-step 3D animations of the encryption process using Three.js.
- **Analysis Tools**: Real-time state hashing and operation logs.

## Technical Specifications

### 1. The Permutation Engine

The system utilizes a 3D permutation group (Rubik's Cube) as its internal state machine. Unlike traditional cryptography which relies on bitwise operations, Project Cube relies on **geometric permutations**.

- **State Space**: Approximately 4.3 × 10¹⁹ unique states.
- **Initialization**: The "Secret Key" acts as a seed to perform an initial shuffle, setting the machine's baseline lattice.

### 2. Sensor-Based Key Extraction

To extract a stream key (K) from the 3D state, we sample a fixed coordinate in the lattice: the **Front-Top-Right (1, 1, 1)** cubie. The index of this specific piece represents the "Secret Value" used for the current character's transformation.

### 3. Stream Cipher & CFB Mode

The machine implements a **Polyalphabetic Cipher** using **Cipher Feedback (CFB)** mode and **Key-Dependent Round Constants**. The transformation logic follows:

`Cᵢ = (Pᵢ + Kᵢ + RCᵢ) mod 53`

- **Kᵢ**: The Sensor Key extracted from the 3D lattice.
- **RCᵢ**: A deterministic Step Constant generated from the initial secret key (similar to AES Round Constants).

After each character is encrypted, the resulting **Ciphertext (C)** is fed back into the machine. The character code determines a mechanical move (e.g., 'A' -> U move), which permutes the cube and generates a new, unpredictable Sensor Key (K) for the next step. This design breaks linearity and ensures that identical messages result in different ciphertext streams if keys differ.

### 4. Character Mapping

The system maps characters `[A-Z, a-z, and space]` across an index of 0-52. This ensures that even simple text results in complex mechanical state changes that are visually auditable.

## Development Details

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
