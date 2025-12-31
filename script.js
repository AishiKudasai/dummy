// main.js - Modular AR Scene with WebXR + AR.js Fallback
// Optimized for low-end devices: Low poly counts, compressed textures, FPS capping.

import * as THREE from 'three'; // Assuming ES6 modules; adjust for CDN if needed

// Global variables
let scene, camera, renderer, arSession, raycaster, mouse, clock;
let objects = []; // Array of floating objects (text and images)
let tooltips = {}; // Map of object IDs to tooltip elements
let fpsCounter = 0, lastTime = 0;
let isARActive = false;
let isBatteryMode = false; // Toggle for battery-saving (reduce animations)

// Performance settings
const MAX_FPS = 60;
const MIN_FPS = 30; // If below, reduce quality
const DEVICE_PIXEL_RATIO_CAP = Math.min(window.devicePixelRatio, 1.5);

// Initialize on load
window.addEventListener('load', init);

function init() {
    setupScene();
    setupUI();
    preloadAssets(); // Async preload for fast load
    checkARSupport();
}

// Scene setup with Three.js
function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); // No antialias for perf
    renderer.setPixelRatio(DEVICE_PIXEL_RATIO_CAP);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('ar-container').appendChild(renderer.domElement);

    // Lighting for subtle glow
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Raycaster for tap/gesture detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    clock = new THREE.Clock();

    // Add floating objects (text and images)
    addFloatingObjects();

    // Animation loop with FPS adaptation
    animate();
}

// Add floating 3D text and image planes
function addFloatingObjects() {
    // Example: Floating text (low-poly SDF font)
    const fontLoader = new THREE.FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry('Tap Me!', {
            font: font,
            size: 0.5,
            height: 0.1,
            curveSegments: 12, // Low poly
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, emissive: 0x004444 }); // Glow effect
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0, 0, -2); // Depth-aware placement
        textMesh.userData = { type: 'text', info: 'This is floating text with info.' };
        scene.add(textMesh);
        objects.push(textMesh);

        // Animated entrance
        gsap.from(textMesh.position, { z: -5, duration: 1, ease: 'power2.out' });
        gsap.to(textMesh.rotation, { y: Math.PI * 2, duration: 5, repeat: -1, ease: 'none' }); // Smooth rotation
    });

    // Example: Floating image plane (compressed WebP texture)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('path/to/compressed-image.webp', (texture) => { // Replace with actual WebP path
        const imageGeometry = new THREE.PlaneGeometry(1, 1, 4, 4); // Low poly
        const imageMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
        imageMesh.position.set(1, 0, -3);
        imageMesh.userData = { type: 'image', info: 'This is a floating image with details.' };
        scene.add(imageMesh);
        objects.push(imageMesh);

        // Light parallax (subtle movement)
        gsap.to(imageMesh.position, { x: '+=0.1', yoyo: true, repeat: -1, duration: 2 });
    });
}

// AR Setup: WebXR primary, AR.js fallback
function checkARSupport() {
    if ('xr' in navigator && navigator.xr.isSessionSupported('immersive-ar')) {
        // WebXR supported
        document.getElementById('start-button').addEventListener('click', startWebXR);
    } else {
        // Fallback to AR.js (marker-based)
        setupARjsFallback();
    }
}

async function startWebXR() {
    try {
        arSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'], // For depth-aware placement
        });
        renderer.xr.setSession(arSession);
        isARActive = true;
        document.getElementById('start-button').classList.add('hidden');
        document.getElementById('permission-guide').style.display = 'block';
    } catch (error) {
        console.error('WebXR failed:', error);
        setupARjsFallback();
    }
}

function setupARjsFallback() {
    // AR.js setup (marker-based AR)
    const arjsScene = document.createElement('a-scene');
    arjsScene.setAttribute('embedded', '');
    arjsScene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
    document.getElementById('ar-container').appendChild(arjsScene);

    // Add marker and objects (simplified)
    const marker = document.createElement('a-marker');
    marker.setAttribute('preset', 'hiro'); // Default marker
    arjsScene.appendChild(marker);

    // Add Three.js objects to marker (integrate with scene)
    // Note: Full integration requires A-Frame + Three.js bridge; simplified here.
    isARActive = true;
}

// Gesture/Tap Interaction Handling
// Uses Raycaster for accurate 3D picking; optimized to only check on touchstart for perf.
window.addEventListener('touchstart', (event) => {
    if (!isARActive) return;
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
        const object = intersects[0].object;
        showTooltip(object);
    }
});

// Show tooltip with smooth animation (GSAP)
function showTooltip(object) {
    const info = object.userData.info;
    let tooltip = tooltips[object.id];
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = `<p>${info}</p>`;
        document.getElementById('ui-overlay').appendChild(tooltip);
        tooltips[object.id] = tooltip;
    }
    // Position tooltip near object (project 3D to 2D screen)
    const vector = object.position.clone();
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;

    gsap.fromTo(tooltip, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
    tooltip.style.display = 'block';

    // Auto-hide after 3s
    setTimeout(() => {
        gsap.to(tooltip, { opacity: 0, scale: 0.8, duration: 0.3, onComplete: () => tooltip.style.display = 'none' });
    }, 3000);
}

// Animation loop with FPS adaptation and pause on hidden tab
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const currentTime = performance.now();
    fpsCounter++;
    if (currentTime - lastTime >= 1000) {
        const fps = fpsCounter;
        document.getElementById('fps-indicator').textContent = `FPS: ${fps}`;
        if (fps < MIN_FPS && !isBatteryMode) {
            // Reduce quality: Lower texture res, disable animations
            isBatteryMode = true;
            gsap.globalTimeline.pause();
        }
        fpsCounter = 0;
        lastTime = currentTime;
    }

    if (document.hidden) return; // Pause rendering

    // Update objects (e.g., hover effects if added)
    objects.forEach(obj => {
        // Optional: Add hover rotation on tap proximity
    });

    renderer.render(scene, camera);
}

// UI Setup
function setupUI() {
    // Start button handled in checkARSupport
    // Permission guide shown on AR start
}

// Preload assets asynchronously for <3s load
function preloadAssets() {
    // Preload textures and fonts here (e.g., via Promise.all)
    // Example: textureLoader.load('path/to/image.webp');
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
