import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CubeSimulator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();

        // Lab lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        this.scene.add(directionalLight);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(6, 5, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Dark background matching CSS
        this.renderer.setClearColor(0x121214);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;

        // Cube State
        this.cubies = [];
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.initCube();

        // Animation State
        this.isAnimating = false;
        this.animationQueue = [];
        this.animationSpeed = 300; // ms
        this.autoProcess = true; // Default auto-run

        // Callback
        this.onMoveComplete = null;

        // Handling Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.animate();
    }

    setLocked(locked) {
        // Disable orbit controls
        this.controls.enabled = !locked;

        // Smoothly rotate camera to sensor view when locked
        if (locked) {
            this.animateCameraToSensorView();
        }
    }

    animateCameraToSensorView() {
        // Target: Focus on Front-Top-Right corner (1, 1, 1) where sensor reads
        const targetPosition = new THREE.Vector3(5, 4, 6);
        const startPosition = this.camera.position.clone();
        const duration = 800; // ms
        const startTime = Date.now();

        const animateCamera = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            this.camera.lookAt(0, 0, 0);

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        };

        animateCamera();
    }

    initCube(seedKey = "DEFAULT") {
        // Clear existing
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.cubies = [];

        // Generate Character Map from Seed
        // We need 54 characters. 
        // We will expand the seed to fill 54 spots or just cycle "A-Z0-9" scrambled by seed.
        const charSet = this.generateCharSet(seedKey); // Returns 54 chars

        // Geometry
        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);

        // Helper to get material for a specific face index (0-53) and side
        let faceIndexCounter = 0;

        // We iterate x, y, z.
        // However, we need to map logical faces to our charSet.
        // A cubie has 6 faces.
        // Order: Right, Left, Top, Bottom, Front, Back

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const materials = [];
                    // Right (+x)
                    materials.push(this.createFaceMaterial(x === 1 ? charSet[faceIndexCounter++] : null, 'R'));
                    // Left (-x)
                    materials.push(this.createFaceMaterial(x === -1 ? charSet[faceIndexCounter++] : null, 'L'));
                    // Top (+y)
                    materials.push(this.createFaceMaterial(y === 1 ? charSet[faceIndexCounter++] : null, 'U'));
                    // Bottom (-y)
                    materials.push(this.createFaceMaterial(y === -1 ? charSet[faceIndexCounter++] : null, 'D'));
                    // Front (+z)
                    materials.push(this.createFaceMaterial(z === 1 ? charSet[faceIndexCounter++] : null, 'F'));
                    // Back (-z)
                    materials.push(this.createFaceMaterial(z === -1 ? charSet[faceIndexCounter++] : null, 'B'));

                    const cubie = new THREE.Mesh(geometry, materials);
                    cubie.position.set(x, y, z);
                    // Store initial logic coordinates
                    cubie.userData = { x, y, z };
                    this.group.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
    }

    generateCharSet(seed) {
        // Simple PRNG based on seed
        let seedNum = 0;
        for (let i = 0; i < seed.length; i++) seedNum += seed.charCodeAt(i);

        // Pool: A-Z (26) + a-z (26) + space (1) = 53. 
        // Cube has 54 stickers. We need 1 filler. Let's reuse A.
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz A"; // 54 chars
        let pool = chars.split('');

        // Shuffle pool deterministically based on seed
        const random = () => {
            const x = Math.sin(seedNum++) * 10000;
            return x - Math.floor(x);
        };

        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Fill 54 spots
        let result = [];
        for (let i = 0; i < 54; i++) {
            result.push(pool[i]);
        }
        return result;
    }

    createFaceMaterial(char, faceType) {
        if (!char) {
            return new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.8
            });
        }

        const colorMap = {
            'R': '#ff2222', // Bright Red
            'L': '#ff6600', // Neon Orange
            'U': '#ffffff', // Pure White
            'D': '#ffdd00', // Vibrant Yellow
            'F': '#00dd55', // Bright Green
            'B': '#1155ff'  // Bright Blue
        };

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background (Standard Color)
        ctx.fillStyle = colorMap[faceType] || '#222';
        ctx.fillRect(0, 0, 128, 128);

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 128, 128);

        // Text (Dark text for bright backgrounds, White for dark)
        ctx.fillStyle = (faceType === 'U' || faceType === 'D' || faceType === 'L') ? '#121214' : '#e0e0e0';
        ctx.font = 'bold 80px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 64, 64);

        // Orientation marker (small dot)
        // ctx.fillStyle = '#666';
        // ctx.font = '20px serif';
        // ctx.fillText(faceType, 10, 20); // Debug: show face type

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.4,
            metalness: 0.1
        });
        mat.userData = { char: char };
        return mat;
    }

    // Read the value at a specific physical location: e.g. Top-Front-Center (0, 1, 1) if we assume 3x3x3 grid centered at 0
    // Actually Front Face is Z=1. Top is Y=1.
    // So target coordinate is (0, 1, 1). BUT wait, (0,1,1) is an edge piece.
    // The user said "Left Corner"? 
    // Let's use Top-Front-Left Corner: (-1, 1, 1).
    // And we need to read the "Front" face of that corner? Or the "Top" face?
    // Let's pick the TOP face of the FRONT-LEFT-TOP corner.
    // Target Cubie Position ~ (-1, 1, 1).
    // Target Face Normal ~ (0, 1, 0) (Points UP).
    getSensorValue() {
        // Find cubie physically at (1, 1, 1) - Front-Top-Right (Hero Corner)
        const eps = 0.1;
        const targetX = 1, targetY = 1, targetZ = 1;

        const cubie = this.cubies.find(c =>
            Math.abs(c.position.x - targetX) < eps &&
            Math.abs(c.position.y - targetY) < eps &&
            Math.abs(c.position.z - targetZ) < eps
        );

        if (!cubie) return "?";

        // Now we need to know which face is pointing UP (Y+).
        // We can check the rotation of the cubie.
        // A generic way is to raycast or math.
        // Math way: Rotate the vector (0, 1, 0) by inverse of cubie rotation? 
        // No, we want to know which LOCAL axis matches World (0, 1, 0).

        // Local Face Normals mapped to Material Index in initCube:
        // initCube order: Right(+x), Left(-x), Top(+y), Bottom(-y), Front(+z), Back(-z)
        // Indices: 0, 1, 2, 3, 4, 5

        const normals = [
            new THREE.Vector3(1, 0, 0),  // 0: Right
            new THREE.Vector3(-1, 0, 0), // 1: Left
            new THREE.Vector3(0, 1, 0),  // 2: Top
            new THREE.Vector3(0, -1, 0), // 3: Bottom
            new THREE.Vector3(0, 0, 1),  // 4: Front
            new THREE.Vector3(0, 0, -1)  // 5: Back
        ];

        let bestDot = -1.0;
        let bestIndex = -1;

        // We need to find which LOCAL normal is effectively WORLD UP (0, 1, 0)
        // WorldNormal = CubieQuaternion * LocalNormal
        // maximize (WorldNormal . (0,1,0))

        normals.forEach((n, i) => {
            const worldN = n.clone().applyQuaternion(cubie.quaternion);
            const dot = worldN.dot(new THREE.Vector3(0, 1, 0));
            if (dot > bestDot) {
                bestDot = dot;
                bestIndex = i;
            }
        });

        // Ensure accurate rounding to find the strictly TOP face
        if (bestDot < 0.9) {
            return "?";
        }

        // This index corresponds to the material array index we set in initCube
        const mat = cubie.material[bestIndex];

        // Highlighting Logic:
        // We want to visually indicate which cubie was read.
        // We can flash it?
        if (mat) {
            const originalHex = mat.emissive ? mat.emissive.getHex() : 0x000000;
            if (mat.emissive) mat.emissive.setHex(0xffffff); // Flash white
            setTimeout(() => {
                if (mat.emissive) mat.emissive.setHex(originalHex);
            }, 600);
        }

        if (mat && mat.map && mat.map.image) {
            // We need to extract the char. We didn't save it directly on material.
            // Let's hack: we can store the char on the material userData.
            return mat.userData.char;
        }
        return "?";
    }

    reset() {
        this.initCube();
    }

    queueMove(move) {
        this.animationQueue.push(move);
        if (this.autoProcess && !this.isAnimating) {
            this.processQueue();
        }
    }

    step() {
        if (!this.isAnimating && this.animationQueue.length > 0) {
            this.processQueue();
        }
    }

    setAutoProcess(val) {
        this.autoProcess = val;
        // If turning on and idle, start processing
        if (val && !this.isAnimating) {
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
        this.animateMove(move, () => {
            // Notify callback
            if (this.onMoveComplete) this.onMoveComplete(move);

            if (this.autoProcess) {
                this.processQueue();
            } else {
                this.isAnimating = false;
            }
        });
    }

    animateMove(moveStr, callback) {
        // Parse move: e.g., "U", "U'", "R", "R'"
        let axis = '';
        let layerVal = 0;
        let angle = -Math.PI / 2;

        const face = moveStr[0];
        const isPrime = moveStr.includes("'");
        // if (isPrime) angle = Math.PI / 2; // handled below

        // Logic to determine which cubies to rotate
        switch (face) {
            case 'U': axis = 'y'; layerVal = 1; break;
            case 'D': axis = 'y'; layerVal = -1; break;
            case 'L': axis = 'x'; layerVal = -1; break;
            case 'R': axis = 'x'; layerVal = 1; break;
            case 'F': axis = 'z'; layerVal = 1; break;
            case 'B': axis = 'z'; layerVal = -1; break;
        }

        // Standard Notation Directions
        if (face === 'U') angle = isPrime ? Math.PI / 2 : -Math.PI / 2;
        if (face === 'D') angle = isPrime ? -Math.PI / 2 : Math.PI / 2;
        if (face === 'R') angle = isPrime ? Math.PI / 2 : -Math.PI / 2;
        if (face === 'L') angle = isPrime ? -Math.PI / 2 : Math.PI / 2;
        if (face === 'F') angle = isPrime ? Math.PI / 2 : -Math.PI / 2;
        if (face === 'B') angle = isPrime ? -Math.PI / 2 : Math.PI / 2;

        // Find cubies in the layer
        const eps = 0.1;
        const activeCubies = this.cubies.filter(c => Math.abs(c.position[axis] - layerVal) < eps);

        // Create a pivot object
        const pivot = new THREE.Object3D();
        pivot.rotation.set(0, 0, 0);
        this.group.add(pivot);

        activeCubies.forEach(c => {
            this.group.remove(c);
            pivot.add(c);
        });

        // Animate
        const startTime = Date.now();
        const duration = this.animationSpeed;

        const tick = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            // Linear mechanical feel? Or eased?
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic out

            pivot.rotation[axis] = angle * eased;

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                // Finish
                pivot.updateMatrixWorld();
                activeCubies.forEach(c => {
                    c.updateMatrixWorld();
                    pivot.remove(c);
                    c.applyMatrix4(pivot.matrixWorld); // Apply transform
                    // Snap positions
                    c.position.x = Math.round(c.position.x);
                    c.position.y = Math.round(c.position.y);
                    c.position.z = Math.round(c.position.z);

                    // Snap rotations (round quaternion components? No, just keep as is)
                    // We rely on visual only for this simulation, 
                    // logical tracking of "what color is where" is harder if we rely on meshes.
                    // But for this simulation, we probably don't need to know the colors programmatically
                    // UNLESS we want to generate a hash of the state.

                    this.group.add(c);
                });
                this.group.remove(pivot);
                callback();
            }
        };
        tick();
    }

    setSpeed(val) {
        // val 1-10. 1 = slow (1000ms), 10 = fast (50ms)
        const min = 1000;
        const max = 50;
        // val 1 -> min
        // val 10 -> max
        this.animationSpeed = min - ((val - 1) * (min - max) / 9);
    }

    // Helper to get a simple state hash based on positions/rotations
    getStateHash() {
        // Simple hash of all cubie positions and rotations
        let hash = 0;
        this.cubies.forEach(c => {
            hash += c.position.x * 1000 + c.position.y * 100 + c.position.z;
            hash += c.rotation.x + c.rotation.y + c.rotation.z;
        });
        // Returns a hex string
        return Math.floor(Math.abs(hash * 10000)).toString(16).toUpperCase().padStart(12, '0');
    }

    onWindowResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
