# Cube Cryptography — 3D Lattice Permutation Cipher

An interactive, physical group theory stream cipher and peer-to-peer secure messaging application built on **Astryx Design System** (`@astryxdesign/core` + `@astryxdesign/theme-neutral`) and **Three.js**.

---

## Overview

**Cube Cryptography** models cryptographic entropy through the $4.33 \times 10^{19}$ permutation state space of a Rubik's cube lattice. Unlike traditional linear feedback shift registers (LFSR), Project Cube constructs non-linear keystreams via physical 3D spatial rotations, Continuous Cipher Feedback (CFB), and discrete spatial sensor extraction.

---

## Built with Astryx Design System

The application is built on **Astryx** components and design tokens wrapped under a custom dark `neutralTheme`:

* **Chat System**: Built using `@astryxdesign/core/Chat` (`ChatMessageList`, `ChatMessage`, `ChatMessageBubble`, `ChatSystemMessage`, and `ChatSendButton`).
* **Navigation & Layout**: `TopNav`, `TopNavItem`, `Divider`, `Theme`, and responsive drawer triggers with `IconButton`.
* **Form & Parameter Controls**: `TextInput`, `TextArea`, `CheckboxInput`, `Slider`, and `SegmentedControl`.
* **Progressive Disclosure & Feedback**: `TabList`, `Tab`, `CollapsibleGroup`, `Collapsible`, `Tooltip`, `Kbd`, `StatusDot`, `Dialog`, and `DialogHeader`.
* **Design Tokens**: Complete color, radius, spacing, and typography token integration via `@astryxdesign/theme-neutral`.

---

## Application Suite

### 1. Architectural Overview (`index.html`)
* **Physical Permutation Engine**: Interactive group theory introduction.
* **Live Centerpiece Visualizer**: Dual-mode (Encrypt/Decrypt) synchronized telemetry stream displaying Plaintext -> Keystream -> Ciphertext in real-time.
* **Pipeline Walkthrough**: 4-stage interactive walkthrough powered by Astryx `TabList`.
* **Theoretical Specification**: Mathematical breakdown with Astryx `CollapsibleGroup`.

### 2. Cryptographic Lab (`lab.html`)
* **3D Permutation Studio**: Full WebGL camera controls with real-time state hashing.
* **Step-by-Step Operator**: Live algebraic readout inspecting `(Input ± Sensor ± StepConstant) % 53 = Output`.
* **Speed & Animation Controls**: Real-time rotation speed adjustments via Astryx `Slider`.
* **Research Guide**: Modal walkthrough powered by Astryx `Dialog`.

### 3. P2P Secure Chat (`chat.html`)
* **Real-time WebRTC Mesh**: Serverless peer-to-peer transmission via PeerJS with global STUN/TURN fallback.
* **Live 3D Lattice Encryption**: Outgoing messages mechanically rotate the sender's cube, transmitting the ciphertext stream; incoming messages physically rotate the receiver's cube during decryption.
* **Channel Collision Detection**: Prevents state desynchronization with automatic alerts.

### 4. Project Lore & Origins (`lore.html`)
* **Story Archive**: The origin story of the speedcubing accident, lost mouse incident, and the Eureka moment.

---

## Mathematical Specification

### 1. The Permutation Group
The cipher machine operates over the Rubik’s permutation group $G = \langle U, D, L, R, F, B \rangle$. A shared secret seed permutes the initial baseline state across 43 quintillion possible configurations:
$$\text{Lattice}_0 = \text{Permute}(\text{SeedKey}) \in G$$

### 2. Spatial Sensor Extraction
Before encoding character $i$, the engine samples the cubie at the **Front-Top-Right $(1, 1, 1)$** coordinate:
$$K_i = \text{Lattice.Sample}(x=1, y=1, z=1) \in [0 \dots 52]$$

### 3. Cipher Feedback (CFB) Rotation
The generated ciphertext character $C_i$ mechanically rotates the lattice before character $i + 1$:
$$\text{Move}_{i+1} = \text{MovesList}[\text{ASCII}(C_i) \pmod 6] \in \{U, U', R, R', F, F'\}$$

### 4. Modulo-53 Character Transformation
$$C_i = (P_i + K_i + RC_i) \pmod{53} \quad \Big| \quad P_i = (C_i - K_i - RC_i) \pmod{53}$$

---

## Tech Stack

* **UI Framework**: [React 19](https://react.dev/)
* **Design System**: [@astryxdesign/core](https://astryx.atmeta.com/) & [@astryxdesign/theme-neutral](https://astryx.atmeta.com/)
* **3D Graphics Engine**: [Three.js](https://threejs.org/)
* **P2P Transport**: [PeerJS](https://peerjs.com/) (WebRTC)
* **Build Tool**: [Vite](https://vitejs.dev/)

---

## Getting Started

### 1. Clone the Redesign Branch
```bash
git clone -b astryx-redesign https://github.com/Geervan/Cube-Cryptography-Sim.git
cd Cube-Cryptography-Sim
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` to explore the suite.

### 4. Production Build
```bash
npm run build
```

---

## Author

* **Geervan** — [LinkedIn](https://www.linkedin.com/in/geervan/) • [GitHub](https://github.com/Geervan)
