import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Slider } from '@astryxdesign/core/Slider';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { TopNav } from '@astryxdesign/core/TopNav';
import { CubeSimulator } from './cube.js';
import { CubeCipherEngine } from './cipher_engine.js';
import { neutralTheme } from './themes/neutral/neutralTheme';
import './lab.css';

const DEFAULT_DEMO_KEY = "CUBE_CIPHER_INIT";
const DEFAULT_DEMO_MESSAGE = "Geervan Welcomes you";
const MOVES_LIST = ['U', "U'", 'R', "R'", 'F', "F'"];

export function LabApp() {
  const cubeContainerRef = useRef(null);
  const cubeRef = useRef(null);
  const engineRef = useRef(null);

  // Mode: 'ENC' | 'DEC'
  const [mode, setMode] = useState('ENC');

  // Input States
  const [secretKey, setSecretKey] = useState('');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');

  // Execution States
  const [isStepMode, setIsStepMode] = useState(false);
  const [stepSpeed, setStepSpeed] = useState(5); // 1-10
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState('SENDER READY');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  // Live Telemetry
  const [stateHash, setStateHash] = useState('000000000000');

  // Active Operation Flow Readout
  const [currentOp, setCurrentOp] = useState({
    inputChar: '-',
    inputIdx: '-',
    sensorChar: '-',
    sensorIdx: '-',
    rcVal: '-',
    outChar: '-',
    outIdx: '-',
    formula: 'WAITING FOR STREAM...',
  });

  // Help Modal State
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Step Constants Reference
  const stepConstantsRef = useRef([]);
  const lastCipherCharRef = useRef('A');
  const processedIndexRef = useRef(0);
  const cleanDataRef = useRef('');

  // Character mapping helpers
  const toIndex = useCallback((c) => {
    if (c === ' ') return 52;
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return code - 65;
    if (code >= 97 && code <= 122) return code - 97 + 26;
    return 0;
  }, []);

  const fromIndex = useCallback((i) => {
    if (i === 52) return ' ';
    if (i <= 25) return String.fromCharCode(i + 65);
    return String.fromCharCode(i - 26 + 97);
  }, []);

  const getCharMove = useCallback((char) => {
    if (!char) return 'U';
    const code = char.charCodeAt(0);
    return MOVES_LIST[code % 6];
  }, []);

  // Initialize 3D Cube Canvas on mount
  useEffect(() => {
    if (!cubeContainerRef.current) return;

    const simulator = new CubeSimulator(cubeContainerRef.current);
    cubeRef.current = simulator;
    simulator.initCube(secretKey || "DEFAULT");
    simulator.setSpeed(stepSpeed);
    setStateHash(simulator.getStateHash());

    const engine = new CubeCipherEngine(secretKey || "DEFAULT");
    engineRef.current = engine;
    stepConstantsRef.current = CubeCipherEngine.generateStepConstants(secretKey || "DEFAULT", 1024);

    return () => {
      if (cubeRef.current) {
        cubeRef.current.destroy();
        cubeRef.current = null;
      }
    };
  }, []);

  // Sync Speed with Simulator
  useEffect(() => {
    if (cubeRef.current) {
      cubeRef.current.setSpeed(stepSpeed);
    }
  }, [stepSpeed]);

  // Key Initialization Action
  const handleInitKey = useCallback((keyToUse) => {
    const key = keyToUse !== undefined ? keyToUse : secretKey;
    if (!key) return;

    if (cubeRef.current) {
      cubeRef.current.initCube(key);
      setStateHash(cubeRef.current.getStateHash());
    }

    stepConstantsRef.current = CubeCipherEngine.generateStepConstants(key, 1024);
    lastCipherCharRef.current = 'A';
    setOutputText('');
    setActiveStepIndex(0);
    setTotalSteps(0);
    setIsProcessing(false);
    setSystemStatus(mode === 'ENC' ? 'SENDER READY' : 'RECEIVER READY');
    setCurrentOp({
      inputChar: '-',
      inputIdx: '-',
      sensorChar: '-',
      sensorIdx: '-',
      rcVal: '-',
      outChar: '-',
      outIdx: '-',
      formula: 'WAITING FOR STREAM...',
    });
  }, [secretKey, mode]);

  // Process a single step
  const executeSingleStep = useCallback(() => {
    const data = cleanDataRef.current;
    const idx = processedIndexRef.current;

    if (idx >= data.length || !cubeRef.current) {
      setIsProcessing(false);
      cubeRef.current?.setLocked(false);
      setSystemStatus(mode === 'ENC' ? 'SENDER READY' : 'RECEIVER READY');
      return;
    }

    const prevChar = lastCipherCharRef.current;
    const move = getCharMove(prevChar);

    const currentChar = data[idx];
    const rc = stepConstantsRef.current[idx % stepConstantsRef.current.length] || 0;

    cubeRef.current.onMoveComplete = () => {
      if (!cubeRef.current) return;
      const currentHash = cubeRef.current.getStateHash();
      setStateHash(currentHash);

      const sensor = cubeRef.current.getSensorValue();

      let outChar = '';
      let formulaStr = '';
      let inIdx = 0;
      let sIdx = toIndex(sensor);
      let outIdx = 0;

      if (mode === 'ENC') {
        inIdx = toIndex(currentChar);
        const cVal = (inIdx + sIdx + rc) % 53;
        outChar = fromIndex(cVal);
        outIdx = cVal;
        formulaStr = `(${inIdx} + ${sIdx} + ${rc}) % 53 = ${cVal}`;
        lastCipherCharRef.current = outChar;
      } else {
        inIdx = toIndex(currentChar);
        let pVal = (inIdx - sIdx - rc) % 53;
        while (pVal < 0) pVal += 53;
        outChar = fromIndex(pVal);
        outIdx = pVal;
        formulaStr = `(${inIdx} - ${sIdx} - ${rc}) % 53 = ${pVal}`;
        lastCipherCharRef.current = currentChar;
      }

      setOutputText(prev => prev + outChar);
      setCurrentOp({
        inputChar: currentChar,
        inputIdx: inIdx,
        sensorChar: sensor,
        sensorIdx: sIdx,
        rcVal: rc,
        outChar: outChar,
        outIdx: outIdx,
        formula: formulaStr,
      });

      const nextIdx = idx + 1;
      processedIndexRef.current = nextIdx;
      setActiveStepIndex(nextIdx);

      if (nextIdx >= data.length) {
        setIsProcessing(false);
        cubeRef.current.setLocked(false);
        setSystemStatus(mode === 'ENC' ? 'SENDER READY' : 'RECEIVER READY');
      } else if (!isStepMode) {
        executeSingleStep();
      }
    };

    cubeRef.current.queueMove(move);
  }, [getCharMove, mode, toIndex, fromIndex, isStepMode]);

  // Main Action: Run Execution
  const handleStartExecution = () => {
    const raw = inputText;
    const clean = raw.replace(/[^A-Za-z ]/g, '');
    if (!clean) return;

    const key = secretKey || "DEFAULT";
    if (cubeRef.current) {
      cubeRef.current.initCube(key);
      cubeRef.current.setLocked(true);
      setStateHash(cubeRef.current.getStateHash());
    }

    cleanDataRef.current = clean;
    processedIndexRef.current = 0;
    lastCipherCharRef.current = 'A';
    setOutputText('');
    setActiveStepIndex(0);
    setTotalSteps(clean.length);
    setIsProcessing(true);
    setSystemStatus(mode === 'ENC' ? 'SENDER READY' : 'RECEIVER READY');

    executeSingleStep();
  };

  // Step-by-Step Trigger
  const handleNextStep = () => {
    if (!isProcessing && processedIndexRef.current === 0) {
      handleStartExecution();
    } else if (isProcessing && processedIndexRef.current < cleanDataRef.current.length) {
      executeSingleStep();
    }
  };

  // Mode Switch
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setOutputText('');
    setActiveStepIndex(0);
    setTotalSteps(0);
    setIsProcessing(false);
    setSystemStatus(newMode === 'ENC' ? 'SENDER READY' : 'RECEIVER READY');
  };

  return (
    <Theme theme={neutralTheme} mode="dark">
      <div className="lab-app-container">

        {/* 1. HEADER (ASTRYX TOPNAV) */}
        <header className="lab-header">
          <TopNav
            label="Lab Header"
            heading={
              <div className="header-left">
                <h1 className="logo">
                  ENC.CUBE_SIM <span className="version">v1.2.0 CFB</span>
                </h1>
                <a href="https://www.linkedin.com/in/geervan/" target="_blank" rel="noopener noreferrer" className="credit-badge">
                  by GEERVAN
                </a>
              </div>
            }
            centerContent={
              <div className="mode-selector">
                <SegmentedControl
                  value={mode}
                  onChange={handleModeChange}
                  label="Cipher Mode"
                >
                  <SegmentedControlItem value="ENC" label="ENCRYPT" />
                  <SegmentedControlItem value="DEC" label="DECRYPT" />
                </SegmentedControl>
              </div>
            }
            endContent={
              <div className="header-right">
                <Button
                  label="? HELP"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowGuideModal(true)}
                />
                <Button
                  label="LORE"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = 'lore.html'}
                />
                <div className="status-indicator">
                  <StatusDot
                    variant="success"
                    label={systemStatus}
                  />
                  <span id="sys-status">{systemStatus}</span>
                </div>
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
                  onClick={() => window.location.href = 'chat.html'}
                />
              </div>
            }
          />
        </header>

        {/* 2. WORKSPACE */}
        <main className="lab-workspace">
          
          {/* LEFT PANEL */}
          <aside className="panel left-panel">
            <div className="panel-header">
              <h2>// PARAMETERS</h2>
              <div className="line-deco"></div>
            </div>

            <div className="control-group">
              <TextInput
                label="SHARED SECRET (KEY)"
                value={secretKey}
                onChange={(val) => setSecretKey(val)}
                placeholder="Enter seed phrase..."
                width="100%"
                isDisabled={isProcessing}
              />
              <div className="btn-row" style={{ marginTop: '8px' }}>
                <Button
                  label="INITIALIZE"
                  variant="secondary"
                  size="md"
                  onClick={() => handleInitKey()}
                  isDisabled={isProcessing}
                />
                <Button
                  label="DEMO"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setSecretKey(DEFAULT_DEMO_KEY);
                    setInputText(DEFAULT_DEMO_MESSAGE);
                    handleInitKey(DEFAULT_DEMO_KEY);
                  }}
                  isDisabled={isProcessing}
                />
              </div>
            </div>

            <div className="control-group">
              <TextArea
                label={mode === 'ENC' ? 'PLAINTEXT INPUT' : 'CIPHERTEXT INPUT'}
                rows={4}
                value={inputText}
                onChange={(val) => setInputText(val)}
                placeholder={mode === 'ENC' ? "Type message to encrypt..." : "Paste ciphertext here..."}
                isDisabled={isProcessing}
                width="100%"
              />
            </div>

            <div className="control-group">
              <div className="btn-row">
                <Button
                  label={mode === 'ENC' ? "ENCRYPT MESSAGE" : "DECRYPT MESSAGE"}
                  variant="primary"
                  size="lg"
                  className="primary-action-btn"
                  onClick={handleStartExecution}
                  isDisabled={isProcessing && !isStepMode}
                />
              </div>

              <div className="control-subgroup" style={{ marginTop: '12px' }}>
                <div className="step-controls-astryx" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <CheckboxInput
                    label="STEP-BY-STEP"
                    value={isStepMode}
                    onChange={(checked) => {
                      setIsStepMode(checked);
                      if (cubeRef.current) {
                        cubeRef.current.setAutoProcess(!checked);
                      }
                    }}
                  />
                  <Button
                    label="NEXT OP"
                    variant="secondary"
                    size="sm"
                    onClick={handleNextStep}
                    isDisabled={!isStepMode}
                  />
                </div>
              </div>

              {/* Astryx Slider Component for Step Speed */}
              <div className="control-subgroup speed-subgroup" style={{ marginTop: '14px' }}>
                <Slider
                  label={`STEP SPEED: ${stepSpeed}x`}
                  value={stepSpeed}
                  onChange={(val) => setStepSpeed(Number(val))}
                  min={1}
                  max={10}
                  step={1}
                  valueDisplay="none"
                />
              </div>
            </div>

          </aside>

          {/* CENTER VIEWPORT */}
          <section className="viewport" id="cube-container">
            <div className="viewport-canvas-host" id="lab-cube-canvas-container" ref={cubeContainerRef}></div>
            <div className="overlay-ui">
              <div className="reticle reticle-tl"></div>
              <div className="reticle reticle-tr"></div>
              <div className="reticle reticle-bl"></div>
              <div className="reticle reticle-br"></div>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <aside className="panel right-panel">
            {/* Output Stream placed before System Kernel & Hash */}
            <div className="control-group output-stream-group">
              <TextArea
                label="OUTPUT STREAM"
                rows={4}
                isReadOnly={true}
                value={outputText}
                onChange={() => {}}
                placeholder="Result will appear here..."
                width="100%"
              />
            </div>

            <div className="panel-header" style={{ marginTop: '12px' }}>
              <h2>// SYSTEM KERNEL</h2>
              <div className="line-deco"></div>
            </div>

            <div className="monitor-group">
              <label className="section-label">STATE HASH</label>
              <div id="state-hash" className="readout-display">{stateHash}</div>
            </div>

            <div className="process-monitor">
              {/* Step Indicator */}
              <div className="proc-step-header">
                <span className="step-label">ACTIVE OPERATION</span>
                <span id="step-count" className="step-value">
                  {totalSteps > 0 ? `STEP ${activeStepIndex} / ${totalSteps}` : 'IDLE'}
                </span>
              </div>

              {/* Visual Flow */}
              <div className="flow-container">
                <div className="flow-card">
                  <span className="flow-label">INPUT</span>
                  <div id="disp-input" className="flow-val">{currentOp.inputChar}</div>
                  <div id="disp-input-code" className="flow-sub">idx {currentOp.inputIdx}</div>
                </div>

                <div className="flow-op">{mode === 'ENC' ? '+' : '−'}</div>

                <div className="flow-card sensor">
                  <span className="flow-label">SENSOR KEY</span>
                  <div id="disp-sensor" className="flow-val">{currentOp.sensorChar}</div>
                  <div id="disp-sensor-code" className="flow-sub">idx {currentOp.sensorIdx}</div>
                </div>

                <div className="flow-op">{mode === 'ENC' ? '+' : '−'}</div>

                <div className="flow-card rc">
                  <span className="flow-label">STEP CONST</span>
                  <div id="disp-rc" className="flow-val">{currentOp.rcVal}</div>
                  <div id="disp-rc-code" className="flow-sub">idx {currentOp.rcVal}</div>
                </div>

                <div className="flow-op">=</div>

                <div className="flow-card output">
                  <span className="flow-label">OUTPUT</span>
                  <div id="disp-result" className="flow-val">{currentOp.outChar}</div>
                  <div id="disp-result-code" className="flow-sub">idx {currentOp.outIdx}</div>
                </div>
              </div>

              {/* Live Formula */}
              <div className="math-display">
                <span className="math-label">ALGORITHM</span>
                <div id="disp-math" className="math-val">{currentOp.formula}</div>
              </div>
            </div>
          </aside>

        </main>

        {/* 3. GUIDE MODAL VIA ASTRYX DIALOG */}
        <Dialog
          isOpen={showGuideModal}
          onOpenChange={setShowGuideModal}
          purpose="info"
          width="540px"
          padding={4}
        >
          <DialogHeader
            title="// RESEARCH_GUIDE: CUBE_CIPHER"
            onOpenChange={setShowGuideModal}
            hasDivider={true}
          />
          <div className="guide-body-astryx">
            <section>
              <h3>1. THE LATTICE (KEYING)</h3>
              <p>
                Every "Shared Secret" generates a unique 3D permutation of the cube. This is our <strong>Key Space</strong> (43 Quintillion states).
              </p>
            </section>
            <section>
              <h3>2. THE SENSOR (ENTROPY)</h3>
              <p>
                We read the value of the <strong>Front-Top-Right</strong> cubie. This single character is our <strong>Stream Key (K)</strong> for the current step.
              </p>
            </section>
            <section>
              <h3>3. DYNAMIC EVOLUTION (CFB)</h3>
              <p>
                This is a <strong>Cipher Feedback</strong> implementation. The ciphertext of the previous character determines the machine's next mechanical rotation, ensuring the same plaintext character encrypts differently every time.
              </p>
            </section>
            <section>
              <h3>4. QUICK START</h3>
              <p>
                Enter a key, type a message, and hit <strong>ENCRYPT</strong>. Use <strong>STEP-BY-STEP</strong> mode to watch the math happen in real-time on the right panel.
              </p>
            </section>
          </div>
          <div className="guide-footer-astryx">
            <Button
              label="LOAD TECH DEMO"
              variant="primary"
              size="md"
              onClick={() => {
                setSecretKey(DEFAULT_DEMO_KEY);
                setInputText(DEFAULT_DEMO_MESSAGE);
                handleInitKey(DEFAULT_DEMO_KEY);
                setShowGuideModal(false);
              }}
            />
          </div>
        </Dialog>

      </div>
    </Theme>
  );
}
