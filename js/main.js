import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Import modules
import { SceneManager } from './SceneManager.js';
import { StarSystem } from './StarSystem.js';
import { VolumetricNebula } from './VolumetricNebula.js';
import { CameraController } from './CameraController.js';
import { JourneyManager } from './JourneyManager.js';

class GalacticJourney {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.clock = new THREE.Clock();
        
        this.modules = {
            sceneManager: null,
            starSystem: null,
            nebula: null,
            cameraController: null,
            journeyManager: null
        };
        
        this.isPlaying = false;
        this.init();
    }

    async init() {
        // Setup basic Three.js scene
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupPostProcessing();
        
        // Initialize modules
        await this.initializeModules();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 2000);
        
        // Start animation loop
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0000001);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100000
        );
        this.camera.position.set(0, 0, 100);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Cinematic bloom for stellar glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(bloomPass);
    }

    async initializeModules() {
        // Scene Manager - handles lighting and environment
        this.modules.sceneManager = new SceneManager(this.scene);
        await this.modules.sceneManager.init();
        
        // Star System - loads HYG catalog and creates stars
        this.modules.starSystem = new StarSystem(this.scene);
        await this.modules.starSystem.loadCatalog();
        
        // Volumetric Nebula - creates gas and dust clouds
        this.modules.nebula = new VolumetricNebula(this.scene);
        await this.modules.nebula.init();
        
        // Camera Controller - smooth camera movements
        this.modules.cameraController = new CameraController(
            this.camera,
            this.scene
        );
        
        // Journey Manager - orchestrates the cinematic journey
        this.modules.journeyManager = new JourneyManager(
            this.modules.starSystem,
            this.modules.cameraController,
            this.modules.nebula
        );
        
        // Create the Sun (our star) near camera
        this.createSun();
    }

    createSun() {
        const sunGeometry = new THREE.SphereGeometry(30, 64, 64);
        const sunMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0xffdd00) },
                color2: { value: new THREE.Color(0xff6600) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                // Simple noise function
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }
                
                void main() {
                    vec2 uv = vPosition.xy * 0.02;
                    float n = noise(uv + time * 0.1);
                    float intensity = 0.8 + 0.2 * n;
                    
                    vec3 color = mix(color1, color2, intensity);
                    
                    // Fresnel effect for glowing edge
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = dot(viewDirection, vNormal);
                    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
                    fresnel = pow(fresnel, 2.0);
                    
                    color += vec3(1.0, 0.8, 0.5) * fresnel * 0.5;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            transparent: false
        });
        
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(-100, 0, 50);
        this.scene.add(sun);
        
        // Add point light for sun illumination
        const sunLight = new THREE.PointLight(0xffdd00, 2, 1000);
        sunLight.position.copy(sun.position);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        
        // Store reference for animation
        this.sun = { mesh: sun, light: sunLight, material: sunMaterial };
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startJourney();
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    startJourney() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.modules.journeyManager.startJourney();
            document.getElementById('start-btn').textContent = 'Restart Journey';
        } else {
            this.modules.journeyManager.restartJourney();
        }
    }

    togglePause() {
        this.isPlaying = !this.isPlaying;
        document.getElementById('pause-btn').textContent = 
            this.isPlaying ? 'Pause' : 'Resume';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        
        // Update sun shader
        if (this.sun) {
            this.sun.material.uniforms.time.value = elapsed;
        }
        
        // Update modules
        if (this.modules.nebula) {
            this.modules.nebula.update(delta, elapsed);
        }
        
        if (this.modules.journeyManager && this.isPlaying) {
            this.modules.journeyManager.update(delta, elapsed);
            this.updateUI();
        }
        
        // Render with post-processing
        this.composer.render();
    }

    updateUI() {
        const journey = this.modules.journeyManager;
        if (journey && journey.currentStar) {
            document.getElementById('star-info').textContent = 
                `Approaching: ${journey.currentStar.name || 'Unknown Star'}\n` +
                `Spectral Class: ${journey.currentStar.spectralClass || 'N/A'}\n` +
                `Distance from Earth: ${journey.distanceTraveled.toFixed(1)} light years`;
            
            document.getElementById('distance').textContent = 
                `Distance: ${journey.distanceTraveled.toFixed(1)} ly`;
            
            document.getElementById('speed').textContent = 
                `Speed: ${(journey.currentSpeed * 100).toFixed(1)}c`;
        }
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    new GalacticJourney();
});
