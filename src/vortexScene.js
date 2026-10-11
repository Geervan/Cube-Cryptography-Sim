import * as THREE from 'three';

/**
 * VortexCubeScene:
 * - High-speed neon keystream light streaks rushing from behind the cube
 * - Completely stationary, non-rotating graphite corridor (zero motion sickness)
 * - Prominently scaled, rock-solid central 3D Rubik's cube (no mouse wobble)
 * - Live cryptographic slice permutation engine
 */
export class VortexCubeScene {
  constructor(canvasContainer, options = {}) {
    this.container = typeof canvasContainer === 'string' 
      ? document.getElementById(canvasContainer) 
      : canvasContainer;

    this.options = options;
    this.showCube = options.showCube !== undefined ? Boolean(options.showCube) : true;
    this.disposed = false;
    this.cubies = [];

    // Movement & cipher state
    this.isAnimating = false;
    this.animationQueue = [];
    this.animationSpeed = 260; // ms per slice rotation
    this.onMoveComplete = null;
    this.moveHistory = [];
    this.seed = 'CUBE_CIPHER_INIT';

    this.init();
  }

  init() {
    const width = this.container ? this.container.clientWidth : window.innerWidth;
    const height = this.container ? this.container.clientHeight : window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030509, 0.024);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    this.camera.position.set(0, 0, 7.8);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.setClearColor(0x030509, 1);

    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    // 3. Lighting (Cobalt Blue + Warm Amber Core + Subtle Green Accent)
    this.setupLighting();

    // 4. Stationary Graphite Tunnel Wall Corridors (no spinning, stable depth)
    this.setupStationaryCorridor();

    // 5. High-Speed Neon Keystream Streaks (rushing from behind the cube forward)
    this.setupNeonKeystreaks();

    // 6. Vanishing Core Glow & Atmospheric Micro-Dust
    this.setupCoreGlowAndParticles();

    // 7. Prominent, Rock-Solid Central 3D Rubik's Cube (optional for creator/socials page)
    if (this.showCube) {
      this.setupCentralCube();
    }

    // 8. Event Listeners
    this.onResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // 9. Animation Loop
    this.clock = new THREE.Clock();
    this.animate = this.renderLoop.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Ambient - Deep obsidian navy
    const ambient = new THREE.AmbientLight(0x0b1120, 1.5);
    this.scene.add(ambient);

    // Core Vanishing Light (Warm Amber / Gold radiant glow)
    this.coreLight = new THREE.PointLight(0xffaa44, 4.8, 45, 1.2);
    this.coreLight.position.set(0, 0, -22);
    this.scene.add(this.coreLight);

    // Front-Left Rim Light (Cobalt Electric Blue)
    this.blueLight = new THREE.PointLight(0x38bdf8, 3.4, 35, 1.1);
    this.blueLight.position.set(-5.5, 3, 4);
    this.scene.add(this.blueLight);

    // Front-Right Secondary Light (Warm Amber Rim)
    this.amberLight = new THREE.PointLight(0xf59e0b, 2.6, 30, 1.2);
    this.amberLight.position.set(5.5, -2.5, 3.5);
    this.scene.add(this.amberLight);

