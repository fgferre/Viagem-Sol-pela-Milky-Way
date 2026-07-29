import * as THREE from 'three';

export class SceneManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
    }

    async init() {
        this.setupLighting();
        this.setupEnvironment();
    }

    setupLighting() {
        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);

        // Milky Way glow - subtle blue-purple ambient
        const milkyWayLight = new THREE.HemisphereLight(0x4444ff, 0x000000, 0.3);
        milkyWayLight.position.set(0, 1000, 0);
        this.scene.add(milkyWayLight);
        this.lights.push(milkyWayLight);

        // Cinematic rim lights for depth
        const rimLight1 = new THREE.DirectionalLight(0x6666ff, 0.2);
        rimLight1.position.set(-500, 200, -500);
        this.scene.add(rimLight1);
        this.lights.push(rimLight1);

        const rimLight2 = new THREE.DirectionalLight(0xff6666, 0.1);
        rimLight2.position.set(500, -200, 500);
        this.scene.add(rimLight2);
        this.lights.push(rimLight2);
    }

    setupEnvironment() {
        // Deep space background with subtle gradient
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const context = canvas.getContext('2d');

        // Create gradient background
        const gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width
        );
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(0.5, '#050510');
        gradient.addColorStop(1, '#000005');

        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle noise for deep space texture
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const brightness = Math.random() * 0.3;
            context.fillStyle = `rgba(${brightness * 255}, ${brightness * 255}, ${brightness * 255 + 20}, 1)`;
            context.fillRect(x, y, 1, 1);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        this.scene.background = texture;
    }

    update(delta, elapsed) {
        // Update any dynamic lighting effects
        this.lights.forEach((light, index) => {
            if (light instanceof THREE.DirectionalLight) {
                // Subtle movement for cinematic effect
                light.position.x += Math.sin(elapsed * 0.1 + index) * 0.5;
                light.position.y += Math.cos(elapsed * 0.15 + index) * 0.3;
            }
        });
    }
}
