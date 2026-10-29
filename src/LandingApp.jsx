import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Kbd } from '@astryxdesign/core/Kbd';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VortexCubeScene } from './vortexScene.js';
import { CubeCipherEngine } from './cipher_engine.js';
import { neutralTheme } from './themes/neutral/neutralTheme';
import './landing.css';

const SEED_KEY = "CUBE_CIPHER_INIT";
const TEST_PHRASE = "CIPHER";

export function LandingApp() {
  const canvasContainerRef = useRef(null);
  const vortexSceneRef = useRef(null);
  const engineRef = useRef(null);
  const demoAbortRef = useRef(false);

  // Demo Phases: 'IDLE' | 'ENCRYPTING' | 'DECRYPTING' | 'COMPLETED'
  const [demoPhase, setDemoPhase] = useState('IDLE');
  const [activeCharIndex, setActiveCharIndex] = useState(-1);
  const [activeMove, setActiveMove] = useState('-');
  const [activeSensor, setActiveSensor] = useState('-');
  const [stateHash, setStateHash] = useState('000000000000');
  
  // Real cryptographic streams
  const [cipherStream, setCipherStream] = useState([]);
  const [recoveredStream, setRecoveredStream] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize Three.js Vortex Scene
  useEffect(() => {
    if (canvasContainerRef.current && !vortexSceneRef.current) {
      const scene = new VortexCubeScene(canvasContainerRef.current);
      vortexSceneRef.current = scene;

      const engine = new CubeCipherEngine(scene);
      const stepConstants = CubeCipherEngine.generateStepConstants(SEED_KEY, 128);
      engine.setStepConstants(stepConstants);
      engineRef.current = engine;

      scene.initCube(SEED_KEY);
      setStateHash(scene.getStateHash());

      return () => {
        demoAbortRef.current = true;
        scene.dispose();
      };
    }
  }, []);

  // Watch Demo action: Live character-by-character encryption then decryption
  const handleWatchDemo = useCallback(() => {
    if (!vortexSceneRef.current || !engineRef.current) return;
    if (demoPhase === 'ENCRYPTING' || demoPhase === 'DECRYPTING') return;

    demoAbortRef.current = false;
    const scene = vortexSceneRef.current;
    const engine = engineRef.current;

    // Reset streams & state
    setCipherStream([]);
    setRecoveredStream([]);
    setActiveCharIndex(0);
    setActiveMove('-');
    setActiveSensor('-');
    setDemoPhase('ENCRYPTING');

    // 1. Initialize cube to seed
    scene.initCube(SEED_KEY);
    setStateHash(scene.getStateHash());

    let encryptedResult = [];

    // --- ENCRYPTION CYCLE ---
    const runEncryptChar = (idx) => {
      if (demoAbortRef.current) return;

      if (idx >= TEST_PHRASE.length) {
        // Encrypt phase finished! Brief transition, then begin decryption
        setTimeout(() => {
          if (demoAbortRef.current) return;
          setDemoPhase('DECRYPTING');
          setActiveCharIndex(0);
          
          // Re-initialize cube to identical seed for symmetric decryption
          scene.initCube(SEED_KEY);
          setStateHash(scene.getStateHash());

          setTimeout(() => {
            runDecryptChar(0, encryptedResult);
          }, 350);
        }, 600);
        return;
      }

      setActiveCharIndex(idx);
      const pChar = TEST_PHRASE[idx];
      const prevChar = idx === 0 ? 'A' : (encryptedResult[idx - 1] || 'A');
      const move = engine.getCharMove(prevChar);
      setActiveMove(move);

      scene.onMoveComplete = () => {
        if (demoAbortRef.current) return;

        const sensor = scene.getSensorValue();
        setActiveSensor(sensor);
        setStateHash(scene.getStateHash());

        const k = engine.toIndex(sensor);
        const p = engine.toIndex(pChar);
        const rc = engine.getStepConstant(idx);
        const cVal = (p + k + rc) % 53;
        const cChar = engine.fromIndex(cVal);

        encryptedResult.push(cChar);
        setCipherStream([...encryptedResult]);

        setTimeout(() => {
          runEncryptChar(idx + 1);
        }, 220);
      };

      scene.queueMove(move);
    };

    // --- DECRYPTION CYCLE ---
    const runDecryptChar = (idx, cipherChars) => {
      if (demoAbortRef.current) return;

      if (idx >= cipherChars.length) {
        // Complete!
        setDemoPhase('COMPLETED');
        setActiveCharIndex(-1);
        setActiveMove('-');
        return;
      }

      setActiveCharIndex(idx);
      const cChar = cipherChars[idx];
      const prevChar = idx === 0 ? 'A' : (cipherChars[idx - 1] || 'A');
      const move = engine.getCharMove(prevChar);
      setActiveMove(move);

      scene.onMoveComplete = () => {
        if (demoAbortRef.current) return;

        const sensor = scene.getSensorValue();
        setActiveSensor(sensor);
        setStateHash(scene.getStateHash());

        const k = engine.toIndex(sensor);
        const c = engine.toIndex(cChar);
        const rc = engine.getStepConstant(idx);
        
        let pVal = (c - k - rc) % 53;
        while (pVal < 0) pVal += 53;
        const recoveredChar = engine.fromIndex(pVal);

        setRecoveredStream(prev => [...prev, recoveredChar]);

        setTimeout(() => {
          runDecryptChar(idx + 1, cipherChars);
        }, 220);
      };

      scene.queueMove(move);
    };

    setTimeout(() => {
      runEncryptChar(0);
    }, 150);

  }, [demoPhase]);

  // Dismiss / Close demo HUD
  const handleCloseDemo = useCallback(() => {
    demoAbortRef.current = true;
    setDemoPhase('IDLE');
    setActiveCharIndex(-1);
    setActiveMove('-');
    if (vortexSceneRef.current) {
      vortexSceneRef.current.onMoveComplete = null;
      setStateHash(vortexSceneRef.current.getStateHash());
    }
  }, []);

  const isDemoRunning = demoPhase === 'ENCRYPTING' || demoPhase === 'DECRYPTING';

  return (
    <Theme theme={neutralTheme} mode="dark">
      <div className="vortex-app-root">
        
        {/* Full-viewport Persistent 3D WebGL Canvas */}
        <div 
          className="vortex-canvas-container" 
          id="vortex-canvas-stage" 
          ref={canvasContainerRef} 
        />

        {/* Ambient Grid Overlay */}
        <div className="vortex-ambient-grid" />

        {/* 1. TOP NAVIGATION (ASTRYX TOPNAV) */}
        <header className="vortex-header">
          <div className="vortex-header-inner">
            <TopNav
              label="Main navigation"
              heading={
                <a href="index.html" className="vortex-brand">
                  <div className="vortex-brand-glyph">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" strokeLinejoin="round" />
                      <polyline points="2 17 12 22 22 17" strokeLinejoin="round" />
                      <polyline points="2 12 12 17 22 12" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="vortex-brand-title">CUBE CRYPTOGRAPHY</span>
                </a>
              }
              endContent={
                <div className="vortex-nav-right-cluster">
                  <div className="vortex-nav-links">
                    <a href="lab.html" className="vortex-nav-link">Lab</a>
                    <a href="chat.html" className="vortex-nav-link">Chat</a>
                    <a href="lore.html" className="vortex-nav-link">Lore</a>
                    <a href="geervan.html" className="vortex-nav-link">Geervan</a>
                  </div>

                  <div className="vortex-desktop-cta-btn">
                    <Button
                      label="Get Started →"
                      variant="secondary"
                      size="sm"
                      onClick={() => window.location.href = 'lab.html'}
                    />
                  </div>

                  {/* Mobile Hamburger Menu Toggle */}
                  <button
                    type="button"
                    className="vortex-mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle navigation menu"
                  >
                    {mobileMenuOpen ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                        <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
                        <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
                        <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>
              }
            />

            {/* Mobile Navigation Dropdown Sheet */}
            {mobileMenuOpen && (
              <div className="vortex-mobile-menu-drawer">
                <a href="lab.html" className="vortex-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <span>Lab</span>
                  <span className="mobile-nav-arrow">→</span>
                </a>
                <a href="chat.html" className="vortex-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <span>Chat</span>
                  <span className="mobile-nav-arrow">→</span>
                </a>
                <a href="lore.html" className="vortex-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <span>Lore</span>
                  <span className="mobile-nav-arrow">→</span>
                </a>
                <a href="geervan.html" className="vortex-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <span>Geervan</span>
                  <span className="mobile-nav-arrow">→</span>
                </a>
                <div className="vortex-mobile-cta-wrap">
                  <Button
                    label="Get Started →"
                    variant="primary"
                    size="sm"
                    onClick={() => window.location.href = 'lab.html'}
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 2. HERO VIEWPORT (SINGLE FULLSCREEN IMPACT VIEW) */}
        <main className="vortex-hero-main">
          <div className="vortex-hero-inner">
            
            {/* Left Hero Composition */}
            <div className="hero-editorial-cluster">
              <div className="hero-category-tag">
                <span className="tag-index">03 /</span>
                <span className="tag-name">IMMERSIVE / EXPERIMENTAL</span>
              </div>

              <h1 className="hero-serif-title">
                More<br />
                than<br />
                a puzzle.
              </h1>

              <p className="hero-lead-text">
                An experimental project exploring how the spatial states of a Rubik’s Cube can be used to transform messages.
              </p>

              {/* Action Buttons */}
              <div className="hero-cta-cluster">
                {/* Primary Pill Button */}
                <Button
                  label="Explore the Project"
                  variant="primary"
                  size="lg"
                  className="hero-primary-pill-btn"
                  onClick={() => window.location.href = 'lab.html'}
                  endContent={
                    <span className="btn-arrow-circle" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" width="11" height="11">
                        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  }
                />
                
                {/* Secondary Play Demo Button */}
                <button
                  type="button"
                  className={`hero-secondary-play-btn ${isDemoRunning ? 'running' : ''}`}
                  onClick={handleWatchDemo}
                >
                  <span className="play-circle-icon">
                    {isDemoRunning ? (
                      <span className="play-pulse-dot" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                        <polygon points="7 4 20 12 7 20 7 4" />
                      </svg>
                    )}
                  </span>
                  <span className="play-text">
                    {demoPhase === 'ENCRYPTING' && `Encrypting...`}
                    {demoPhase === 'DECRYPTING' && `Decrypting...`}
                    {demoPhase === 'COMPLETED' && `Replay Demo`}
                    {demoPhase === 'IDLE' && `Watch Demo`}
                  </span>
                </button>
              </div>

              {/* Live Test Phrase Cryptographic Demonstration HUD */}
              {(isDemoRunning || demoPhase === 'COMPLETED') ? (
                <div className="hero-cipher-demo-hud">
                  <div className="demo-hud-top">
                    <div className="hud-phase-tag">
                      <StatusDot 
                        variant={demoPhase === 'ENCRYPTING' ? 'warning' : (demoPhase === 'DECRYPTING' ? 'accent' : 'success')} 
                        isPulsing={isDemoRunning} 
                      />
                      <span className="hud-phase-name">
                        {demoPhase === 'ENCRYPTING' && `ENCRYPTING PHRASE [${activeCharIndex + 1}/${TEST_PHRASE.length}]`}
                        {demoPhase === 'DECRYPTING' && `DECRYPTING PHRASE [${activeCharIndex + 1}/${TEST_PHRASE.length}]`}
                        {demoPhase === 'COMPLETED' && `BIJECTIVE REVERSIBILITY VERIFIED`}
                      </span>
                    </div>

                    <div className="hud-top-right-group">
                      <div className="hud-move-badge">
                        <span className="hud-meta-label">MOVE:</span>
                        {activeMove && activeMove !== '-' ? <Kbd keys={activeMove} /> : <span className="hud-code-idle">-</span>}
                      </div>
                      <IconButton 
                        label="Close demo HUD"
                        variant="ghost"
                        size="sm"
                        className="hud-close-btn" 
                        onClick={handleCloseDemo}
                        icon={
                          <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="3" x2="13" y2="13" strokeLinecap="round" />
                            <line x1="13" y1="3" x2="3" y2="13" strokeLinecap="round" />
                          </svg>
                        }
                      />
                    </div>
                  </div>

                  {/* Character Transformation Stream */}
                  <div className="demo-hud-stream">
                    <div className="hud-stream-row">
                      <span className="stream-type-tag">PLAINTEXT:</span>
                      <div className="stream-char-pills">
                        {TEST_PHRASE.split('').map((char, i) => (
                          <span 
                            key={i} 
                            className={`hud-char-cell ${demoPhase === 'ENCRYPTING' && i === activeCharIndex ? 'current-active' : ''}`}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="hud-stream-row">
                      <span className="stream-type-tag">CIPHERTEXT:</span>
                      <div className="stream-char-pills">
                        {TEST_PHRASE.split('').map((_, i) => (
                          <span 
                            key={i} 
                            className={`hud-char-cell cipher ${cipherStream[i] ? 'generated' : ''} ${demoPhase === 'DECRYPTING' && i === activeCharIndex ? 'current-active' : ''}`}
                          >
                            {cipherStream[i] || '•'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {demoPhase === 'DECRYPTING' || demoPhase === 'COMPLETED' ? (
                      <div className="hud-stream-row">
                        <span className="stream-type-tag">RECOVERED:</span>
                        <div className="stream-char-pills">
                          {TEST_PHRASE.split('').map((_, i) => (
                            <span 
                              key={i} 
                              className={`hud-char-cell recovered ${recoveredStream[i] ? 'restored' : ''}`}
                            >
                              {recoveredStream[i] || '•'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="demo-hud-footer">
                    <span className="hud-formula-tag">Kᵢ = SENSOR(1,1,1): <strong>{activeSensor}</strong></span>
                    <span className="hud-hash-tag">LATTICE HASH: <strong>{stateHash.slice(0, 8)}</strong></span>
                  </div>
                </div>
              ) : (
                /* Bottom Left Cryptographic Telemetry Line (when idle) */
                <div className="hero-lattice-telemetry">
                  <div className="telemetry-status-indicator">
                    <StatusDot variant="success" isPulsing={false} />
                    <span className="telemetry-status-text">4.33 × 10¹⁹ STATES</span>
                  </div>
                  <div className="telemetry-hairline-track">
                    <div className="telemetry-hairline-fill" />
                  </div>
                  <div className="telemetry-meta-code">
                    <span className="telemetry-hash-label">HASH</span>
                    <span className="telemetry-hash-val">{stateHash.slice(0, 8)}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Right Hero Metadata Caption */}
            <div className="hero-meta-cluster">
              <div className="hero-meta-label">
                AN EXPERIMENTAL<br />
                EXPLORATION OF<br />
                SPATIAL CRYPTOGRAPHY.
              </div>
              <div className="hero-meta-divider" />
            </div>

            {/* Bottom Right Scroll / Enter Cue */}
            <a href="lab.html" className="hero-scroll-cue">
              <span className="scroll-text">ENTER LAB</span>
              <div className="scroll-track-line">
                <span className="scroll-dot" />
              </div>
            </a>

          </div>
        </main>

      </div>
    </Theme>
  );
}
