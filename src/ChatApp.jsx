import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Divider } from '@astryxdesign/core/Divider';
import { Avatar } from '@astryxdesign/core/Avatar';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  ChatMessage,
  ChatMessageBubble,
  ChatSystemMessage,
  ChatSendButton,
  ChatMessageList
} from '@astryxdesign/core/Chat';
import { Peer } from 'peerjs';
import { CubeSimulator } from './cube.js';
import { CubeCipherEngine } from './cipher_engine.js';
import { neutralTheme } from './themes/neutral/neutralTheme';
import './chat.css';

export function ChatApp() {
  const cubeRef = useRef(null);
  const engineRef = useRef(null);
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const chatScrollRef = useRef(null);
  const lastHeartbeatRef = useRef(Date.now());

  // Connection & Config States
  const [myId, setMyId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [alias, setAlias] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [activeKey, setActiveKey] = useState('DEFAULT');
  const sharedKeyRef = useRef('DEFAULT');
  const moveHistoryRef = useRef([]);
  const [connStatus, setConnStatus] = useState('DISCONNECTED'); // 'DISCONNECTED' | 'CONNECTED' | 'COLLISION'
  const [inputText, setInputText] = useState('');
  const [isChannelBusy, setIsChannelBusy] = useState(false);
  const isChannelBusyRef = useRef(false);
  const [channelStatusText, setChannelStatusText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleIncomingDataRef = useRef(null);

  // Parse URL invite parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetParam = params.get('connect') || params.get('target');
      const keyParam = params.get('key');
      if (keyParam) {
        setKeyInput(keyParam);
        setActiveKey(keyParam);
        sharedKeyRef.current = keyParam;
      }
      if (targetParam) {
        setTargetId(targetParam);
      }
    }
  }, []);

  // Message Stream
  const [messages, setMessages] = useState([
    { id: 1, type: 'system', text: 'Secure P2P Environment Initialized', variant: 'divider' },
    { id: 2, type: 'system', text: 'Step 1: Set a Shared Key above', variant: 'default' },
    { id: 3, type: 'system', text: 'Step 2: Share your Peer ID or paste a Target ID to link', variant: 'default' },
    { id: 4, type: 'system', text: 'Ready for secure transmission', variant: 'divider' }
  ]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addSystemLog = useCallback((msg, variant = 'default') => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: 'system',
        text: msg,
        variant
      }
    ]);
  }, []);

  // Initialize & Commit Key
  const handleSetKey = useCallback((keyToSet, broadcast = true) => {
    const rawKey = keyToSet !== undefined && keyToSet !== '' ? keyToSet : keyInput;
    const key = (rawKey && rawKey.trim() !== '') ? rawKey.trim() : 'DEFAULT';
    
    setKeyInput(key);
    setActiveKey(key);
    sharedKeyRef.current = key;
    moveHistoryRef.current = [];

    if (cubeRef.current) {
      cubeRef.current.initCube(key);
    }

    if (engineRef.current) {
      const rcs = CubeCipherEngine.generateStepConstants(key, 1024);
      console.log('%c[CHAT_SYNC] Generated Key-Dependent RC Table:', 'color: #00ff88; font-weight: bold;', rcs);
      engineRef.current.setStepConstants(rcs);
    }

    addSystemLog(`Shared Key set to: ${key} (RC Updated)`, 'default');

    if (broadcast && connRef.current && connRef.current.open) {
      addSystemLog('Broadcasting updated Key to Peer...', 'default');
      connRef.current.send({
        type: 'SYNC',
        payload: { key }
      });
    }
  }, [keyInput, addSystemLog]);

  // Collision
  const handleCollision = useCallback((isInitiator = false) => {
    addSystemLog('Collision Detected — Please Click \'SET\' to Resync', 'divider');
    setConnStatus('COLLISION');
    setIsChannelBusy(false);

    if (isInitiator && connRef.current && connRef.current.open) {
      connRef.current.send({ type: 'SIGNAL', payload: 'COLLISION' });
    }

    if (cubeRef.current) {
      cubeRef.current.initCube(sharedKeyRef.current || 'DEFAULT');
    }
  }, [addSystemLog]);

  // Incoming Data
  const handleIncomingData = useCallback((data) => {
    if (data.type === 'SYNC') {
      const newKey = data.payload.key || 'DEFAULT';
      addSystemLog(`Synchronizing 3D Cube Crypto Lattice to Host Key: ${newKey}`, 'default');
      setKeyInput(newKey);
      setActiveKey(newKey);
      sharedKeyRef.current = newKey;

      if (cubeRef.current) {
        cubeRef.current.initCube(newKey);
        if (data.payload.moves && Array.isArray(data.payload.moves) && data.payload.moves.length > 0) {
          cubeRef.current.applyMovesInstant(data.payload.moves);
          moveHistoryRef.current = [...data.payload.moves];
        } else {
          moveHistoryRef.current = [];
        }
      }
      if (engineRef.current) {
        const rcs = CubeCipherEngine.generateStepConstants(newKey, 1024);
        console.log('%c[CHAT_SYNC] Received & Generated RC Table:', 'color: #00ff88; font-weight: bold;', rcs);
        engineRef.current.setStepConstants(rcs);
      }
    } else if (data.type === 'SIGNAL') {
      if (data.payload === 'START_STREAM' || data.payload === 'START_ENC') {
        if (isChannelBusyRef.current) {
          handleCollision(true);
        } else {
          isChannelBusyRef.current = true;
          setIsChannelBusy(true);
          setChannelStatusText('DECRYPTING INCOMING STREAM...');
          addSystemLog('Incoming encrypted stream detected — Decrypting 3D lattice...', 'default');
        }
      } else if (data.payload === 'STREAM_DONE') {
        isChannelBusyRef.current = false;
        setIsChannelBusy(false);
        setChannelStatusText('');
        addSystemLog('Peer completed 3D decryption. Channel ready.', 'default');
      } else if (data.payload === 'COLLISION') {
        handleCollision(false);
      }
    } else if (data.type === 'GOODBYE') {
      setConnStatus('DISCONNECTED');
      connRef.current = null;
      isChannelBusyRef.current = false;
      setIsChannelBusy(false);
      setChannelStatusText('');
      addSystemLog('Peer closed session / left chat.', 'divider');
      return;
    } else if (data.type === 'PING') {
      try {
        if (connRef.current && connRef.current.open) {
          connRef.current.send({ type: 'PONG' });
        }
      } catch (e) {}
      return;
    } else if (data.type === 'PONG') {
      lastHeartbeatRef.current = Date.now();
      return;
    } else if (data.type === 'MSG') {
        isChannelBusyRef.current = true;
        setIsChannelBusy(true);
        setChannelStatusText('DECRYPTING 3D LATTICE...');
        const ciphertext = data.payload || '';
        const senderAlias = data.alias || 'PEER';
        
        console.log('%c[NETWORK INCOMING] Payload: ' + ciphertext, 'color: #f59e0b; font-weight: bold;');

        const msgId = Date.now() + Math.random();
        setMessages(prev => [
          ...prev,
          {
            id: msgId,
            type: 'received',
            alias: senderAlias,
            plaintext: '',
            ciphertext
          }
        ]);

        if (engineRef.current) {
          engineRef.current.decryptSequence(
            ciphertext,
            'A',
            (char, idx, details) => {
              if (details.move) {
                moveHistoryRef.current.push(details.move);
              }
              setMessages(currentMsgs =>
                currentMsgs.map(m =>
                  m.id === msgId ? { ...m, plaintext: (m.plaintext || '') + details.p } : m
                )
              );
            },
            (fullPlaintext) => {
              isChannelBusyRef.current = false;
              setIsChannelBusy(false);
              setChannelStatusText('');
              if (connRef.current && connRef.current.open) {
                try {
                  connRef.current.send({ type: 'SIGNAL', payload: 'STREAM_DONE' });
                } catch (e) {}
              }
            }
          );
        }
      }
    },
    [handleCollision, addSystemLog]
  );

  handleIncomingDataRef.current = handleIncomingData;

  // Handle incoming connection
  const setupConnection = useCallback(
    (conn, isReceiver) => {
      connRef.current = conn;
      lastHeartbeatRef.current = Date.now();

      // Active Heartbeat ping-pong to keep NAT open and detect silent drops within seconds
      let heartbeatTimer = null;

      let isDisconnectedLogged = false;
      const markDisconnected = (reason = 'Peer disconnected from session.') => {
        if (!isDisconnectedLogged) {
          isDisconnectedLogged = true;
          setConnStatus('DISCONNECTED');
          connRef.current = null;
          isChannelBusyRef.current = false;
          setIsChannelBusy(false);
          setChannelStatusText('');
          addSystemLog(reason, 'divider');
        }
      };

      conn.on('open', () => {
        isDisconnectedLogged = false;
        setConnStatus('CONNECTED');
        addSystemLog('Secure P2P Channel Established', 'divider');

        // Hook direct WebRTC ICE connection state transitions
        if (conn.peerConnection) {
          conn.peerConnection.oniceconnectionstatechange = () => {
            const state = conn.peerConnection?.iceConnectionState;
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
              markDisconnected('Peer disconnected from session.');
            }
          };
          conn.peerConnection.onconnectionstatechange = () => {
            const state = conn.peerConnection?.connectionState;
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
              markDisconnected('Peer disconnected from session.');
            }
          };
        }

        heartbeatTimer = setInterval(() => {
          if (conn.open) {
            try {
              conn.send({ type: 'PING' });
            } catch (e) {}

            // Generous 35s timeout: switching apps on mobile (e.g. to WhatsApp) will NOT drop the session
            if (Date.now() - lastHeartbeatRef.current > 35000) {
              markDisconnected('Peer timed out / connection lost.');
              clearInterval(heartbeatTimer);
            }
          }
        }, 5000);

        if (isReceiver) {
          const currentKey = sharedKeyRef.current || 'DEFAULT';
          addSystemLog(`Peer linked. Broadcasting Key State (${currentKey}) & ${moveHistoryRef.current.length} cumulative moves...`, 'default');
          conn.send({
            type: 'SYNC',
            payload: { key: currentKey, moves: moveHistoryRef.current }
          });
        } else {
          const currentKey = sharedKeyRef.current;
          if (currentKey && currentKey !== 'DEFAULT') {
            addSystemLog(`Broadcasting active key (${currentKey}) to host...`, 'default');
            conn.send({
              type: 'SYNC',
              payload: { key: currentKey, moves: moveHistoryRef.current }
            });
          } else {
            addSystemLog('Joined channel. Awaiting Host Key synchronization...', 'default');
          }
        }
      });

      conn.on('data', (data) => {
        lastHeartbeatRef.current = Date.now();
        handleIncomingDataRef.current?.(data);
      });

      conn.on('close', () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        markDisconnected('Peer disconnected from session.');
      });

      conn.on('error', (err) => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        addSystemLog(`Connection Alert: ${err.message || err}`, 'default');
      });
    },
    [addSystemLog, handleIncomingData]
  );

  // Connect
  const handleConnect = () => {
    if (!targetId || !peerRef.current) return;
    const cleanId = targetId.trim();
    addSystemLog(`Connecting to peer: ${cleanId.slice(0, 8)}...`, 'default');

    const conn = peerRef.current.connect(cleanId, {
      reliable: true,
      serialization: 'json'
    });

    setupConnection(conn, false);

    // Timeout alert if connection takes longer than 12 seconds
    setTimeout(() => {
      if (conn && !conn.open && connStatus !== 'CONNECTED') {
        addSystemLog(
          'Connecting is taking longer than usual. Ensure the target Peer is online and has set their Key.',
          'default'
        );
      }
    }, 12000);
  };

  // Mount 3D Cube and PeerJS with Global STUN + TURN OpenRelay Configuration
  useEffect(() => {
    let simulator = null;
    const container = document.getElementById('chat-cube-viewport');
    if (container) {
      simulator = new CubeSimulator(container);
      cubeRef.current = simulator;
      simulator.camera.position.set(5.2, 4.3, 6.9);
      simulator.camera.lookAt(0, 0, 0);
      if (simulator.controls) {
        simulator.controls.update();
      }
      simulator.initCube(sharedKeyRef.current || 'DEFAULT');
      simulator.setSpeed(6.8);

      const engine = new CubeCipherEngine(simulator);
      const rcs = CubeCipherEngine.generateStepConstants(sharedKeyRef.current || 'DEFAULT', 1024);
      console.log('%c[CHAT_SYNC] Generated Key-Dependent RC Table:', 'color: #00ff88; font-weight: bold;', rcs);
      engine.setStepConstants(rcs);
      engineRef.current = engine;
    }

    const config = {
      debug: 1,
      secure: true,
      config: {
        iceServers: [
          // STUN Servers (Public IP discovery)
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          // Free OpenRelay TURN Servers (Relays around strict symmetric NATs & mobile cellular carriers)
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turns:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10
      }
    };

    try {
      const peer = new Peer(null, config);
      peerRef.current = peer;

      peer.on('open', (id) => {
        setMyId(id);
        addSystemLog('Ready. Share your ID or paste a Target ID to connect.', 'default');

        // Auto-connect if joining via 1-click invite link
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const autoTarget = params.get('connect') || params.get('target');
          if (autoTarget && autoTarget !== id) {
            addSystemLog(`Auto-connecting to invite Host: ${autoTarget.slice(0, 8)}...`, 'default');
            const conn = peer.connect(autoTarget, { reliable: true, serialization: 'json' });
            setupConnection(conn, false);
          }
        }
      });

      peer.on('connection', (conn) => {
        if (connRef.current) {
          connRef.current.close();
        }
        setupConnection(conn, true);
      });

      peer.on('disconnected', () => {
        addSystemLog('Peer server connection dropped. Reconnecting...', 'default');
        try {
          peer.reconnect();
        } catch (e) {
          // ignore
        }
      });

      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
          addSystemLog('Target Peer ID not found or peer is offline.', 'default');
        } else if (err.type === 'network' || err.type === 'disconnected') {
          addSystemLog('Network alert. Reconnecting to peer network...', 'default');
          try {
            peer.reconnect();
          } catch (e) {
            // ignore
          }
        } else {
          addSystemLog(`Peer status notice: ${err.type || err.message}`, 'default');
        }
      });
    } catch (e) {
      addSystemLog(`PeerJS Initialization Notice: ${e.message}`, 'default');
    }

    const handleUnload = () => {
      if (connRef.current && connRef.current.open) {
        try {
          connRef.current.send({ type: 'GOODBYE' });
          connRef.current.close();
        } catch (e) {}
      }
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (e) {}
      }
    };

    const handlePageHide = (e) => {
      // If page is merely backgrounded/cached in mobile back-forward cache, do NOT kill connection
      if (!e.persisted) {
        handleUnload();
      }
    };

    const handleVisibilityChange = () => {
      // When user returns from WhatsApp/other apps back to the chat tab, immediately refresh heartbeat
      if (document.visibilityState === 'visible' && connRef.current && connRef.current.open) {
        lastHeartbeatRef.current = Date.now();
        try {
          connRef.current.send({ type: 'PING' });
        } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      handleUnload();
      if (simulator) simulator.destroy();
    };
  }, []);

  // Send Message
  const handleSendMessage = () => {
    const raw = inputText.trim();
    if (!raw) return;

    if (!connRef.current || !connRef.current.open) {
      addSystemLog('Cannot send: Peer connection is not open.', 'default');
      return;
    }

    if (isChannelBusyRef.current) {
      addSystemLog('Channel is busy. Please wait for 3D lattice processing to finish.', 'default');
      return;
    }

    setInputText('');
    isChannelBusyRef.current = true;
    setIsChannelBusy(true);
    setChannelStatusText('TRANSMITTING ENCRYPTED STREAM...');

    const senderName = alias.trim() || 'AGENT';
    const msgId = Date.now() + Math.random();

    setMessages(prev => [
      ...prev,
      {
        id: msgId,
        type: 'sent',
        alias: senderName,
        plaintext: raw,
        ciphertext: ''
      }
    ]);

    connRef.current.send({ type: 'SIGNAL', payload: 'START_STREAM' });

    if (engineRef.current) {
      engineRef.current.encryptSequence(
        raw,
        'A',
        (char, idx, details) => {
          if (details.move) {
            moveHistoryRef.current.push(details.move);
          }
          setMessages(currentMsgs =>
            currentMsgs.map(m =>
              m.id === msgId
                ? {
                    ...m,
                    ciphertext: (m.ciphertext || '') + details.c
                  }
                : m
            )
          );
        },
        (fullCiphertext) => {
          console.log('%c[NETWORK OUTGOING] Payload: ' + fullCiphertext, 'color: #00ff88; font-weight: bold;');
          setChannelStatusText('WAITING FOR PEER 3D DECRYPTION...');
          connRef.current.send({
            type: 'MSG',
            alias: senderName,
            payload: fullCiphertext
          });
          // Auto unlock on timeout fallback if ack packet is lost
          setTimeout(() => {
            if (isChannelBusyRef.current) {
              isChannelBusyRef.current = false;
              setIsChannelBusy(false);
              setChannelStatusText('');
            }
          }, 15000);
        }
      );
    }
  };

  const copyMyId = async () => {
    if (!myId) return;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 900;
    if (navigator.share && isSmallScreen) {
      try {
        await navigator.share({
          title: 'Secure Chat ID — Cube Cryptography',
          text: `${myId}`
        });
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User closed share sheet
      }
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(myId);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = myId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const copyInviteLink = async () => {
    if (!myId) return;
    const currentKey = sharedKeyRef.current || 'DEFAULT';
    const inviteUrl = `${window.location.origin}${window.location.pathname}?connect=${myId}&key=${encodeURIComponent(currentKey)}`;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 900;

    if (navigator.share && isSmallScreen) {
      try {
        await navigator.share({
          title: 'Cube Cryptography — Secure Chat Session',
          text: `Connect to my encrypted 3D Cube Cryptography chat session! (Key: ${currentKey})`,
          url: inviteUrl
        });
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2500);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User closed share sheet
      }
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = inviteUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsLinkCopied(true);
      addSystemLog('1-Click Invite Link with Key copied to clipboard!', 'default');
      setTimeout(() => setIsLinkCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy invite link:', e);
    }
  };

  return (
    <Theme theme={neutralTheme} mode="dark">
      <div className="chat-layout-root">

        {/* 3D Cube Visualizer Card (Rendered at top on mobile, right panel on desktop) */}
        <div className="cube-visualizer-card">
          <div className="mobile-back-btn-wrap">
            <Button
              label="← BACK TO LAB"
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = 'lab.html')}
            />
          </div>
          <div id="chat-cube-viewport" className="cube-canvas-host"></div>
          <div className="cube-telemetry-pill">
            <span>DRAG TO ROTATE 3D LATTICE</span>
          </div>
        </div>

        {/* Primary Spacious Chat Interface */}
        <main className="chat-main-stage">

          {/* Top Header Bar */}
          <header className="chat-top-header">
            <div className="header-left">
              <div className="desktop-back-btn-wrap">
                <Button
                  label="← BACK TO LAB"
                  variant="secondary"
                  size="sm"
                  onClick={() => (window.location.href = 'lab.html')}
                />
              </div>
              <div className="channel-info">
                <h1 className="channel-title">SECURE CHAT SIM</h1>
                <div className="channel-status-badge">
                  <div className="desktop-status-dot">
                    <StatusDot
                      variant={connStatus === 'CONNECTED' ? 'success' : connStatus === 'COLLISION' ? 'critical' : 'neutral'}
                      label={connStatus}
                    />
                  </div>
                  <span className={`status-text ${connStatus === 'CONNECTED' ? 'connected' : connStatus === 'COLLISION' ? 'collision' : 'disconnected'}`}>
                    {connStatus === 'CONNECTED' ? 'P2P ENCRYPTED' : connStatus === 'COLLISION' ? 'CHANNEL COLLISION' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
            </div>

            <div className="header-right">
              {/* Desktop Header Controls */}
              <div className="desktop-header-controls">
                <div className="key-indicator" title="Active Shared Key">
                  <span className="key-tag">KEY:</span>
                  <code>{activeKey || 'DEFAULT'}</code>
                </div>
                <Button
                  label={isLinkCopied ? "✓ LINK COPIED" : "🔗 INVITE LINK"}
                  variant="secondary"
                  size="sm"
                  onClick={copyInviteLink}
                  isDisabled={!myId}
                />
              </div>

              {/* Mobile Hamburger Toggle Button */}
              <div className="mobile-menu-toggle">
                <IconButton
                  label={isMobileMenuOpen ? "Close configuration menu" : "Open configuration menu"}
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
            </div>
          </header>

          <Divider />

          {/* Collapsible Mobile Config Drawer */}
          <div className={`mobile-config-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-config-inner">
              {/* Row 1: Shared Key Setup */}
              <div className="input-group">
                <TextInput
                  label="Enter Key"
                  isLabelHidden
                  placeholder="ENTER KEY"
                  value={keyInput}
                  onChange={(val) => setKeyInput(val)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSetKey(keyInput, true);
                  }}
                  width="100%"
                />
                <Button
                  label="SET"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSetKey(keyInput, true)}
                />
              </div>

              {/* Row 2: Status Indicator */}
              <div className="mobile-status-row">
                <span className={`status-label ${connStatus === 'CONNECTED' ? 'connected' : connStatus === 'COLLISION' ? 'collision' : 'disconnected'}`}>
                  {connStatus === 'CONNECTED' ? 'CONNECTED' : connStatus === 'COLLISION' ? 'CHANNEL COLLISION' : 'DISCONNECTED'}
                </span>
              </div>

              {/* Row 3: My Peer ID Box */}
              <div
                className={`id-pill ${isCopied ? 'copied' : ''}`}
                onClick={copyMyId}
                title="Click to share or copy Peer ID"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copyMyId(); }}
              >
                <code>{myId || 'Generating ID...'}</code>
                <span className={`copy-badge ${isCopied ? 'active' : ''}`}>
                  {isCopied ? 'COPIED!' : 'SHARE'}
                </span>
              </div>

              {/* Row 3.5: Mobile Share Invite Link Button */}
              <div style={{ width: '100%' }}>
                <Button
                  label={isLinkCopied ? "✓ LINK SHARED / COPIED" : "🔗 SHARE 1-CLICK INVITE LINK"}
                  variant="secondary"
                  size="sm"
                  onClick={copyInviteLink}
                  isDisabled={!myId}
                />
              </div>

              {/* Row 4: My Display Name */}
              <TextInput
                label="Enter Your Name"
                isLabelHidden
                placeholder="Enter Your Name"
                value={alias}
                onChange={(val) => setAlias(val)}
                width="100%"
              />

              {/* Row 5: Connect Target Peer ID */}
              <div className="input-group">
                <TextInput
                  label="Peer ID to Connect..."
                  isLabelHidden
                  placeholder="Peer ID to Connect..."
                  value={targetId}
                  onChange={(val) => setTargetId(val)}
                  isDisabled={connStatus === 'CONNECTED'}
                  width="100%"
                />
                <Button
                  label="LINK"
                  variant="secondary"
                  size="sm"
                  onClick={handleConnect}
                  isDisabled={connStatus === 'CONNECTED' || !targetId.trim()}
                />
              </div>
            </div>
          </div>

          {/* Main Chat Message History Stream */}
          <div className="chat-history-scroll" ref={chatScrollRef}>
            <ChatMessageList density="balanced" align="bottom">
              {messages.map((m) => {
                if (m.type === 'system') {
                  return (
                    <ChatSystemMessage key={m.id} variant={m.variant || 'default'}>
                      {m.text}
                    </ChatSystemMessage>
                  );
                }

                const isUser = m.type === 'sent';
                const senderName = m.alias || (isUser ? 'ME' : 'PEER');
                return (
                  <ChatMessage
                    key={m.id}
                    sender={isUser ? 'user' : 'assistant'}
                    avatar={<Avatar name={senderName} size="sm" />}
                  >
                    <ChatMessageBubble
                      name={m.alias}
                      variant="filled"
                    >
                      <div className="bubble-content-text">
                        {m.plaintext || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Encrypting...</span>}
                      </div>
                      {m.ciphertext && (
                        <div className="msg-cipher">
                          <span className="cipher-label">CIPHER STREAM:</span>
                          <code>{m.ciphertext}</code>
                        </div>
                      )}
                    </ChatMessageBubble>
                  </ChatMessage>
                );
              })}
            </ChatMessageList>
          </div>

          <Divider />

          {/* Full-Width Bottom Composer */}
          <footer className="chat-composer-area">
            <div className={`composer-input-row ${isChannelBusy ? 'busy' : ''}`}>
              <TextInput
                label="Type encrypted message..."
                isLabelHidden
                placeholder={
                  channelStatusText
                    ? `[LOCKED] ${channelStatusText}`
                    : 'Type encrypted message...'
                }
                value={inputText}
                onChange={(val) => setInputText(val)}
                isDisabled={connStatus !== 'CONNECTED' || isChannelBusy}
                status={isChannelBusy ? { type: 'error' } : undefined}
                statusVariant="tooltip"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isChannelBusyRef.current && connStatus === 'CONNECTED') {
                      handleSendMessage();
                    }
                  }
                }}
                width="100%"
              />
              <ChatSendButton
                isDisabled={connStatus !== 'CONNECTED' || isChannelBusy || !inputText.trim()}
                isStopShown={isChannelBusy}
                onSend={handleSendMessage}
                size="md"
              />
            </div>
          </footer>
        </main>

        {/* Desktop Side Config Panel */}
        <aside className="crypto-side-panel">
          <div className="side-panel-header">
            <h2>3D CRYPTO ENGINE</h2>
            <span className="side-panel-badge">LIVE LATTICE</span>
          </div>

          <Divider />

          <div className="side-config-content">
            {/* Shared Key Setup */}
            <div className="config-section">
              <label className="config-label">SHARED ENCRYPTION KEY</label>
              <div className="input-group">
                <TextInput
                  label="Shared Key"
                  isLabelHidden
                  placeholder="Enter Shared Key..."
                  value={keyInput}
                  onChange={(val) => setKeyInput(val)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSetKey(keyInput, true);
                  }}
                  width="100%"
                />
                <Button
                  label="SET"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSetKey(keyInput, true)}
                />
              </div>
            </div>

            {/* My Peer ID */}
            <div className="config-section">
              <label className="config-label">MY PEER ID</label>
              <div
                className={`id-pill ${isCopied ? 'copied' : ''}`}
                onClick={copyMyId}
                title="Click to copy Peer ID"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copyMyId(); }}
              >
                <code>{myId || 'Generating ID...'}</code>
                <span className={`copy-badge ${isCopied ? 'active' : ''}`}>
                  {isCopied ? 'COPIED!' : 'COPY'}
                </span>
              </div>
            </div>

            {/* My Display Alias */}
            <div className="config-section">
              <label className="config-label">MY DISPLAY NAME</label>
              <TextInput
                label="Enter Your Name"
                isLabelHidden
                placeholder="Your Alias..."
                value={alias}
                onChange={(val) => setAlias(val)}
                width="100%"
              />
            </div>

            {/* Connect Target ID */}
            <div className="config-section">
              <label className="config-label">CONNECT TO PEER</label>
              <div className="input-group">
                <TextInput
                  label="Target Peer ID..."
                  isLabelHidden
                  placeholder="Paste Peer ID..."
                  value={targetId}
                  onChange={(val) => setTargetId(val)}
                  isDisabled={connStatus === 'CONNECTED'}
                  width="100%"
                />
                <Button
                  label="LINK"
                  variant="secondary"
                  size="sm"
                  onClick={handleConnect}
                  isDisabled={connStatus === 'CONNECTED' || !targetId.trim()}
                />
              </div>
            </div>
          </div>
        </aside>

      </div>
    </Theme>
  );
}
