import * as THREE from 'three';

export class VolumetricNebula {
    constructor(scene) {
        this.scene = scene;
        this.nebulaVolumes = [];
        this.dustParticles = null;
        this.gasClouds = [];
    }

    async init() {
        this.createVolumetricGasClouds();
        this.createDustParticles();
        this.createNebulaRays();
    }

    createVolumetricGasClouds() {
        // Create multiple volumetric gas cloud layers using shader-based approach
        const cloudCount = 8;
        
        for (let i = 0; i < cloudCount; i++) {
            const geometry = new THREE.PlaneGeometry(2000, 2000, 128, 128);
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color1: { value: new THREE.Color(this.getRandomNebulaColor()) },
                    color2: { value: new THREE.Color(this.getRandomNebulaColor()) },
                    density: { value: Math.random() * 0.5 + 0.3 },
                    speed: { value: Math.random() * 0.2 + 0.1 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color1;
                    uniform vec3 color2;
                    uniform float density;
                    uniform float speed;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    // 3D Noise function for volumetric clouds
                    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                    
                    float snoise(vec3 v) {
                        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                        
                        vec3 i  = floor(v + dot(v, C.yyy));
                        vec3 x0 = v - i + dot(i, C.xxx);
                        
                        vec3 g = step(x0.yzx, x0.xyz);
                        vec3 l = 1.0 - g;
                        vec3 i1 = min(g.xyz, l.zxy);
                        vec3 i2 = max(g.xyz, l.zxy);
                        
                        vec3 x1 = x0 - i1 + C.xxx;
                        vec3 x2 = x0 - i2 + C.yyy;
                        vec3 x3 = x0 - D.yyy;
                        
                        i = mod289(i);
                        vec4 p = permute(permute(permute(
                                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                                
                        float n_ = 0.142857142857;
                        vec3 ns = n_ * D.wyz - D.xzx;
                        
                        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                        
                        vec4 x_ = floor(j * ns.z);
                        vec4 y_ = floor(j - 7.0 * x_);
                        
                        vec4 x = x_ *ns.x + ns.yyyy;
                        vec4 y = y_ *ns.x + ns.yyyy;
                        vec4 h = 1.0 - abs(x) - abs(y);
                        
                        vec4 b0 = vec4(x.xy, y.xy);
                        vec4 b1 = vec4(x.zw, y.zw);
                        
                        vec4 s0 = floor(b0)*2.0 + 1.0;
                        vec4 s1 = floor(b1)*2.0 + 1.0;
                        vec4 sh = -step(h, vec4(0.0));
                        
                        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                        
                        vec3 p0 = vec3(a0.xy, h.x);
                        vec3 p1 = vec3(a0.zw, h.y);
                        vec3 p2 = vec3(a1.xy, h.z);
                        vec3 p3 = vec3(a1.zw, h.w);
                        
                        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                        p0 *= norm.x;
                        p1 *= norm.y;
                        p2 *= norm.z;
                        p3 *= norm.w;
                        
                        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                        m = m * m;
                        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                    }
                    
                    // Fractal Brownian Motion
                    float fbm(vec3 x, int octaves) {
                        float v = 0.0;
                        float a = 0.5;
                        vec3 shift = vec3(100.0);
                        for (int i = 0; i < octaves; ++i) {
                            v += a * snoise(x);
                            x = x * 2.0 + shift;
                            a *= 0.5;
                        }
                        return v;
                    }
                    
                    void main() {
                        vec3 pos = vPosition * 0.002;
                        pos.xz += time * speed * 0.5;
                        
                        // Multi-layer noise for realistic clouds
                        float noise1 = fbm(pos * 0.5, 5);
                        float noise2 = fbm(pos * 1.5 + vec3(100.0), 4);
                        float noise3 = fbm(pos * 3.0 + vec3(200.0), 3);
                        
                        float combinedNoise = (noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1) * density;
                        combinedNoise = smoothstep(-0.3, 0.8, combinedNoise);
                        
                        // Color gradient based on noise
                        vec3 color = mix(color1, color2, combinedNoise + 0.2);
                        
                        // Add emission for glowing effect
                        float emission = pow(combinedNoise, 2.0) * 0.5;
                        color += emission * vec3(0.5, 0.3, 0.8);
                        
                        // Alpha based on density
                        float alpha = combinedNoise * 0.15;
                        
                        // Distance fade
                        float distFade = 1.0 - length(vUv - 0.5);
                        alpha *= distFade;
                        
                        gl_FragColor = vec4(color * emission * 2.0, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            const cloud = new THREE.Mesh(geometry, material);
            
            // Random position and rotation
            cloud.position.set(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 1000 - 500
            );
            cloud.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            cloud.rotation.z = Math.random() * Math.PI * 2;
            
            this.scene.add(cloud);
            this.gasClouds.push(cloud);
        }
    }

    createDustParticles() {
        // Create floating dust particles in the nebula
        const particleCount = 50000;
        const geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const opacities = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Position in a large volume
            positions[i * 3] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000 - 500;
            
            // Dust colors (warm oranges, cool blues, purples)
            const colorChoice = Math.random();
            let r, g, b;
            
            if (colorChoice < 0.3) {
                // Warm dust
                r = 0.8 + Math.random() * 0.2;
                g = 0.4 + Math.random() * 0.3;
                b = 0.2 + Math.random() * 0.2;
            } else if (colorChoice < 0.6) {
                // Cool dust
                r = 0.3 + Math.random() * 0.2;
                g = 0.4 + Math.random() * 0.2;
                b = 0.7 + Math.random() * 0.3;
            } else {
                // Purple/pink dust
                r = 0.6 + Math.random() * 0.3;
                g = 0.2 + Math.random() * 0.2;
                b = 0.8 + Math.random() * 0.2;
            }
            
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
            
            sizes[i] = Math.random() * 3.0 + 1.0;
            opacities[i] = Math.random() * 0.5 + 0.2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                attribute float opacity;
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    vColor = color;
                    vOpacity = opacity;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    if (dist > 0.5) discard;
                    
                    float alpha = (1.0 - dist * 2.0) * vOpacity * 0.6;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.dustParticles = new THREE.Points(geometry, material);
        this.scene.add(this.dustParticles);
    }

    createNebulaRays() {
        // Create god rays/light shafts effect
        const rayCount = 20;
        
        for (let i = 0; i < rayCount; i++) {
            const geometry = new THREE.CylinderGeometry(0, 100, 800, 8, 1, true);
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    rayColor: { value: new THREE.Color().setHSL(Math.random(), 0.5, 0.6) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 rayColor;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        float alpha = 1.0 - vUv.y;
                        alpha *= sin(vUv.x * 3.14159);
                        alpha *= 0.03;
                        
                        float flicker = sin(time * 2.0 + vPosition.y * 0.01) * 0.2 + 0.8;
                        
                        gl_FragColor = vec4(rayColor * flicker, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            const ray = new THREE.Mesh(geometry, material);
            ray.position.set(
                (Math.random() - 0.5) * 500,
                200,
                (Math.random() - 0.5) * 500 - 500
            );
            ray.rotation.x = Math.random() * 0.3;
            ray.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(ray);
            this.nebulaVolumes.push(ray);
        }
    }

    getRandomNebulaColor() {
        const colors = [
            0xff6b6b, // Red
            0xfeca57, // Yellow
            0x48dbfb, // Blue
            0xff9ff3, // Pink
            0x5f27cd, // Purple
            0x00d2d3, // Cyan
            0xff9f43  // Orange
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(delta, elapsed) {
        // Update gas clouds
        this.gasClouds.forEach((cloud, index) => {
            cloud.material.uniforms.time.value = elapsed;
            
            // Slow drift
            cloud.position.x += Math.sin(elapsed * 0.05 + index) * 0.2;
            cloud.position.z += Math.cos(elapsed * 0.03 + index) * 0.2;
        });
        
        // Update dust particles
        if (this.dustParticles) {
            this.dustParticles.material.uniforms.time.value = elapsed;
            
            // Gentle rotation
            this.dustParticles.rotation.y = elapsed * 0.01;
        }
        
        // Update nebula rays
        this.nebulaVolumes.forEach((ray, index) => {
            ray.material.uniforms.time.value = elapsed;
            
            // Subtle movement
            ray.rotation.y += Math.sin(elapsed * 0.1 + index) * 0.001;
        });
    }

    setCameraPosition(position) {
        // Adjust nebula density based on camera position for immersive effect
        this.gasClouds.forEach(cloud => {
            const distance = cloud.position.distanceTo(position);
            const visibility = Math.max(0, 1 - distance / 1000);
            cloud.material.uniforms.density.value = 0.3 + visibility * 0.5;
        });
    }
}
