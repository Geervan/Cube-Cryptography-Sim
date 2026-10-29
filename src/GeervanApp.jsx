import React, { useEffect, useRef, useState } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Card } from '@astryxdesign/core/Card';
import { VortexCubeScene } from './vortexScene.js';
import { neutralTheme } from './themes/neutral/neutralTheme';
import './landing.css';
import './geervan.css';

export function GeervanApp() {
  const canvasContainerRef = useRef(null);
  const vortexSceneRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Initialize the exact same 3D WebGL background, without the central cube
    const scene = new VortexCubeScene(canvasContainerRef.current, { showCube: false });
    vortexSceneRef.current = scene;

    return () => {
      if (vortexSceneRef.current) {
        vortexSceneRef.current.dispose();
      }
    };
  }, []);

  return (
    <Theme theme={neutralTheme} mode="dark">
      <div className="vortex-app-root geervan-page-root">
        
        {/* Full-viewport Persistent 3D WebGL Canvas (Same background, strictly no cube) */}
        <div 
          className="vortex-canvas-container" 
          id="vortex-canvas-stage" 
          ref={canvasContainerRef} 
        />

        {/* Ambient Grid Overlay */}
        <div className="vortex-ambient-grid" />

        {/* 1. TOP NAVIGATION (STANDARD ASTRYX TOPNAV) */}
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
                    <a href="geervan.html" className="vortex-nav-link active-link">Geervan</a>
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
                <a href="index.html" className="vortex-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <span>Home</span>
                  <span className="mobile-nav-arrow">→</span>
                </a>
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

        {/* 2. CREATOR HERO COMPOSITION */}
        <main className="geervan-main-view">
          <div className="geervan-content-card">
            
            {/* Editorial Tag */}
            <div className="hero-category-tag">
              <span className="tag-index">04 /</span>
              <span className="tag-name">CREATOR & DEVELOPER</span>
            </div>

            {/* Title Header */}
            <h1 className="geervan-headline">
              Geervan.
            </h1>

            {/* Subtitle / Role */}
            <div className="geervan-role-bar">
              <span className="geervan-role-text">CREATIVE DEVELOPER & ARCHITECT</span>
              <span className="geervan-role-dot">•</span>
              <span className="geervan-role-meta">COMPUTATIONAL CIPHER LAB</span>
            </div>

            {/* Bio statement */}
            <p className="geervan-bio-paragraph">
              Creator of <strong>Cube Cryptography</strong> — an experimental exploration merging the 
              spatial transformation states of physical permutation puzzles with modern 
              reversible substitution-permutation networks and interactive 3D WebGL mathematics.
            </p>

            {/* Social & Profiles Link Grid using official Astryx Cards */}
            <div className="geervan-socials-grid">
              
              {/* GitHub Profile */}
              <a 
                href="https://github.com/Geervan" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="geervan-card-anchor"
              >
                <Card variant="default" elevation="low" padding={4}>
                  <div className="astryx-social-card-inner">
                    <div className="social-card-icon-wrap">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </div>
                    <div className="social-card-meta">
                      <div className="social-card-label-row">
                        <span className="social-card-title">GitHub</span>
                        <span className="social-arrow">↗</span>
                      </div>
                      <span className="social-card-handle">github.com/Geervan</span>
                    </div>
                  </div>
                </Card>
              </a>

              {/* LinkedIn Profile */}
              <a 
                href="https://www.linkedin.com/in/geervan/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="geervan-card-anchor"
              >
                <Card variant="default" elevation="low" padding={4}>
                  <div className="astryx-social-card-inner">
                    <div className="social-card-icon-wrap linkedin">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </div>
                    <div className="social-card-meta">
                      <div className="social-card-label-row">
                        <span className="social-card-title">LinkedIn</span>
                        <span className="social-arrow">↗</span>
                      </div>
                      <span className="social-card-handle">linkedin.com/in/geervan</span>
                    </div>
                  </div>
                </Card>
              </a>

              {/* Personal Portfolio */}
              <a 
                href="https://geervan.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="geervan-card-anchor"
              >
                <Card variant="default" elevation="low" padding={4}>
                  <div className="astryx-social-card-inner">
                    <div className="social-card-icon-wrap portfolio">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </div>
                    <div className="social-card-meta">
                      <div className="social-card-label-row">
                        <span className="social-card-title">Portfolio</span>
                        <span className="social-arrow">↗</span>
                      </div>
                      <span className="social-card-handle">geervan.vercel.app</span>
                    </div>
                  </div>
                </Card>
              </a>

            </div>

            {/* Bottom Technical Spec Pill Bar (No Astryx mentions) */}
            <div className="geervan-specs-bar">
              <div className="geervan-spec-item">
                <StatusDot variant="success" isPulsing={false} />
                <span>4.33 × 10¹⁹ STATE SPACE</span>
              </div>
              <div className="geervan-spec-sep">/</div>
              <div className="geervan-spec-item">
                <span className="geervan-spec-dim">MATH:</span>
                <span>BIJECTIVE REVERSIBLE CIPHER</span>
              </div>
              <div className="geervan-spec-sep">/</div>
              <div className="geervan-spec-item">
                <span className="geervan-spec-dim">ENGINE:</span>
                <span>3D PERMUTATION MATRIX</span>
              </div>
            </div>

          </div>
        </main>

      </div>
    </Theme>
  );
}
