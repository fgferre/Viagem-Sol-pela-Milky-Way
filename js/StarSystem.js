import * as THREE from 'three';

export class StarSystem {
    constructor(scene) {
        this.scene = scene;
        this.stars = [];
        this.starData = [];
        this.starField = null;
        this.brightStars = [];
    }

    async loadCatalog() {
        // Generate HYG-like star catalog procedurally
        // (In production, you would load the actual HYG database)
        await this.generateStarCatalog();
        this.createStarField();
        this.createBrightStars();
    }

    async generateStarCatalog() {
        // Simulate HYG catalog with realistic star distribution
        const starCount = 15000;
        
        // Create a more realistic Milky Way disk structure
        for (let i = 0; i < starCount; i++) {
            // Generate coordinates following Milky Way structure
            const armAngle = Math.random() * Math.PI * 2;
            const spiralArmOffset = (Math.floor(Math.random() * 4) * Math.PI / 2);
            const adjustedAngle = armAngle + spiralArmOffset;
            
            // Distance from galactic center with spiral arm concentration
            let distanceFromCenter = Math.pow(Math.random(), 0.7) * 6000;
            
            // Add some stars in the bulge
            if (Math.random() < 0.15) {
                distanceFromCenter = Math.random() * 1000;
            }
            
            const ra = adjustedAngle;
            // Thin disk with some thickness
            const dec = (Math.random() - 0.5) * 0.3 * Math.exp(-distanceFromCenter / 3000);
            
            // Convert spherical to Cartesian
            const x = distanceFromCenter * Math.cos(dec) * Math.cos(ra);
            const y = distanceFromCenter * Math.sin(dec);
            const z = distanceFromCenter * Math.cos(dec) * Math.sin(ra);
            
            // Stellar properties
            const spectralClass = this.getRandomSpectralClass();
            const magnitude = this.calculateMagnitude(distanceFromCenter, spectralClass);
            const color = this.getSpectralColor(spectralClass);
            const size = this.getStarSize(spectralClass);
            
            this.starData.push({
                id: i,
                name: this.generateStarName(i),
                x: x,
                y: y,
                z: z,
                distance: distanceFromCenter,
                ra: ra,
                dec: dec,
                spectralClass: spectralClass,
                magnitude: magnitude,
                color: color,
                size: size,
                temperature: this.getTemperature(spectralClass)
            });
        }
        
        // Sort by brightness for rendering priority
        this.starData.sort((a, b) => a.magnitude - b.magnitude);
    }

    createStarField() {
        // Create instanced mesh for performance with thousands of stars
        const geometry = new THREE.SphereGeometry(1, 8, 8);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                uniform float time;
                attribute vec3 customColor;
                attribute float customSize;
                varying vec3 vColor;
                
                void main() {
                    vColor = customColor;
                    vec4 mvPosition = modelViewMatrix * instanceMatrix;
                    
                    // Size attenuation based on distance
                    float distanceFactor = 1.0 / (-mvPosition.z);
                    gl_PointSize = customSize * distanceFactor * 100.0;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular sprite with glow
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    if (dist > 0.5) discard;
                    
                    // Radial gradient for star glow
                    float intensity = 1.0 - (dist * 2.0);
                    intensity = pow(intensity, 1.5);
                    
                    // Add sparkle
                    float sparkle = sin(gl_PointCoord.x * 20.0) * sin(gl_PointCoord.y * 20.0);
                    intensity += sparkle * 0.3;
                    
                    gl_FragColor = vec4(vColor * intensity, intensity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.starField = new THREE.InstancedMesh(geometry, material, this.starData.length);
        
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        
        this.starData.forEach((star, i) => {
            // Position
            matrix.setPosition(star.x, star.y, star.z);
            this.starField.setMatrixAt(i, matrix);
            
            // Color
            color.setHex(star.color);
            this.starField.setColorAt(i, color);
            
            // Size (stored in a custom attribute we'll add)
        });
        
        // Add custom attributes for size
        const sizes = new Float32Array(this.starData.length);
        const colors = new Float32Array(this.starData.length * 3);
        
        this.starData.forEach((star, i) => {
            sizes[i] = star.size;
            colors[i * 3] = new THREE.Color(star.color).r;
            colors[i * 3 + 1] = new THREE.Color(star.color).g;
            colors[i * 3 + 2] = new THREE.Color(star.color).b;
        });
        
        this.starField.geometry.setAttribute('customSize', new THREE.InstancedBufferAttribute(sizes, 1));
        this.starField.geometry.setAttribute('customColor', new THREE.InstancedBufferAttribute(colors, 3));
        
        this.scene.add(this.starField);
    }

    createBrightStars() {
        // Create individual meshes for the brightest/most important stars
        const brightStarData = this.starData.filter(star => star.magnitude < 2.0);
        
        brightStarData.forEach(star => {
            const geometry = new THREE.SphereGeometry(star.size * 2, 32, 32);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    baseColor: { value: new THREE.Color(star.color) },
                    glowIntensity: { value: 1.0 }
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
                    uniform vec3 baseColor;
                    uniform float glowIntensity;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        vec3 viewDirection = normalize(cameraPosition - vPosition);
                        float fresnel = dot(viewDirection, vNormal);
                        fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
                        fresnel = pow(fresnel, 2.0);
                        
                        vec3 color = baseColor * (1.0 + fresnel * glowIntensity);
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                transparent: false
            });
            
            const starMesh = new THREE.Mesh(geometry, material);
            starMesh.position.set(star.x, star.y, star.z);
            this.scene.add(starMesh);
            
            // Add point light for bright stars
            const light = new THREE.PointLight(star.color, 0.5, 500);
            light.position.copy(starMesh.position);
            this.scene.add(light);
            
            this.brightStars.push({
                mesh: starMesh,
                light: light,
                data: star
            });
        });
    }