    // Top Specular Key
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.3);
    dirLight.position.set(2, 6, 8);
    this.scene.add(dirLight);
  }

  setupStationaryCorridor() {
    // 480 stationary fragments with dull, muted matte colors (soft diffuse background that won't steal attention)
    const count = 480;
    const geometry = new THREE.BoxGeometry(0.72, 0.72, 0.72);
    
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.70, // Matte, soft diffuse finish (prevents sharp glare and distracting reflections)
      metalness: 0.18, // Low metalness so fragments stay muted and subdued
      envMapIntensity: 0.3,
    });

    this.corridorMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const zProgress = i / count;
      const z = 7 - zProgress * 42; // from z = +7 down to z = -35

      const baseRadius = 2.8 + (1 - zProgress) * 7.2;
      const radiusNoise = (Math.sin(i * 12.3) * 0.5) * 1.4;
      const radius = Math.max(2.2, baseRadius + radiusNoise);

      // Stable static spiral placement
      const turns = 7.5;
      const angle = (zProgress * Math.PI * 2 * turns) + (i * 0.12);

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const scale = 0.48 + (1 - zProgress) * 0.6 + (Math.sin(i * 2.5) * 0.1);
      dummy.scale.set(scale, scale, scale);
      dummy.position.set(x, y, z);

      // Angled toward tunnel center
      dummy.rotation.set(
        Math.sin(i * 1.7) * 0.4,
        Math.cos(i * 2.3) * 0.4,
        Math.sin(i * 3.1) * 0.4
      );

      dummy.updateMatrix();
      this.corridorMesh.setMatrixAt(i, dummy.matrix);

      // Curated dull, desaturated palette: dark matte hues that recede quietly into the background
      const rand = Math.sin(i * 77.3) * 10000;
      const frac = rand - Math.floor(rand);
      if (frac < 0.22) {
        color.set(0x19222c); // Dull muted deep slate-blue
      } else if (frac < 0.40) {
        color.set(0x231d17); // Dull dark dusty umber
      } else if (frac < 0.58) {
        color.set(0x18231d); // Dull dark desaturated sage
      } else if (frac < 0.74) {
        color.set(0x211b24); // Dull muted dark plum-slate
      } else {
        color.set(0x181d24); // Dull neutral charcoal
      }
      this.corridorMesh.setColorAt(i, color);
    }

    this.corridorMesh.instanceMatrix.needsUpdate = true;
    if (this.corridorMesh.instanceColor) {
      this.corridorMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.corridorMesh);
  }

  setupNeonKeystreaks() {
    // 45 subtle, elegant neon keystream filaments (streamlined for clarity and readability)
    this.streakCount = 45;
    const geometry = new THREE.BoxGeometry(0.012, 0.012, 1); // ultra-thin laser filament
    
    // Curated subtle palette
    const colors = [
      0x38bdf8, // Electric Cyan
      0x60a5fa, // Cobalt Blue
      0xf59e0b, // Warm Amber
      0xffffff, // Soft White
      0x10b981  // Neon Green
    ];

    this.streakData = [];
    this.streakMeshes = [];

    const batchSize = Math.floor(this.streakCount / colors.length);

    colors.forEach((col) => {
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const instMesh = new THREE.InstancedMesh(geometry, mat, batchSize);
      instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(instMesh);
      this.streakMeshes.push({ mesh: instMesh, size: batchSize });
    });

    for (let b = 0; b < this.streakMeshes.length; b++) {
      for (let i = 0; i < batchSize; i++) {
        // Spawn deep in the background behind the cube (z from -28 to -6)
        const z = -28 + Math.random() * 22;
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.6 + Math.random() * 5.5;
        const speed = 6 + Math.random() * 8; // gentle, majestic glide
        const length = 2.0 + Math.random() * 3.5;

        this.streakData.push({
          batch: b,
          index: i,
          angle: angle,
          baseRadius: radius,
          z: z,
          speed: speed,
          length: length
        });
      }
    }
  }

  setupCoreGlowAndParticles() {
    // 1. Radiant Vanishing Point Core Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 245, 200, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 170, 68, 0.65)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
    grad.addColorStop(1, 'rgba(3, 5, 9, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const glowTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
      depthWrite: false
    });
    this.glowSprite = new THREE.Sprite(spriteMat);
    this.glowSprite.position.set(0, 0, -22);
    this.glowSprite.scale.set(16, 16, 1);
    this.scene.add(this.glowSprite);

    // 2. Atmospheric Micro-Dust
    const pCount = 180;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 7;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = 5 - Math.random() * 30;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xc8e0ff,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particles);
  }

  updateResponsiveLayout() {
    const width = this.container ? this.container.clientWidth : window.innerWidth;
    const height = this.container ? this.container.clientHeight : window.innerHeight;
    const aspect = width / height;

    if (aspect < 0.65 || width < 520) {
      // Mobile portrait: position cube a little lower (y = 0.58) so it's not jammed against the top header
      this.targetScale = 0.48;
      this.targetX = 0.0;
      this.targetY = 0.58;
      this.targetZ = -0.15;
    } else if (aspect < 0.95 || width < 820) {
      // Tablet / Phablet: moderate scale 0.60
      this.targetScale = 0.60;
      this.targetX = 0.05;
      this.targetY = 0.42;
      this.targetZ = -0.25;
    } else {
      // Desktop: canonical prominent position on right side
      this.targetScale = 0.78;
      this.targetX = 0.12;
      this.targetY = 0.08;
      this.targetZ = -0.4;
    }

    if (this.camera) {
      this.camera.aspect = aspect;
      this.camera.fov = aspect < 0.75 ? 44 : 40;
      this.camera.updateProjectionMatrix();
    }

    if (this.glowSprite) {
      this.glowSprite.position.y = this.targetY * 0.8;
    }
    if (this.coreLight) {
      this.coreLight.position.y = this.targetY * 0.8;
    }
  }

  setupCentralCube() {
    this.cubeGroup = new THREE.Group();
    this.updateResponsiveLayout();
    this.cubeGroup.position.set(this.targetX, this.targetY, this.targetZ);
    this.cubeGroup.scale.set(this.targetScale, this.targetScale, this.targetScale);
    this.scene.add(this.cubeGroup);

    this.cubies = [];
    this.initCube(this.seed);
  }

  initCube(seedKey = 'CUBE_CIPHER_INIT') {
    this.seed = seedKey;
    this.animationQueue = [];
    this.isAnimating = false;

    // Clear existing children
    while (this.cubeGroup.children.length > 0) {
      this.cubeGroup.remove(this.cubeGroup.children[0]);
    }
    this.cubies = [];

    const charSet = this.generateCharSet(seedKey);
    let faceCounter = 0;

    const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const materials = [
            this.createFaceMaterial(x === 1 ? charSet[faceCounter++] : null, 'R'), // Right (+x)
            this.createFaceMaterial(x === -1 ? charSet[faceCounter++] : null, 'L'), // Left (-x)
            this.createFaceMaterial(y === 1 ? charSet[faceCounter++] : null, 'U'), // Top (+y)
            this.createFaceMaterial(y === -1 ? charSet[faceCounter++] : null, 'D'), // Bottom (-y)
            this.createFaceMaterial(z === 1 ? charSet[faceCounter++] : null, 'F'), // Front (+z)
            this.createFaceMaterial(z === -1 ? charSet[faceCounter++] : null, 'B'), // Back (-z)
          ];

          const cubie = new THREE.Mesh(geometry, materials);
          cubie.position.set(x, y, z);
          cubie.userData = { x, y, z };
          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }

    // Precise, dignified isometric angle (fixed and rock-solid)
    this.cubeGroup.rotation.set(0.38, 0.62, -0.15);
  }

  generateCharSet(seed) {
    let seedNum = 0;
    for (let i = 0; i < seed.length; i++) seedNum += seed.charCodeAt(i);

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz A";
    let pool = chars.split('');

    const random = () => {
      const x = Math.sin(seedNum++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let result = [];
    for (let i = 0; i < 54; i++) {
      result.push(pool[i % pool.length]);
    }
    return result;
  }

  createFaceMaterial(char, faceType) {
    if (!char) {
      return new THREE.MeshStandardMaterial({
        color: 0x0f131a,
        roughness: 0.35,
        metalness: 0.85
      });
    }

    const colorMap = {
      'R': '#0ea5e9', // Electric Cyan
      'L': '#f43f5e', // Vivid Crimson
      'U': '#f8fafc', // Platinum White
      'D': '#f59e0b', // Warm Amber
      'F': '#10b981', // Emerald Green
      'B': '#3b82f6'  // Cobalt Blue
    };

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark glossy border
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 128, 128);

    // Rounded inset sticker
    const radius = 14;
    const pad = 8;
    const w = 128 - pad * 2;
    const h = 128 - pad * 2;

    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, radius);
    ctx.fillStyle = colorMap[faceType] || '#38bdf8';
    ctx.fill();

    // Gloss overlay
    const gloss = ctx.createLinearGradient(pad, pad, pad + w, pad + h);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
    gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
    gloss.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, radius);
    ctx.fill();

    // Typography label
    ctx.fillStyle = faceType === 'U' ? '#0f172a' : '#ffffff';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char === ' ' ? '␣' : char, 64, 66);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.22,
      metalness: 0.45,
      color: 0xffffff
    });
    mat.userData = { char, faceType };
    return mat;
  }

  // --- Mechanical Slice Rotation ---
  queueMove(move) {
    this.animationQueue.push(move);
    if (!this.isAnimating) {
      this.processQueue();
    }
  }

  processQueue() {
    if (this.animationQueue.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    const move = this.animationQueue.shift();
    this.executeMove(move, () => {
      this.moveHistory.push(move);
      if (this.onMoveComplete) {
        this.onMoveComplete(move);
      }
      this.processQueue();
    });
  }

  executeMove(move, callback) {
    const isPrime = move.includes("'");
    const face = move[0];

    let axis = new THREE.Vector3(0, 1, 0);
    let targetCoord = 1;
    let targetAxisName = 'y';
    let angle = isPrime ? Math.PI / 2 : -Math.PI / 2;

    switch (face) {
      case 'U':
        axis.set(0, 1, 0);
        targetAxisName = 'y';
        targetCoord = 1;
        angle = isPrime ? Math.PI / 2 : -Math.PI / 2;
        break;
      case 'D':
        axis.set(0, 1, 0);
        targetAxisName = 'y';
        targetCoord = -1;
        angle = isPrime ? -Math.PI / 2 : Math.PI / 2;
        break;
      case 'R':
        axis.set(1, 0, 0);
        targetAxisName = 'x';
        targetCoord = 1;
        angle = isPrime ? Math.PI / 2 : -Math.PI / 2;
        break;
      case 'L':
        axis.set(1, 0, 0);
        targetAxisName = 'x';
        targetCoord = -1;
        angle = isPrime ? -Math.PI / 2 : Math.PI / 2;
        break;
      case 'F':
        axis.set(0, 0, 1);
        targetAxisName = 'z';
        targetCoord = 1;
        angle = isPrime ? Math.PI / 2 : -Math.PI / 2;
        break;
      case 'B':
        axis.set(0, 0, 1);
        targetAxisName = 'z';
        targetCoord = -1;
        angle = isPrime ? -Math.PI / 2 : Math.PI / 2;
        break;
    }

    const eps = 0.15;
    const sliceCubies = this.cubies.filter(c => Math.abs(c.position[targetAxisName] - targetCoord) < eps);

    const pivot = new THREE.Group();
    this.cubeGroup.add(pivot);

    sliceCubies.forEach(c => {
      pivot.attach(c);
    });

    const startTime = performance.now();
    const duration = this.animationSpeed;

    const animateRotation = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      pivot.rotation[targetAxisName] = angle * eased;

      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      } else {
        pivot.rotation[targetAxisName] = angle;
        pivot.updateMatrixWorld();

        sliceCubies.forEach(c => {
          this.cubeGroup.attach(c);
          c.position.x = Math.round(c.position.x);
          c.position.y = Math.round(c.position.y);
          c.position.z = Math.round(c.position.z);
        });

        this.cubeGroup.remove(pivot);
        if (callback) callback();
      }
    };

    requestAnimationFrame(animateRotation);
  }

  // --- Sensor Extraction at Coordinate (1, 1, 1) ---
  getSensorValue() {
    const eps = 0.15;
    const cubie = this.cubies.find(c =>
      Math.abs(c.position.x - 1) < eps &&
      Math.abs(c.position.y - 1) < eps &&
      Math.abs(c.position.z - 1) < eps
    );

    if (!cubie) return 'A';

    const normals = [
      new THREE.Vector3(1, 0, 0),  // R
      new THREE.Vector3(-1, 0, 0), // L
      new THREE.Vector3(0, 1, 0),  // U
      new THREE.Vector3(0, -1, 0), // D
      new THREE.Vector3(0, 0, 1),  // F
      new THREE.Vector3(0, 0, -1)  // B
    ];

    let bestDot = -1.0;
    let bestIndex = 2; // Default U

    normals.forEach((n, i) => {
      const worldN = n.clone().applyQuaternion(cubie.quaternion);
      const dot = worldN.dot(new THREE.Vector3(0, 1, 0));
      if (dot > bestDot) {
        bestDot = dot;
        bestIndex = i;
      }
    });

    const mat = cubie.material[bestIndex];
    if (mat && mat.userData && mat.userData.char) {
      return mat.userData.char;
    }
    return 'A';
  }

  getStateHash() {
    let hash = 0;
    this.cubies.forEach((c, idx) => {
      hash = ((hash << 5) - hash) + (c.position.x * 7 + c.position.y * 13 + c.position.z * 19 + idx);
      hash |= 0;
    });
    return Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
  }

  // --- Interaction & Event Handlers ---
  handleResize() {
    if (!this.container || this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.updateResponsiveLayout();
    this.renderer.setSize(width, height);
  }

  // --- Main Render Loop ---
  renderLoop() {
    if (this.disposed) return;

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. High-Speed Neon Keystream Streaks (rushing forward toward viewer)
    const dummy = new THREE.Object3D();

    for (let s = 0; s < this.streakData.length; s++) {
      const streak = this.streakData[s];
      streak.z += streak.speed * delta;

      // Wrap when reaching behind the cube (z > -1.2), never crossing in front of typography
      if (streak.z > -1.2) {
        streak.z = -28 - Math.random() * 6;
        streak.angle = Math.random() * Math.PI * 2;
        streak.baseRadius = 1.6 + Math.random() * 5.5;
        streak.speed = 6 + Math.random() * 8;
      }

      // Gentle perspective flare outward as streaks approach from depths
      const zFactor = Math.max(0.1, (streak.z + 30) / 32);
      const r = streak.baseRadius * (0.85 + zFactor * 0.35);

      const x = Math.cos(streak.angle) * r;
      const y = Math.sin(streak.angle) * r;

      dummy.position.set(x, y, streak.z);
      dummy.scale.set(1, 1, streak.length);
      dummy.rotation.set(0, 0, streak.angle); // align radially
      dummy.updateMatrix();

      const batchObj = this.streakMeshes[streak.batch];
      if (batchObj) {
        batchObj.mesh.setMatrixAt(streak.index, dummy.matrix);
      }
    }

    // Flag instanced matrix updates
    for (let b = 0; b < this.streakMeshes.length; b++) {
      this.streakMeshes[b].mesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Central Cube: Completely stationary and rock-solid (zero bobbing, zero floating)
    if (this.cubeGroup && !this.isAnimating) {
      this.cubeGroup.position.set(
        this.targetX !== undefined ? this.targetX : 0.12,
        this.targetY !== undefined ? this.targetY : 0.08,
        this.targetZ !== undefined ? this.targetZ : -0.4
      );
      if (this.targetScale !== undefined) {
        this.cubeGroup.scale.set(this.targetScale, this.targetScale, this.targetScale);
      }
      // Fixed, stable isometric tilt
      this.cubeGroup.rotation.set(0.38, 0.62, -0.15);
    }

    // 3. Stardust particles drifting forward
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += delta * 2.5;
        if (positions[i + 2] > 7.5) {
          positions[i + 2] = -30;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Vanishing point core glow pulse
    if (this.glowSprite) {
      const pulse = 16.0 + Math.sin(time * 2.4) * 1.2;
      this.glowSprite.scale.set(pulse, pulse, 1);
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
