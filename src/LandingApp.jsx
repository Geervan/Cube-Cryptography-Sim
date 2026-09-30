import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { TopNav, TopNavItem } from '@astryxdesign/core/TopNav';
import { Kbd } from '@astryxdesign/core/Kbd';
import { CubeSimulator } from './cube.js';
import { CubeCipherEngine } from './cipher_engine.js';
import { neutralTheme } from './themes/neutral/neutralTheme';
import './landing.css';

const DEMO_PHRASE = "Geervan Welcomes you";
const SEED_KEY = "CUBE_CIPHER_INIT";

export function LandingApp() {
  const cubeContainerRef = useRef(null);
  const cubeRef = useRef(null);
  const engineRef = useRef(null);
  const timerRef = useRef(null);

  // Mode: 'ENCRYPT' | 'DECRYPT'
  const [demoMode, setDemoMode] = useState('ENCRYPT');
  
  // Simulation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('READY');
  const [stateHash, setStateHash] = useState('000000000000');
  const [sensorChar, setSensorChar] = useState('-');
  const [lastMove, setLastMove] = useState('-');

  // Stream Arrays
  const [keystream, setKeystream] = useState([]);
  const [outputStream, setOutputStream] = useState([]);

  // Precomputed Ciphertext for Decrypt Demo
  const [computedCiphertext, setComputedCiphertext] = useState("");

  // Interactive Walkthrough Stage
  const [activeStage, setActiveStage] = useState(0);

  // Progressive Disclosure State
  const [disclosures, setDisclosures] = useState({
    sensor: true,
    modulo: false,
    cfb: false,
  });

  const toggleDisclosure = (key) => {
    setDisclosures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Pre-calculate full ciphertext once on mount for reference
  useEffect(() => {
    const stepConstants = CubeCipherEngine.generateStepConstants(SEED_KEY, 128);
    // Simulation runner to compute reference ciphertext
    const movesList = ['U', "U'", 'R', "R'", 'F', "F'"];
    const toIdx = (c) => {
      if (c === ' ') return 52;
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return code - 65;
      if (code >= 97 && code <= 122) return code - 97 + 26;
      return 0;
    };
    const fromIdx = (i) => {
      if (i === 52) return ' ';
      if (i <= 25) return String.fromCharCode(i + 65);
      return String.fromCharCode(i - 26 + 97);
    };

    // Deterministic simulation
    let cipherOut = "";
    let lastChar = 'A';
    for (let i = 0; i < DEMO_PHRASE.length; i++) {
      const p = toIdx(DEMO_PHRASE[i]);
      const k = (p * 7 + i * 13 + 17) % 53; // Mock initial sensor before visualizer sync
      const rc = stepConstants[i % stepConstants.length] || 0;
      const c = (p + k + rc) % 53;
      const cChar = fromIdx(c);
      cipherOut += cChar;
      lastChar = cChar;
    }
    setComputedCiphertext(cipherOut);
  }, []);

  // Initialize Three.js Cube and auto-start simulation
  useEffect(() => {
    if (cubeContainerRef.current && !cubeRef.current) {
      const cube = new CubeSimulator('hero-cube-container');
      cubeRef.current = cube;
      const engine = new CubeCipherEngine(cube);
      const stepConstants = CubeCipherEngine.generateStepConstants(SEED_KEY, 128);
      engine.setStepConstants(stepConstants);
      engineRef.current = engine;

      cube.initCube(SEED_KEY);
      setStateHash(cube.getStateHash());

      // Auto-start demonstration after brief delay for visual setup
      const autoStartTimer = setTimeout(() => {
        setIsPlaying(true);
      }, 700);

      return () => clearTimeout(autoStartTimer);
    }
  }, []);

  // Reset Simulation
  const handleReset = useCallback((modeToSet) => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex(0);
    setKeystream([]);
    setOutputStream([]);
    setStatus('READY');
    setSensorChar('-');
    setLastMove('-');
    if (cubeRef.current) {
      cubeRef.current.initCube(SEED_KEY);
      setStateHash(cubeRef.current.getStateHash());
    }
  }, []);

  // Switch Mode
  const handleModeChange = (mode) => {
    setDemoMode(mode);
    handleReset(mode);
    setTimeout(() => setIsPlaying(true), 200);
  };

  // Step Execution (One Character Processed through the physical cube)
  const processNextStep = useCallback(() => {
    if (!cubeRef.current || !engineRef.current) return;

    const inputData = demoMode === 'ENCRYPT' ? DEMO_PHRASE : (computedCiphertext || DEMO_PHRASE);
    if (currentIndex >= inputData.length) {
      return;
    }

    setStatus('PROCESSING');
    const prevChar = currentIndex === 0 ? 'A' : (demoMode === 'ENCRYPT' ? (outputStream[currentIndex - 1] || 'A') : (inputData[currentIndex - 1] || 'A'));
    const move = engineRef.current.getCharMove(prevChar);
    setLastMove(move);

    const char = inputData[currentIndex];

    // Listen for completion of the mechanical rotation
    cubeRef.current.onMoveComplete = () => {
      const sensor = cubeRef.current.getSensorValue();
      setSensorChar(sensor);
      setStateHash(cubeRef.current.getStateHash());

      const k = engineRef.current.toIndex(sensor);
      const rc = engineRef.current.getStepConstant(currentIndex);

      let outChar = '';
      if (demoMode === 'ENCRYPT') {
        const p = engineRef.current.toIndex(char);
        const cVal = (p + k + rc) % 53;
        outChar = engineRef.current.fromIndex(cVal);
      } else {
        const c = engineRef.current.toIndex(char);
        let pVal = (c - k - rc) % 53;
        while (pVal < 0) pVal += 53;
        outChar = engineRef.current.fromIndex(pVal);
      }

      setKeystream(prev => [...prev, sensor]);
      setOutputStream(prev => {
        const updated = [...prev, outChar];
        if (demoMode === 'ENCRYPT' && updated.length === DEMO_PHRASE.length) {
          setComputedCiphertext(updated.join(''));
        }
        return updated;
      });

      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);

      if (nextIdx >= inputData.length) {
        setIsPlaying(false);
        setStatus('COMPLETED');

        // Automatic mode toggle loop: First Encrypt -> Then Decrypt -> Repeat
        timerRef.current = setTimeout(() => {
          if (demoMode === 'ENCRYPT') {
            setDemoMode('DECRYPT');
            handleReset('DECRYPT');
            setTimeout(() => setIsPlaying(true), 300);
          } else {
            setDemoMode('ENCRYPT');
            handleReset('ENCRYPT');
            setTimeout(() => setIsPlaying(true), 300);
          }
        }, 2200);
      }
    };

    // Execute Move in 3D WebGL
    cubeRef.current.queueMove(move);
  }, [currentIndex, demoMode, computedCiphertext, outputStream, handleReset]);

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      const inputData = demoMode === 'ENCRYPT' ? DEMO_PHRASE : (computedCiphertext || DEMO_PHRASE);
      if (currentIndex < inputData.length) {
        timerRef.current = setTimeout(() => {
          processNextStep();
        }, 500);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, processNextStep, demoMode, computedCiphertext]);

  const togglePlay = () => {
    const inputData = demoMode === 'ENCRYPT' ? DEMO_PHRASE : (computedCiphertext || DEMO_PHRASE);
    if (currentIndex >= inputData.length) {
      handleReset(demoMode);
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const activeInputStr = demoMode === 'ENCRYPT' ? DEMO_PHRASE : (computedCiphertext || DEMO_PHRASE);

  return (
    <Theme theme={neutralTheme} mode="dark">
      <div className="cube-shell">
        <div className="cube-grid-overlay"></div>

        {/* 1. TOP NAVIGATION (ASTRYX TOPNAV PRIMITIVE) */}
        <header className="cube-nav-header">
          <div className="cube-nav-container">
            <TopNav
              label="Main Navigation"
              heading={
                <a href="index.html" className="cube-brand">
                  <div className="cube-brand-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                  </div>
                  <span className="cube-brand-name">Cube Cryptography</span>
                  <span className="cube-version-badge">v1.2.0 CFB</span>
                </a>
              }
              centerContent={
                <div className="cube-nav-menu">
                  <TopNavItem label="Overview" href="index.html" isSelected />
                  <TopNavItem label="Encryption Lab" href="lab.html" />
                  <TopNavItem label="P2P Secure Chat" href="chat.html" />
                  <TopNavItem label="Lore & Specs" href="lore.html" />
                </div>
              }
              endContent={
                <div className="cube-nav-right">
                  <Button
                    label="GitHub"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open('https://github.com/Geervan/Cube-Cryptography-Sim/tree/astryx-redesign', '_blank')}
                  />
                  <Button
                    label="Enter Lab"
                    variant="primary"
                    size="sm"
                    onClick={() => window.location.href = 'lab.html'}
                  />
                </div>
              }
            />
          </div>
        </header>

        {/* 2. HERO: EDITORIAL COMPOSITION + LIVE ENGINE CENTERPIECE */}
        <main>
          <section className="cube-hero-section">
            <div className="cube-hero-grid">
              
              {/* Left Column: Brief, Principles & Action Trigger */}
              <div className="cube-hero-left">
                <div className="hero-tagline-badge">
                  PHYSICAL PERMUTATION ENGINE
                </div>

                <h1 className="cube-hero-title">
                  Group Theory as a Cryptographic Machine
                </h1>

                <div className="cube-hero-subtitle">
                  A mechanical stream cipher built on 3D lattice state machines, continuous cipher feedback, and discrete spatial sampling.
                </div>

                <p className="cube-hero-description">
                  Project Cube models cryptographic entropy through the 4.33 &times; 10¹⁹ state space of a Rubik’s permutation lattice. Every ciphertext character mechanically rotates the cube, producing an evolving, non-linear keystream.
                </p>

                {/* Hero Actions (Astryx Buttons) */}
                <div className="cube-hero-actions">
                  <Button
                    label="Launch Encryption Lab →"
                    variant="primary"
                    size="md"
                    onClick={() => window.location.href = 'lab.html'}
                  />
                  <Button
                    label="Explore Mathematics"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      const el = document.getElementById('walkthrough');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Live Interactive Cryptographic Engine Demonstration */}
              <div className="live-demo-panel">
                <div className="demo-top-bar">
                  <div className="demo-title-cluster">
                    <span className="demo-title-text">Live Cipher Demonstration</span>
                    <Tooltip
                      content={
                        status === 'PROCESSING' 
                          ? (demoMode === 'ENCRYPT' ? 'Active CFB character stream encryption' : 'Active CFB character stream decryption')
                          : (status === 'COMPLETED' ? 'Lattice synchronized with message stream' : 'Engine ready')
                      }
                      placement="above"
                    >
                      <div className={`cube-status-pill cube-status-pill-${status === 'PROCESSING' ? (demoMode === 'ENCRYPT' ? 'warning' : 'info') : (status === 'COMPLETED' ? 'success' : 'neutral')}`}>
                        <StatusDot
                          variant={status === 'PROCESSING' ? (demoMode === 'ENCRYPT' ? 'warning' : 'accent') : (status === 'COMPLETED' ? 'success' : 'neutral')}
                          isPulsing={status === 'PROCESSING'}
                          label={status === 'PROCESSING' ? (demoMode === 'ENCRYPT' ? 'ENCRYPTING' : 'DECRYPTING') : (status === 'COMPLETED' ? 'SYNCED' : 'IDLE')}
                        />
                        <span>
                          {status === 'PROCESSING' 
                            ? (demoMode === 'ENCRYPT' ? 'ENCRYPTING' : 'DECRYPTING')
                            : (status === 'COMPLETED' ? 'SYNCED' : 'IDLE')}
                        </span>
                      </div>
                    </Tooltip>
                  </div>

                  {/* Astryx SegmentedControl for Mode Switching */}
                  <SegmentedControl
                    value={demoMode}
                    onChange={handleModeChange}
                    label="Cipher mode"
                    size="sm"
                  >
                    <SegmentedControlItem value="ENCRYPT" label="ENCRYPT" />
                    <SegmentedControlItem value="DECRYPT" label="DECRYPT" />
                  </SegmentedControl>
                </div>

                {/* 3D WebGL Canvas Centerpiece */}
                <div className="demo-viewport-stage" id="hero-cube-container" ref={cubeContainerRef}>
                  <div className="demo-hud-overlay">
                    <Tooltip content="Sensor reads cubie identity at Front-Top-Right coordinate (1, 1, 1)" placement="right">
                      <span className="hud-tag">SENSOR (1,1,1): {sensorChar}</span>
                    </Tooltip>
                    <Tooltip content="3D mechanical rotation move generated by cipher feedback" placement="right">
                      <span className="hud-tag">LAST MOVE: {lastMove && lastMove !== '-' ? <Kbd keys={lastMove} /> : '-'}</span>
                    </Tooltip>
                  </div>
                </div>

                {/* Live Telemetry Streams (Input -> Keystream -> Output) */}
                <div className="demo-telemetry-console">
                  {/* Stream 1: Input */}
                  <div className="stream-row">
                    <span className="stream-label">{demoMode === 'ENCRYPT' ? 'PLAINTEXT' : 'CIPHERTEXT'}</span>
                    <div className="stream-track">
                      {activeInputStr.split('').map((ch, idx) => (
                        <span
                          key={idx}
                          className={`char-cell ${idx === currentIndex ? 'active' : (idx < currentIndex ? 'completed' : '')}`}
                        >
                          {ch === ' ' ? '␣' : ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stream 2: Keystream */}
                  <div className="stream-row">
                    <span className="stream-label">KEYSTREAM</span>
                    <div className="stream-track">
                      {activeInputStr.split('').map((_, idx) => (
                        <span
                          key={idx}
                          className={`char-cell ${idx === currentIndex ? 'active' : ''}`}
                          style={{ color: 'var(--cube-accent-cyan)' }}
                        >
                          {keystream[idx] ? keystream[idx] : '•'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stream 3: Output */}
                  <div className="stream-row">
                    <span className="stream-label">{demoMode === 'ENCRYPT' ? 'CIPHERTEXT' : 'RECOVERED'}</span>
                    <div className="stream-track">
                      {activeInputStr.split('').map((_, idx) => (
                        <span
                          key={idx}
                          className={`char-cell ${idx === currentIndex ? 'active' : (outputStream[idx] ? 'completed' : '')}`}
                          style={{ color: 'var(--cube-accent-green)', fontWeight: 600 }}
                        >
                          {outputStream[idx] ? (outputStream[idx] === ' ' ? '␣' : outputStream[idx]) : '-'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Demonstration Action Controls (Astryx Buttons) */}
                <div className="demo-controls-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      label={isPlaying ? "Pause" : (currentIndex >= activeInputStr.length ? "Replay" : "Play")}
                      variant="primary"
                      size="sm"
                      onClick={togglePlay}
                    />
                    <Button
                      label="Step →"
                      variant="secondary"
                      size="sm"
                      onClick={processNextStep}
                      isDisabled={isPlaying || currentIndex >= activeInputStr.length}
                    />
                    <Button
                      label="Reset"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleReset(demoMode)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cube-text-muted)', letterSpacing: '0.04em' }}>
                      CHAR {currentIndex} / {activeInputStr.length}
                    </span>
                    <Tooltip content="SHA-256 state hash of the internal 3D lattice configuration" placement="above">
                      <div className="cube-hash-pill">
                        <span className="cube-hash-label">HASH</span>
                        <span className="cube-hash-code">{stateHash.slice(0, 8)}</span>
                      </div>
                    </Tooltip>
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* 3. TECHNICAL SPECIFICATIONS STRIP */}
          <section className="cube-facts-section">
            <div className="cube-facts-strip">
              <div className="fact-item">
                <span className="fact-label">STATE SPACE</span>
                <span className="fact-value">4.33 &times; 10¹⁹</span>
              </div>
              <div className="fact-item">
                <span className="fact-label">CIPHER</span>
                <span className="fact-value">Mod 53 [A–Za–z ]</span>
              </div>
              <div className="fact-item">
                <span className="fact-label">LATTICE SENSOR</span>
                <span className="fact-value">(1, 1, 1) FTR</span>
              </div>
              <div className="fact-item">
                <span className="fact-label">P2P TRANSPORT</span>
                <span className="fact-value">WebRTC Mesh</span>
              </div>
            </div>
          </section>

          {/* 4. SECTION 2: "HOW THE CUBE THINKS" (ASTRYX TABLIST & TAB WALKTHROUGH) */}
          <section className="cube-walkthrough-section" id="walkthrough">
            <div className="section-lead-header">
              <div className="section-mini-tag">// ARCHITECTURAL PIPELINE</div>
              <h2 className="section-title">How The Cube Thinks</h2>
            </div>

            <div className="walkthrough-container">
              {/* Top Tab Bar via Astryx TabList */}
              <div className="walkthrough-tabs-header">
                <TabList
                  value={String(activeStage)}
                  onChange={(val) => setActiveStage(Number(val))}
                  aria-label="Cryptographic pipeline stages"
                  hasDivider
                  size="md"
                >
                  <Tab value="0" label="01 · LATTICE STATE" />
                  <Tab value="1" label="02 · SENSOR EXTRACTION" />
                  <Tab value="2" label="03 · CFB ROTATION" />
                  <Tab value="3" label="04 · MOD-53 STREAM" />
                </TabList>
              </div>

              {/* Stage Display View */}
              <div className="walkthrough-stage-view">
                {activeStage === 0 && (
                  <>
                    <div className="stage-badge">STAGE 01 &bull; LATTICE ENGINE</div>
                    <div className="stage-headline">Physical 3D Group Theory as an Entropy Machine</div>
                    <p className="stage-explanation">
                      The cipher machine operates over the Rubik’s permutation group G = &lang;U, D, L, R, F, B&rang;. A user's shared secret seeds the lattice into an initial non-linear baseline permutation of 43,252,003,274,489,856,000 distinct configurations.
                    </p>
                    <div className="stage-technical-callout">
                      <span>LATTICE INVARIANT:</span>
                      <span className="callout-code">Lattice_0 = Permute_Seed(Key_String) &isin; Group_Rubik</span>
                    </div>
                  </>
                )}

                {activeStage === 1 && (
                  <>
                    <div className="stage-badge">STAGE 02 &bull; SENSOR EXTRACTION</div>
                    <div className="stage-headline">Discrete Spatial Sampling at Coordinate (1, 1, 1)</div>
                    <p className="stage-explanation">
                      Before each character is encoded, the engine reads the cubie piece situated at the Front-Top-Right (1, 1, 1) lattice coordinate. The identity index of this single piece provides the instantaneous stream key Kᵢ for that transformation cycle.
                    </p>
                    <div className="stage-technical-callout">
                      <span>SENSOR SAMPLING FUNCTION:</span>
                      <span className="callout-code">K_i = Lattice.ExtractPieceAt(x = 1, y = 1, z = 1)</span>
                    </div>
                  </>
                )}

                {activeStage === 2 && (
                  <>
                    <div className="stage-badge">STAGE 03 &bull; CIPHER FEEDBACK (CFB)</div>
                    <div className="stage-headline">Mechanical Rotation Induced by Cipher Feedback</div>
                    <p className="stage-explanation">
                      Cipher Feedback mode ensures that the ciphertext of character <em>i</em> dictates the physical rotation move for step <em>i + 1</em>. The cube physically turns in 3D space, changing the sensor reading and ensuring that repeating letters (like "ee" in "Geervan") yield completely different cipher symbols.
                    </p>
                    <div className="stage-technical-callout">
                      <span>CFB ROTATION INVARIANT:</span>
                      <span className="callout-code">Move_(i+1) = MovesList[ Ascii(C_i) mod 6 ] &isin; &#123;U, U', R, R', F, F'&#125;</span>
                    </div>
                  </>
                )}

                {activeStage === 3 && (
                  <>
                    <div className="stage-badge">STAGE 04 &bull; OUTPUT GENERATION</div>
                    <div className="stage-headline">Bijective Modulo-53 Character Mapping</div>
                    <p className="stage-explanation">
                      The plaintext character Pᵢ, instantaneous sensor key Kᵢ, and key-dependent round constant RCᵢ are algebraically combined over the 53-element alphabet space [A-Z, a-z, space].
                    </p>
                    <div className="stage-technical-callout">
                      <span>ALGEBRAIC TRANSFORMATION:</span>
                      <span className="callout-code">C_i = (P_i + K_i + RC_i) mod 53 &nbsp;|&nbsp; P_i = (C_i - K_i - RC_i) mod 53</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 5. MATHEMATICS & PROGRESSIVE DISCLOSURE (ASTRYX COLLAPSIBLE GROUP) */}
          <section className="cube-math-section">
            <div className="math-editorial-box">
              <div>
                <div className="section-mini-tag">// THEORETICAL SPECIFICATION</div>
                <h2 className="section-title" style={{ marginTop: '4px' }}>
                  Geometric structure behind the cipher.
                </h2>
              </div>

              <p className="math-editorial-lead">
                Unlike traditional cryptographic stream ciphers relying on linear LFSR bit-shifts, Cube Cryptography constructs its state evolution within the non-abelian permutation group of a 3D lattice.
              </p>

              <div className="math-disclosure-list">
                <CollapsibleGroup hasDividers={false}>
                  {/* Collapsible 1 */}
                  <Collapsible
                    trigger={
                      <span className="math-trigger-label">
                        01. Sensor Key Extraction (1, 1, 1)
                      </span>
                    }
                    defaultIsOpen={true}
                  >
                    <div className="math-body">
                      <p>
                        The keystream sampler extracts the piece residing at the Front-Top-Right corner of the lattice. Because the CFB feedback moves (U, R, F) specifically intersect this corner, the sensor value changes deterministically with each step.
                      </p>
                      <div className="math-formula-box">
                        Kᵢ = Lattice.Sample(x = 1, y = 1, z = 1) &isin; [0 .. 52]
                      </div>
                    </div>
                  </Collapsible>

                  {/* Collapsible 2 */}
                  <Collapsible
                    trigger={
                      <span className="math-trigger-label">
                        02. Modulo-53 Arithmetic
                      </span>
                    }
                    defaultIsOpen={false}
                  >
                    <div className="math-body">
                      <p>
                        Characters [A-Z (0-25), a-z (26-51), space (52)] form a closed finite field. The round constants RCᵢ are derived during initialization using key expansion.
                      </p>
                      <div className="math-formula-box">
                        Encryption: Cᵢ = (Pᵢ + Kᵢ + RCᵢ) mod 53<br />
                        Decryption: Pᵢ = (Cᵢ - Kᵢ - RCᵢ) mod 53
                      </div>
                    </div>
                  </Collapsible>

                  {/* Collapsible 3 */}
                  <Collapsible
                    trigger={
                      <span className="math-trigger-label">
                        03. Cipher Feedback (CFB)
                      </span>
                    }
                    defaultIsOpen={false}
                  >
                    <div className="math-body">
                      <p>
                        The generated ciphertext character Cᵢ determines the mechanical rotation move before processing index i + 1. This feedback guarantees that identical characters in a message yield completely different ciphertext characters.
                      </p>
                      <div className="math-formula-box">
                        Move_{'{i+1}'} = f_mechanical(Cᵢ) &isin; &#123;U, U', R, R', F, F'&#125;
                      </div>
                    </div>
                  </Collapsible>
                </CollapsibleGroup>
              </div>
            </div>
          </section>

          {/* 6. FINAL CTA (ASTRYX BUTTONS) */}
          <section className="cube-final-cta-section">
            <div className="final-cta-banner">
              <div>
                <div className="cta-title">Ready to enter the machine?</div>
                <div className="cta-sub">
                  Inspect the physical lattice permutation engine in the live experimental lab.
                </div>
              </div>
              <div className="final-cta-actions">
                <Button
                  label="Launch Encryption Lab →"
                  variant="primary"
                  size="md"
                  onClick={() => window.location.href = 'lab.html'}
                />
                <Button
                  label="View Source on GitHub"
                  variant="secondary"
                  size="md"
                  onClick={() => window.open('https://github.com/Geervan/Cube-Cryptography-Sim/tree/astryx-redesign', '_blank')}
                />
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="cube-footer">
          <div className="footer-wrap">
            <div>CUBE CRYPTOGRAPHY &bull; 3D LATTICE PERMUTATION CIPHER</div>
            <div className="footer-nav-items">
              <a href="lab.html">Lab</a>
              <a href="chat.html">Secure Chat</a>
              <a href="lore.html">Lore & Specs</a>
              <a href="https://github.com/Geervan/Cube-Cryptography-Sim" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/in/geervan" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
        </footer>

      </div>
    </Theme>
  );
}
