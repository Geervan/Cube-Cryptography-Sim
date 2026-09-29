import React, { useState } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TopNav } from '@astryxdesign/core/TopNav';
import { neutralTheme } from './themes/neutral/neutralTheme';
import './lore.css';

export function LoreApp() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Theme theme={neutralTheme} mode="dark">
      <div className="lore-app-container">
        
        {/* 1. TOP NAVIGATION VIA ASTRYX TOPNAV */}
        <header className="lore-header-bar">
          <TopNav
            label="Project Lore Header"
            heading={
              <div className="lore-brand">
                <span className="brand-title">PROJECT_LORE</span>
                <span className="brand-version">// ORIGIN_STORY</span>
              </div>
            }
            endContent={
              <>
                {/* Desktop Nav Actions */}
                <div className="lore-nav-actions desktop-nav">
                  <Button
                    label="← BACK TO LAB"
                    variant="secondary"
                    size="sm"
                    onClick={() => (window.location.href = 'lab.html')}
                  />
                  <Button
                    label="OVERVIEW"
                    variant="secondary"
                    size="sm"
                    onClick={() => (window.location.href = 'index.html')}
                  />
                  <Button
                    label="GITHUB"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open('https://github.com/Geervan/Cube-Cryptography-Sim', '_blank')}
                  />
                  <Button
                    label="SECURE CHAT"
                    variant="secondary"
                    size="sm"
                    onClick={() => (window.location.href = 'chat.html')}
                  />
                </div>

                {/* Mobile Hamburger Toggle Button */}
                <div className="mobile-menu-toggle">
                  <IconButton
                    label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                    variant={isMobileMenuOpen ? "primary" : "secondary"}
                    size="md"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        {isMobileMenuOpen ? (
                          <>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </>
                        ) : (
                          <>
                            <line x1="4" y1="7" x2="20" y2="7"></line>
                            <line x1="4" y1="12" x2="20" y2="12"></line>
                            <line x1="4" y1="17" x2="20" y2="17"></line>
                          </>
                        )}
                      </svg>
                    }
                  />
                </div>
              </>
            }
          />

          {/* Mobile Collapsible Navigation Drawer */}
          <div className={`lore-mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="lore-mobile-nav-items">
              <Button
                label="← BACK TO LAB"
                variant="secondary"
                size="md"
                onClick={() => (window.location.href = 'lab.html')}
              />
              <Button
                label="OVERVIEW"
                variant="secondary"
                size="md"
                onClick={() => (window.location.href = 'index.html')}
              />
              <Button
                label="GITHUB"
                variant="secondary"
                size="md"
                onClick={() => window.open('https://github.com/Geervan/Cube-Cryptography-Sim', '_blank')}
              />
              <Button
                label="SECURE CHAT"
                variant="secondary"
                size="md"
                onClick={() => (window.location.href = 'chat.html')}
              />
            </div>
          </div>
        </header>

        {/* 2. MAIN LORE CONTENT */}
        <main className="lore-content-container">
          <div className="lore-document-sheet">

            <div className="sheet-lead">
              <div className="lead-tag">/// ARCHIVE_TRANSMISSION</div>
              <h1 className="lead-title">The Story Behind Cube Cryptography</h1>
              <p className="lead-sub">
                A spontaneous blend of speedcubing obsession, a misplaced computer mouse, and late-night algorithmic group theory.
              </p>
            </div>

            <div className="lore-story-blocks">

              <div className="lore-block-card">
                <div className="card-badge">PROLOGUE</div>
                <h3>BEFORE THE LORE</h3>
                <p>
                  You guys should know I <strong className="accent-highlight">LOVE CUBES</strong>. Big cube nerd here xdd.
                </p>
                <p className="sub-italic">
                  (This obviously has huge implications on how this whole project was conceived...)
                </p>
              </div>

              <div className="lore-block-card">
                <div className="card-badge">INCIDENT 01</div>
                <h3>THE MOUSE INCIDENT</h3>
                <p>
                  So yeah, I had my <strong>Design Analysis of Algorithms Lab</strong> on <span className="accent-highlight">January 22nd</span>.
                </p>
                <p>
                  Turns out your boy Geervan <em>still</em> loses things (throwback to that Flutter app LinkedIn post XDD), so naturally... <strong>I forgot my mouse in the lab</strong> and didn't realize it till the next day because I didn't have any work.
                </p>
              </div>

              <div className="lore-block-card">
                <div className="card-badge">INCIDENT 02</div>
                <h3>THE CUBE TRAGEDY</h3>
                <p>
                  Ummm yeah, a few days earlier I also <span className="danger-highlight">popped my 4×4 speedcube</span> while doing a timed speedsolve.
                </p>
                <p className="sub-italic">
                  (I know, unlucky... anyway, so I ordered another one on Amazon...)
                </p>
              </div>

              <div className="lore-block-card">
                <div className="card-badge">THE MISSION</div>
                <h3>THE TREASURE HUNT</h3>
                <p>
                  Meanwhile, me and a friend of mine <strong>won the mouse "Treasure Hunt"</strong>!
                </p>
                <p>
                  Btw, huge shoutout to my friend for talking to the lab faculty and retrieving my mouse while I was being nervous — I probably would have stood outside until their class ended ☠️
                </p>
              </div>

              <div className="lore-block-card eureka-card">
                <div className="card-badge eureka-badge">EUREKA MOMENT</div>
                <h3>THE SPARK</h3>
                <p>
                  Moving on... I get a call from the Amazon delivery guy saying <strong>"Your parcel is here."</strong>
                </p>
                <p>
                  I got hyped, unboxed the new speedcube, and started thinking random Geervan thoughts when it suddenly struck me:
                </p>
                <div className="eureka-quote">
                  "What if we used the non-abelian permutation lattice of a Rubik's cube as a physical cipher engine?"
                </div>
                <p>
                  I had a genuine <strong className="accent-highlight">EUREKA MOMENT!</strong> I called my friend and she went <strong>CRAZYYY</strong>. We both went <strong>CRAZYYY</strong>.
                </p>
              </div>

              <div className="lore-block-card">
                <div className="card-badge">OUTCOME</div>
                <h3>PRACTICAL IMPLEMENTATION</h3>
                <p>
                  And here we are: a full 3D WebGL Three.js simulator, deterministic CFB mechanical feedback loops, and Modulo-53 polyalphabetic stream generation.
                </p>
                <div className="signoff-box">
                  <div className="signoff-title">Take careeeeee!!!</div>
                  <div className="signoff-author">— Geervan</div>
                </div>
              </div>

            </div>

            {/* Bottom Return CTA */}
            <div className="lore-return-strip">
              <div className="strip-divider"></div>
              <div className="strip-actions">
                <Button
                  label="LAUNCH ENCRYPTION LAB →"
                  variant="primary"
                  size="md"
                  onClick={() => (window.location.href = 'lab.html')}
                />
                <Button
                  label="TRY P2P SECURE CHAT"
                  variant="secondary"
                  size="md"
                  onClick={() => (window.location.href = 'chat.html')}
                />
              </div>
            </div>

          </div>
        </main>

      </div>
    </Theme>
  );
}