    getRandomSpectralClass() {
        const classes = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
        const weights = [0.00003, 0.0013, 0.006, 0.03, 0.076, 0.121, 0.76]; // Realistic distribution
        
        const rand = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < classes.length; i++) {
            cumulative += weights[i];
            if (rand <= cumulative) {
                return classes[i];
            }
        }
        
        return 'M';
    }

    getSpectralColor(spectralClass) {
        const colors = {
            'O': 0x9bb0ff, // Blue
            'B': 0xaabfff, // Blue-white
            'A': 0xfcf7ff, // White
            'F': 0xfef7e8, // Yellow-white
            'G': 0xfff4e8, // Yellow (like our Sun)
            'K': 0xffd2a1, // Orange
            'M': 0xffc6a1  // Red
        };
        
        return colors[spectralClass] || 0xffffff;
    }

    getStarSize(spectralClass) {
        const sizes = {
            'O': 15.0,
            'B': 8.0,
            'A': 4.0,
            'F': 2.5,
            'G': 1.5,
            'K': 1.0,
            'M': 0.5
        };
        
        return sizes[spectralClass] || 1.0;
    }

    getTemperature(spectralClass) {
        const temps = {
            'O': 30000,
            'B': 20000,
            'A': 9000,
            'F': 7000,
            'G': 5500,
            'K': 4000,
            'M': 3000
        };
        
        return temps[spectralClass] || 5000;
    }

    calculateMagnitude(distance, spectralClass) {
        // Simplified apparent magnitude calculation
        const absoluteMagnitudes = {
            'O': -5.0,
            'B': -2.0,
            'A': 1.0,
            'F': 3.0,
            'G': 5.0,
            'K': 7.0,
            'M': 12.0
        };
        
        const M = absoluteMagnitudes[spectralClass] || 5.0;
        const m = M + 5 * Math.log10(distance / 10);
        
        return m;
    }

    generateStarName(index) {
        const prefixes = ['HD', 'HIP', 'Gliese', 'Kepler', 'TRAPPIST', 'Proxima'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = Math.floor(Math.random() * 900000) + 100000;
        
        // Some famous stars
        const famousStars = [
            'Sirius', 'Canopus', 'Arcturus', 'Vega', 'Capella', 'Rigel', 
            'Procyon', 'Betelgeuse', 'Achernar', 'Hadar', 'Altair', 'Aldebaran'
        ];
        
        if (index < famousStars.length && Math.random() > 0.7) {
            return famousStars[index];
        }
        
        return `${prefix} ${number}`;
    }

    randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    update(delta, elapsed) {
        if (this.starField) {
            this.starField.material.uniforms.time.value = elapsed;
        }
        
        // Twinkle effect for bright stars
        this.brightStars.forEach((star, index) => {
            const twinkle = Math.sin(elapsed * 2 + index) * 0.1 + 0.9;
            star.mesh.material.uniforms.glowIntensity.value = twinkle;
        });
    }

    getStarAtPosition(x, y, z, radius = 50) {
        // Find stars within a certain radius
        return this.starData.filter(star => {
            const dx = star.x - x;
            const dy = star.y - y;
            const dz = star.z - z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return distance < radius;
        });
    }

    getNextDestination(currentPosition, excludedStars = []) {
        // Find a interesting star to travel to
        const candidates = this.starData.filter(star => {
            const dx = star.x - currentPosition.x;
            const dy = star.y - currentPosition.y;
            const dz = star.z - currentPosition.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            return distance > 100 && distance < 5000 && !excludedStars.includes(star);
        });
        
        if (candidates.length === 0) return null;
        
        // Prefer brighter, more interesting stars
        candidates.sort((a, b) => a.magnitude - b.magnitude);
        
        // Pick from top 10% brightest
        const topCandidates = candidates.slice(0, Math.max(1, Math.floor(candidates.length * 0.1)));
        return topCandidates[Math.floor(Math.random() * topCandidates.length)];
    }
}
